import asyncio
import logging
from io import BytesIO

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from PIL import Image

from backend.services.oss_services import upload_to_oss
from backend.services.r2_services import upload_to_r2
from backend.services.ai_services import analyze_documents_from_url
from backend.services.db_services import save_merchant_kyc

logger = logging.getLogger(__name__)

router = APIRouter()

# Fungsi kompresi lokal (Hanya dieksekusi jika OSS mati / Fallback ke R2)
def compress_locally(file_bytes: bytes) -> bytes:
    img = Image.open(BytesIO(file_bytes))
    if img.mode != "RGB":
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
        logger.warning("OSS upload failed for %s/%s: %s. Falling back to R2.", folder, filename, e)

        # TAHAP 2: OSS Gagal. Kompres manual, lalu lempar ke Cloudflare R2.
        # Force .jpg extension because compress_locally always produces JPEG bytes.
        compressed_bytes = await asyncio.to_thread(compress_locally, file_bytes)
        fallback_filename = filename.rsplit(".", 1)[0] + ".jpg"
        url = await asyncio.to_thread(upload_to_r2, compressed_bytes, fallback_filename, folder)
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

        # 4. Simpan data ke Supabase (buang query params agar URL bersih di DB)
        db_record = {
            "nama_lengkap": nama,
            "tgl_lahir": tgl_lahir,
            "ktp_url": ktp_url.split('?', 1)[0],
            "npwp_url": npwp_url.split('?', 1)[0],
            "nib_url": nib_url.split('?', 1)[0],
            "is_fake": ai_result.get("is_fake", True),
            "risk_score": ai_result.get("risk_score", 100),
            "ai_reasoning": ai_result.get("ai_reasoning", ""),
            "fraud_reason": ai_result.get("fraud_reason", ""),
            "raw_ai_json": ai_result
        }
        saved_data = await asyncio.to_thread(save_merchant_kyc, db_record)

        return {"status": "success", "data": saved_data, "ai_analysis": ai_result}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unhandled error in /verify-merchant: %s", e)
        raise HTTPException(status_code=500, detail="Internal server error. Please try again later.")