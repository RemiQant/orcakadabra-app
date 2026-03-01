import boto3
import uuid
from core.config import R2_ENDPOINT_URL, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL

def upload_to_r2(file_bytes: bytes, original_filename: str, folder: str) -> str:
    s3 = boto3.client(
        's3',
        endpoint_url=R2_ENDPOINT_URL,
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        region_name='auto'
    )
    
    ext = original_filename.split('.')[-1] if '.' in original_filename else 'jpg'
    filename = f"{folder}/{uuid.uuid4().hex}.{ext}"
    
    s3.put_object(Bucket=R2_BUCKET_NAME, Key=filename, Body=file_bytes)
    return f"{R2_PUBLIC_URL}/{filename}"