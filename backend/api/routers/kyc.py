from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import asyncio
from io import BytesIO
from PIL import Image

from services.oss_services import upload_to_oss
from services.r2_services import upload_to_r2
from services.ai_services import analyze_documents_from_url
from services.db_services import save_merchant_kyc

router = APIRouter()

# Fungsi kompresi lokal (Hanya dieksekusi jika OSS mati / Fallback ke R2)
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
        # TAHAP 1: Coba upload ke Alibaba OSS (Jalur Utama)
        url = await asyncio.to_thread(upload_to_oss, file_bytes, filename, folder)
        # Tambahkan parameter ajaib Image Processing (Zero-CPU Compression)
        return f"{url}?x-oss-process=image/resize,w_1024/format,jpg/quality,q_85"
    except Exception as e:
        print(f"⚠️ OSS Upload Gagal ({e}). Mengaktifkan Fallback ke R2...")
        
        # TAHAP 2: OSS Gagal. Kompres manual, lalu lempar ke Cloudflare R2
        compressed_bytes = await asyncio.to_thread(compress_locally, file_bytes)
        url = await asyncio.to_thread(upload_to_r2, compressed_bytes, filename, folder)
        return url

@router.post("/verify-merchant")
async def verify_merchant(
    nama: str = Form(...),
    tgl_lahir: str = Form(...),
    ktp: UploadFile = File(...),
    npwp: UploadFile = File(...),
    nib: UploadFile = File(...)
):
    try:
        # 1. Baca bytes (Murni I/O, sangat cepat)
        ktp_bytes = await ktp.read()
        npwp_bytes = await npwp.read()
        nib_bytes = await nib.read()
        
        # 2. Upload Paralel dengan Auto-Fallback
        ktp_url, npwp_url, nib_url = await asyncio.gather(
            upload_with_fallback(ktp_bytes, ktp.filename, "ktp"),
            upload_with_fallback(npwp_bytes, npwp.filename, "npwp"),
            upload_with_fallback(nib_bytes, nib.filename, "nib")
        )
        
        # 3. Lempar URL (baik dari OSS maupun R2) ke AI Qwen
        ai_result = await asyncio.to_thread(
            analyze_documents_from_url, nama, tgl_lahir, ktp_url, npwp_url, nib_url
        )
        
        # 4. Simpan data ke Supabase
        db_record = {
            "nama_lengkap": nama,
            "tgl_lahir": tgl_lahir,
            "ktp_url": ktp_url.split('?'), # Buang parameter kompresi agar di DB tersimpan resolusi aslinya
            "npwp_url": npwp_url.split('?'),
            "nib_url": nib_url.split('?'),
            "is_fake": ai_result.get("is_fake", True),
            "risk_score": ai_result.get("risk_score", 100),
            "ai_reasoning": ai_result.get("ai_reasoning", ""),
            "fraud_reason": ai_result.get("fraud_reason", ""),
            "raw_ai_json": ai_result
        }
        saved_data = await asyncio.to_thread(save_merchant_kyc, db_record)
        
        return {"status": "success", "data": saved_data, "ai_analysis": ai_result}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))