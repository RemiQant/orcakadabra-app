import oss2
import uuid
from core.config import ALIBABA_CLOUD_ACCESS_KEY_ID, ALIBABA_CLOUD_ACCESS_KEY_SECRET, OSS_ENDPOINT, OSS_BUCKET_NAME

def upload_to_oss(file_bytes: bytes, original_filename: str, folder: str) -> str:
    auth = oss2.Auth(ALIBABA_CLOUD_ACCESS_KEY_ID, ALIBABA_CLOUD_ACCESS_KEY_SECRET)
    bucket = oss2.Bucket(auth, OSS_ENDPOINT, OSS_BUCKET_NAME)
    
    ext = original_filename.split('.')[-1] if '.' in original_filename else 'jpg'
    filename = f"{folder}/{uuid.uuid4().hex}.{ext}"
    
    # Upload ke OSS
    bucket.put_object(filename, file_bytes)
    
    # Generate URL Publik (Pastikan bucket OSS diset Public Read)
    endpoint_domain = OSS_ENDPOINT.replace("https://", "")
    return f"https://{OSS_BUCKET_NAME}.{endpoint_domain}/{filename}"