from supabase import create_client, Client
from core.config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

def get_supabase_client() -> Client:
    if not SUPABASE_URL or not SUPABASE_URL.strip():
        raise RuntimeError("SUPABASE_URL is not configured or is empty.")
    if not SUPABASE_SERVICE_ROLE_KEY or not SUPABASE_SERVICE_ROLE_KEY.strip():
        raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY is not configured or is empty.")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def save_merchant_kyc(data: dict):
    supabase = get_supabase_client()
    response = supabase.table("merchants_kyc").insert(data).execute()
    error = getattr(response, "error", None)
    if error:
        message = getattr(error, "message", None) or str(error)
        raise RuntimeError(f"Failed to save merchant KYC: {message}")
    return response.data