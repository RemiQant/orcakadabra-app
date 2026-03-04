from openai import OpenAI
import re
import json
from core.config import DASHSCOPE_API_KEY, QWEN_VL_MODEL

ai_client = OpenAI(
    api_key=DASHSCOPE_API_KEY,
    base_url="https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
)

def analyze_documents_from_url(nama: str, nik: str, tgl_lahir: str, ktp_url: str):
    system_prompt = f"""
    Kamu adalah Auditor e-KYC PayLabs tingkat militer. Evaluasi form input dengan dokumen KTP.
    Data Form: Nama: {nama}, NIK: {nik}, Tgl Lahir: {tgl_lahir}.
    
    ATURAN PENOLAKAN (is_fake: true):
    1. Visual: Tolak jika ada coretan, kumis buatan, batas kotak editan Photoshop, atau pola layar monitor (Moiré).
    2. Logika NIK KTP: Jika wanita, tgl di NIK +40. Rumus NIK (digit 7-12) WAJIB SAMA dengan Tgl Lahir input DAN Tgl di NIK WAJIB LOGIS (misal: tgl 31 di bulan 2 jelas tidak logis), serta Tgl di KTP WAJIB SAMA dengan Tgl Lahir input.
    3. Validasi NIK Input: NIK yang dimasukkan di form ({nik}) WAJIB SAMA dengan NIK yang tertera di KTP. Jika berbeda, tolak.
    
    Keluarkan HANYA JSON MURNI (Wajib kerjakan ai_reasoning dahulu sebelum mengambil keputusan is_fake):
    {{
      "data_ekstraksi": {{
         "nik_ktp": "..."
      }},
      "ai_reasoning": "Langkah 1 (Visual):... Langkah 2 (Logika NIK vs Form):... Langkah 3 (Validasi NIK Input):...",
      "is_fake": true/false,
      "risk_score": 0-100,
      "confidence_score": 0-100,
      "fraud_reason": "Sebutkan detail ketidakcocokan logika atau temuan visual. (Kosongkan jika asli)"
    }}
    """
    
    completion = ai_client.chat.completions.create(
        model=QWEN_VL_MODEL, 
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": ktp_url}},
                    {"type": "text", "text": system_prompt}
                ]
            }
        ],
        max_tokens=600, 
        temperature=0.01
    )
    
    hasil_ai_raw = ""
    for pilihan in completion.choices:
        hasil_ai_raw = pilihan.message.content
        break
        
    hasil_ai_raw = re.sub(r'<think>.*?</think>', '', hasil_ai_raw, flags=re.DOTALL)
    match = re.search(r'\{.*\}', hasil_ai_raw, re.DOTALL)
    
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass
            
    return {"is_fake": True, "fraud_reason": "Gagal membaca JSON dari AI", "ai_reasoning": hasil_ai_raw}