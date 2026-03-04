from typing import Optional

from supabase import create_client, Client
from core.config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

# ── Constants ─────────────────────────────────────────────────────────────────
VALID_STATUSES = {"pending", "approved", "reupload_requested", "rejected"}

# Fields returned in the list view (raw_ai_json excluded — too heavy)
_LIST_FIELDS = (
    "id, created_at, nama_lengkap, nik, tgl_lahir, ktp_url, "
    "is_fake, risk_score, fraud_reason, status, admin_notes"
)


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


def get_all_submissions(
    page: int = 1,
    limit: int = 20,
    status_filter: Optional[str] = None,
) -> list:
    """
    Returns a paginated list of KYC submissions (key fields only, no raw_ai_json).
    Ordered by created_at DESC (newest first).
    """
    supabase = get_supabase_client()
    start = (page - 1) * limit
    end = start + limit - 1

    query = (
        supabase.table("merchants_kyc")
        .select(_LIST_FIELDS)
        .order("created_at", desc=True)
    )
    if status_filter:
        query = query.eq("status", status_filter)

    response = query.range(start, end).execute()
    error = getattr(response, "error", None)
    if error:
        message = getattr(error, "message", None) or str(error)
        raise RuntimeError(f"Failed to fetch submissions: {message}")
    return response.data


def get_submission_by_id(submission_id: str) -> dict:
    """
    Returns a single KYC submission with ALL fields including raw_ai_json.
    Raises RuntimeError if not found.
    """
    supabase = get_supabase_client()
    response = (
        supabase.table("merchants_kyc")
        .select("*")
        .eq("id", submission_id)
        .maybe_single()
        .execute()
    )
    error = getattr(response, "error", None)
    if error:
        message = getattr(error, "message", None) or str(error)
        raise RuntimeError(f"Failed to fetch submission: {message}")
    if not response.data:
        raise RuntimeError(f"Submission '{submission_id}' not found.")
    return response.data


def update_submission_status(
    submission_id: str,
    status: str,
    admin_notes: Optional[str] = None,
) -> dict:
    """
    Updates the review status (and optional notes) of a single submission.
    Raises RuntimeError if the record does not exist.
    """
    if status not in VALID_STATUSES:
        raise ValueError(f"Invalid status '{status}'. Must be one of: {', '.join(sorted(VALID_STATUSES))}")

    supabase = get_supabase_client()
    update_payload: dict = {"status": status}
    if admin_notes is not None:
        update_payload["admin_notes"] = admin_notes

    response = (
        supabase.table("merchants_kyc")
        .update(update_payload)
        .eq("id", submission_id)
        .execute()
    )
    error = getattr(response, "error", None)
    if error:
        message = getattr(error, "message", None) or str(error)
        raise RuntimeError(f"Failed to update submission: {message}")
    if not response.data:
        raise RuntimeError(f"Submission '{submission_id}' not found or no rows updated.")
    return response.data[0]