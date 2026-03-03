from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import asyncio
import time
from io import BytesIO
from PIL import Image

from services.oss_services import upload_to_oss
from services.r2_services import upload_to_r2
from services.ai_services import analyze_documents_from_url
from services.db_services import save_merchant_kyc

from alibabacloud_cloudauth_intl20220809.client import Client as CloudauthClient
from alibabacloud_tea_openapi import models as open_api_models
from alibabacloud_cloudauth_intl20220809 import models as cloudauth_models
from core.config import ALIBABA_CLOUD_ACCESS_KEY_ID, ALIBABA_CLOUD_ACCESS_KEY_SECRET

router = APIRouter()

def compress_locally(file_bytes: bytes) -> bytes:
    img = Image.open(BytesIO(file_bytes))
    if img.mode!= "RGB":
        img = img.convert("RGB")
    img.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
    buf = BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()

async def upload_with_fallback(file_bytes: bytes, filename: str, folder: str) -> str:
    try:
        url = await asyncio.to_thread(upload_to_oss, file_bytes, filename, folder)
        return f"{url}?x-oss-process=image/resize,w_1024/format,jpg/quality,q_85"
    except Exception as e:
        print(f"⚠️ OSS Gagal ({e}). Fallback ke R2 & Kompresi Lokal...")
        compressed_bytes = await asyncio.to_thread(compress_locally, file_bytes)
        url = await asyncio.to_thread(upload_to_r2, compressed_bytes, filename, folder)
        return url

@router.post("/verify-merchant")
async def verify_merchant(
    nama: str = Form(...),
    tgl_lahir: str = Form(...),
    ktp: UploadFile = File(...)
):
    try:
        # 1. Baca byte KTP saja
        ktp_bytes = await ktp.read()
        
        # 2. Upload KTP ke storage (dengan mekanisme fallback)
        ktp_url = await upload_with_fallback(ktp_bytes, ktp.filename, "ktp")
        
        # 3. Lempar ke AI
        ai_result = await asyncio.to_thread(
            analyze_documents_from_url, nama, tgl_lahir, ktp_url
        )
        
        # 4. Ambil NIK dari hasil ekstraksi AI (Gunakan string kosong jika gagal/tidak ada)
        extracted_nik = ai_result.get("data_ekstraksi", {}).get("nik", "")
        
        # 5. Tentukan Status Merchant Otomatis
        is_fraud = ai_result.get("is_fake", True)
        merchant_status = "REJECTED" if is_fraud else "PENDING_REVIEW"

        # 6. Simpan data ke Supabase
        db_record = {
            "nama_lengkap": nama,
            "tgl_lahir": tgl_lahir,
            "nik": extracted_nik, # Menyimpan NIK secara spesifik
            "ktp_url": ktp_url.split('?'), # Membuang parameter OSS resize agar DB nyimpan original URL
            "is_fake": is_fraud,
            "risk_score": ai_result.get("risk_score", 100),
            "ai_reasoning": ai_result.get("ai_reasoning", ""),
            "fraud_reason": ai_result.get("fraud_reason", ""),
            "raw_ai_json": ai_result, # SELURUH 16 DATA KTP (Alamat, Agama, dll) TERSIMPAN DI SINI
            "status": merchant_status,
            "admin_notes": ""
        }
        saved_data = await asyncio.to_thread(save_merchant_kyc, db_record)
        
        return {"status": "success", "data": saved_data, "ai_analysis": ai_result}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint Liveness (Anti-Deepfake)
@router.post("/init-liveness")
async def init_liveness():
    config = open_api_models.Config(
        access_key_id=ALIBABA_CLOUD_ACCESS_KEY_ID,
        access_key_secret=ALIBABA_CLOUD_ACCESS_KEY_SECRET,
        endpoint="cloudauth-intl.ap-southeast-5.aliyuncs.com" 
    )
    client = CloudauthClient(config)
    
    request = cloudauth_models.InitializeRequest(
        product_code="FACE_LIVENESS_PRO",
        merchant_biz_id=f"PAYLABS_{int(time.time())}",
        merchant_user_id=f"USER_{int(time.time())}", 
        meta_info='{"os": "web"}'
    )
    try:
        response = client.initialize(request)
        return {"transaction_id": response.body.result.transaction_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))