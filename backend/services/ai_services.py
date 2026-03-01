"""
AI document analysis service using Alibaba Cloud Qwen Vision Language Model.

This module provides document analysis for KYC verification by sending
document URLs to the Qwen VL API and interpreting the response.
"""
import json
import logging

from backend.core.config import DASHSCOPE_API_KEY, QWEN_VL_MODEL

logger = logging.getLogger(__name__)

try:
    import dashscope
    from dashscope import MultiModalConversation
except ImportError:  # pragma: no cover
    dashscope = None  # type: ignore[assignment]
    MultiModalConversation = None  # type: ignore[assignment,misc]


def analyze_documents_from_url(
    nama: str,
    tgl_lahir: str,
    ktp_url: str,
    npwp_url: str,
    nib_url: str,
) -> dict:
    """
    Analyze KYC documents via Qwen VL and return a structured risk assessment.

    Returns a dict with keys:
      - is_fake (bool)
      - risk_score (int, 0-100)
      - ai_reasoning (str)
      - fraud_reason (str)
    """
    if dashscope is None or MultiModalConversation is None:
        raise RuntimeError(
            "dashscope package is not installed. Run: pip install dashscope"
        )

    if not DASHSCOPE_API_KEY:
        raise RuntimeError("DASHSCOPE_API_KEY is not configured.")

    dashscope.api_key = DASHSCOPE_API_KEY

    messages = [
        {
            "role": "user",
            "content": [
                {"image": ktp_url},
                {"image": npwp_url},
                {"image": nib_url},
                {
                    "text": (
                        f"Nama: {nama}, Tanggal Lahir: {tgl_lahir}. "
                        "Analisis dokumen KYC berikut. Tentukan apakah dokumen asli atau palsu, "
                        "berikan risk_score (0-100), ai_reasoning, dan fraud_reason. "
                        "Balas dalam format JSON: "
                        '{"is_fake": bool, "risk_score": int, "ai_reasoning": str, "fraud_reason": str}'
                    )
                },
            ],
        }
    ]

    response = MultiModalConversation.call(model=QWEN_VL_MODEL, messages=messages)

    raw_text = response.output.choices[0].message.content[0].get("text", "")
    try:
        return json.loads(raw_text)
    except json.JSONDecodeError:
        logger.warning("Could not parse AI response as JSON: %s", raw_text)
        return {
            "is_fake": True,
            "risk_score": 100,
            "ai_reasoning": raw_text,
            "fraud_reason": "Could not parse AI response",
        }
