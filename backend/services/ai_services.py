from openai import OpenAI
import re
import json
from core.config import DASHSCOPE_API_KEY, QWEN_VL_MODEL

ai_client = OpenAI(
    api_key=DASHSCOPE_API_KEY,
    base_url="https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
)

def analyze_documents_from_url(nama: str, tgl_lahir: str, ktp_url: str):
    system_prompt = f"""
    Kamu adalah Auditor e-KYC PayLabs tingkat militer. Evaluasi dokumen KTP ini dengan form input pengguna.
    Data Form: Nama: {nama}, Tgl Lahir: {tgl_lahir}.
    
    ATURAN 1: EKSTRAKSI DATA (OCR)
    Baca seluruh teks yang ada di KTP dengan sangat akurat dan masukkan ke dalam struktur JSON "data_ekstraksi". Pisahkan antara Tempat Lahir dan Tgl Lahir.

    ATURAN 2: DETEKSI FRAUD (is_fake: true jika melanggar)
    1. Visual: Tolak jika ada coretan, kumis buatan, batas kotak editan Photoshop, atau pola layar monitor (Moiré).
    2. Logika NIK KTP: Jika wanita, tgl di NIK +40. Rumus NIK (digit 7-12) WAJIB SAMA dengan Tgl Lahir input dan Tgl Lahir di KTP.
    
    Keluarkan HANYA JSON MURNI (Wajib kerjakan ai_reasoning dahulu sebelum mengambil keputusan is_fake):
    {{
      "data_ekstraksi": {{
         "provinsi": "...",
         "kota_kabupaten": "...",
         "nik": "...",
         "nama": "...",
         "tempat_lahir": "...",
         "tgl_lahir": "...",
         "jenis_kelamin": "...",
         "gol_darah": "...",
         "alamat": "...",
         "rt_rw": "...",
         "kelurahan_desa": "...",
         "kecamatan": "...",
         "agama": "...",
         "status_perkawinan": "...",
         "pekerjaan": "...",
         "kewarganegaraan": "...",
         "berlaku_hingga": "..."
      }},
      "ai_reasoning": "Langkah 1 (Ekstraksi):... Langkah 2 (Visual):... Langkah 3 (Logika NIK vs Form):...",
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
        max_tokens=1500, # ---> PENTING: Naikkan menjadi 1500 karena data KTP sangat panjang!
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