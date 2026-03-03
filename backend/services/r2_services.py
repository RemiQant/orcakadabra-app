import uuid
from functools import lru_cache

import boto3
from botocore.client import Config

from core.config import (
    R2_ACCESS_KEY_ID,
    R2_BUCKET_NAME,
    R2_ENDPOINT_URL,
    R2_SECRET_ACCESS_KEY,
)


@lru_cache(maxsize=1)
def _get_r2_client():
    """Lazily initialise the R2 boto3 client on first use, not at import time."""
    missing = [
        name
        for name, value in [
            ("R2_ENDPOINT_URL", R2_ENDPOINT_URL),
            ("R2_ACCESS_KEY_ID", R2_ACCESS_KEY_ID),
            ("R2_SECRET_ACCESS_KEY", R2_SECRET_ACCESS_KEY),
            ("R2_BUCKET_NAME", R2_BUCKET_NAME),
        ]
        if not value
    ]
    if missing:
        raise RuntimeError(
            f"Missing required R2 configuration value(s): {', '.join(missing)}. "
            "Ensure the corresponding environment variables are set."
        )
    return boto3.client(
        "s3",
        endpoint_url=R2_ENDPOINT_URL,
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )


def upload_to_r2(file_bytes: bytes, original_filename: str, folder: str) -> str:
    client = _get_r2_client()
    ext = original_filename.split(".")[-1] if "." in original_filename else "jpg"
    filename = f"{folder}/{uuid.uuid4().hex}.{ext}"

    content_type = "image/jpeg" if ext.lower() in ("jpg", "jpeg") else f"image/{ext.lower()}"
    client.put_object(
        Bucket=R2_BUCKET_NAME,
        Key=filename,
        Body=file_bytes,
        ContentType=content_type,
    )

    # Return a short-lived presigned URL so KYC documents are not world-readable
    presigned_url = client.generate_presigned_url(
        ClientMethod="get_object",
        Params={"Bucket": R2_BUCKET_NAME, "Key": filename},
        ExpiresIn=900,  # valid for 15 minutes
    )
    return presigned_url