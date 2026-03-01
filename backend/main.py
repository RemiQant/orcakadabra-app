import os
from functools import lru_cache
from typing import TYPE_CHECKING, Annotated

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

# TYPE_CHECKING guard means these are only imported by type checkers (mypy/pyright),
# NOT at runtime — so a missing package never crashes the server on startup.
if TYPE_CHECKING:
    from supabase import Client

# ── Configuration ─────────────────────────────────────────────────────────────
# All env loading is centralised in core/config.py (dotenv is loaded there on
# import, before any env var is read here).
from core.config import APP_ENV, ALLOWED_ORIGINS  # noqa: E402

# ── Supabase Client (lazy) ────────────────────────────────────────────────────
@lru_cache(maxsize=1)
def get_supabase() -> "Client":
    """
    FastAPI dependency. Initialised once on first request.
    Install the "supabase" package and set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to use.
    """
    try:
        from supabase import create_client  # noqa: PLC0415
    except ImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="supabase is not installed. Run: pip install supabase",
        ) from exc

    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars are not set.",
        )
    return create_client(url, key)


# ── Cloudflare R2 Client (lazy) ───────────────────────────────────────────────
@lru_cache(maxsize=1)
def get_r2():
    """
    FastAPI dependency. Initialised once on first request.
    Install boto3 and set R2_* env vars to use.
    """
    try:
        import boto3  # noqa: PLC0415
        from botocore.client import Config  # noqa: PLC0415
    except ImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="boto3 is not installed. Run: pip install boto3",
        ) from exc

    endpoint = os.getenv("R2_ENDPOINT_URL")
    access_key = os.getenv("R2_ACCESS_KEY_ID")
    secret_key = os.getenv("R2_SECRET_ACCESS_KEY")
    bucket = os.getenv("R2_BUCKET_NAME")
    if not all([endpoint, access_key, secret_key, bucket]):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="R2_ENDPOINT_URL, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME env vars are not set.",
        )
    client = boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )
    # Attach bucket name so callers can do: r2, bucket = Depends(get_r2)
    client._bucket_name = bucket  # type: ignore[attr-defined]
    return client


# R2_BUCKET_NAME is now read lazily inside get_r2() alongside the other R2 vars.
# Access it via: r2_client._bucket_name  or pass R2Dep to your route.

# Type aliases for use in route signatures, e.g.:
#   async def my_route(db: SupabaseDep, storage: R2Dep): ...
SupabaseDep = Annotated["Client", Depends(get_supabase)]
R2Dep = Annotated[object, Depends(get_r2)]

# ── App ───────────────────────────────────────────────────────────────────────
# Disable interactive API docs in production — they expose your schema publicly.
_docs_url = None if APP_ENV == "production" else "/docs"
_redoc_url = None if APP_ENV == "production" else "/redoc"

app = FastAPI(
    title="Paylabs AI e-KYC API",
    version="0.1.0",
    docs_url=_docs_url,
    redoc_url=_redoc_url,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
from api.routers import kyc as kyc_router  # noqa: E402
app.include_router(kyc_router.router, prefix="/kyc", tags=["KYC"])

# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health", tags=["System"])
async def health_check():
    """Health probe endpoint required by Leapcell and Alibaba Cloud SAE."""
    return {"status": "healthy", "version": app.version}


@app.get("/", tags=["System"])
async def root():
    return {"message": "Paylabs AI e-KYC Backend is running."}