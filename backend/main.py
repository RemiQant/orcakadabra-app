import os
from functools import lru_cache
from typing import TYPE_CHECKING, Annotated

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

# TYPE_CHECKING guard means these are only imported by type checkers (mypy/pyright),
# NOT at runtime — so a missing package never crashes the server on startup.
if TYPE_CHECKING:
    from supabase import Client

load_dotenv()

# ── Supabase Client (lazy) ────────────────────────────────────────────────────
@lru_cache(maxsize=1)
def get_supabase() -> "Client":
    """
    FastAPI dependency. Initialised once on first request.
    Install supabase-py and set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to use.
    """
    try:
        from supabase import create_client  # noqa: PLC0415
    except ImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="supabase-py is not installed. Run: pip install supabase",
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
    if not all([endpoint, access_key, secret_key]):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="R2_ENDPOINT_URL, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY env vars are not set.",
        )
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )


R2_BUCKET_NAME: str = os.getenv("R2_BUCKET_NAME", "kyc-documents")

# Type aliases for use in route signatures, e.g.:
#   async def my_route(db: SupabaseDep, storage: R2Dep): ...
SupabaseDep = Annotated["Client", Depends(get_supabase)]
R2Dep = Annotated[object, Depends(get_r2)]

# ── CORS ──────────────────────────────────────────────────────────────────────
# Set ALLOWED_ORIGINS in your .env as a comma-separated list.
# WARNING: "*" is intentionally excluded — it is incompatible with
#          allow_credentials=True and would be rejected by all browsers.
_raw_origins: str = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
)
ALLOWED_ORIGINS: list[str] = [o.strip() for o in _raw_origins.split(",") if o.strip()]

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Paylabs AI e-KYC API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health", tags=["System"])
async def health_check():
    """Health probe endpoint required by Leapcell and Alibaba Cloud SAE."""
    return {"status": "healthy", "version": "0.1.0"}


@app.get("/", tags=["System"])
async def root():
    return {"message": "Paylabs AI e-KYC Backend is running."}