from supabase import create_client, Client
from core.config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

def get_supabase_client() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def save_merchant_kyc(data: dict):
    supabase = get_supabase_client()
    response = supabase.table("merchants_kyc").insert(data).execute()
    return response.data