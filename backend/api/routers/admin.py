from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, field_validator

from services.db_services import (
    VALID_STATUSES,
    get_all_submissions,
    get_submission_by_id,
    update_submission_status,
)

router = APIRouter()

# ── Request / Response Models ─────────────────────────────────────────────────

class ReviewRequest(BaseModel):
    status: str
    admin_notes: Optional[str] = None

    @field_validator("status")
    @classmethod
    def status_must_be_valid(cls, v: str) -> str:
        if v not in VALID_STATUSES:
            raise ValueError(
                f"Invalid status '{v}'. Must be one of: {', '.join(sorted(VALID_STATUSES))}"
            )
        if v == "pending":
            raise ValueError("Cannot set status back to 'pending'.")
        return v


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/submissions", summary="List all KYC submissions (paginated)")
async def list_submissions(
    page: int = Query(default=1, ge=1, description="Page number (1-based)"),
    limit: int = Query(default=20, ge=1, le=100, description="Items per page"),
    status: Optional[str] = Query(default=None, description="Filter by status"),
):
    """
    Returns a paginated list of KYC submissions, ordered by newest first.
    Excludes heavy fields (raw_ai_json, ai_reasoning) — use the detail endpoint for those.
    """
    if status and status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status filter '{status}'. Must be one of: {', '.join(sorted(VALID_STATUSES))}",
        )
    try:
        data = get_all_submissions(page=page, limit=limit, status_filter=status)
        return {
            "status": "success",
            "data": data,
            "pagination": {"page": page, "limit": limit, "count": len(data)},
        }
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/submissions/{submission_id}", summary="Get full detail of a single KYC submission")
async def get_submission(submission_id: str):
    """
    Returns the full KYC record including raw_ai_json and ai_reasoning.
    """
    try:
        data = get_submission_by_id(submission_id)
        return {"status": "success", "data": data}
    except RuntimeError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.patch("/submissions/{submission_id}/review", summary="Approve / Reject / Request Reupload")
async def review_submission(submission_id: str, body: ReviewRequest):
    """
    Updates the review status of a KYC submission.

    - `approved` — KYC passed, merchant is verified.
    - `rejected` — KYC failed, merchant is blocked.
    - `reupload_requested` — Documents unclear; applicant must resubmit (creates a new row).

    Optionally include `admin_notes` to record the reason.
    """
    try:
        data = update_submission_status(
            submission_id=submission_id,
            status=body.status,
            admin_notes=body.admin_notes,
        )
        return {"status": "success", "data": data}
    except (RuntimeError, ValueError) as e:
        raise HTTPException(status_code=404, detail=str(e))
