import uuid
from urllib.parse import urlparse

import oss2

from backend.core.config import (
    ALIBABA_CLOUD_ACCESS_KEY_ID,
    ALIBABA_CLOUD_ACCESS_KEY_SECRET,
    OSS_BUCKET_NAME,
    OSS_ENDPOINT,
)

def upload_to_oss(file_bytes: bytes, original_filename: str, folder: str) -> str:
    auth = oss2.Auth(ALIBABA_CLOUD_ACCESS_KEY_ID, ALIBABA_CLOUD_ACCESS_KEY_SECRET)
    bucket = oss2.Bucket(auth, OSS_ENDPOINT, OSS_BUCKET_NAME)

    ext = original_filename.split('.')[-1] if '.' in original_filename else 'jpg'
    filename = f"{folder}/{uuid.uuid4().hex}.{ext}"

    # Upload ke OSS
    bucket.put_object(filename, file_bytes)

    # Generate URL Publik menggunakan urllib.parse agar tidak rusak jika endpoint sudah/belum ada scheme
    parsed = urlparse(OSS_ENDPOINT)
    scheme = parsed.scheme or "https"
    host = parsed.netloc or parsed.path  # netloc is set when scheme is present
    return f"{scheme}://{OSS_BUCKET_NAME}.{host}/{filename}"