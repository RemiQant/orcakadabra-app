import os
from dotenv import load_dotenv

# Prioritas Environment
APP_ENV = os.getenv("APP_ENV", "development")
load_dotenv(dotenv_path=f".env.{APP_ENV}", override=False)

# ── CORS ────────────────────────────────────────────────────────
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip() and o.strip()!= "*"]

# ── Supabase ────────────────────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# ── Alibaba Cloud Model Studio (Qwen) ───────────────────────────
DASHSCOPE_API_KEY = os.getenv("DASHSCOPE_API_KEY")
QWEN_VL_MODEL = os.getenv("QWEN_VL_MODEL", "qwen-vl-plus")
ALIBABA_CLOUD_ACCESS_KEY_ID = os.getenv("ALIBABA_CLOUD_ACCESS_KEY_ID")
ALIBABA_CLOUD_ACCESS_KEY_SECRET = os.getenv("ALIBABA_CLOUD_ACCESS_KEY_SECRET")

# ── Alibaba Cloud OSS ───────────────────────────────────────────
OSS_ENDPOINT = os.getenv("OSS_ENDPOINT")
OSS_BUCKET_NAME = os.getenv("OSS_BUCKET_NAME")