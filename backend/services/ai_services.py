from openai import OpenAI
import re
import json
from core.config import DASHSCOPE_API_KEY, QWEN_VL_MODEL

ai_client = OpenAI(
    api_key=DASHSCOPE_API_KEY,
    base_url="https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
)

def analyze_documents_from_url(nama: str, tgl_lahir: str, ktp_url: str, npwp_url: str, nib_url: str):
    # ===================================================================
    # MASTER PROMPT: FORENSIK VISUAL & LOGIKA MATEMATIKA IDENTITAS
    # ===================================================================
    system_prompt = f"""
    Kamu adalah AI Forensik Digital e-KYC tingkat militer yang bertugas mendeteksi pemalsuan dokumen identitas dan bisnis Indonesia.
    Tugasmu mengevaluasi kecocokan antara DATA FORMULIR INPUT dengan 3 DOKUMEN (KTP, NPWP, NIB).

    DATA FORMULIR INPUT:
    - Nama Lengkap: {nama}
    - Tanggal Lahir: {tgl_lahir}

    ATURAN 1: FORENSIK VISUAL (TOLAK / is_fake: true jika ada salah satu ini)
    - VANDALISME DIGITAL: Jika ada coretan kuas digital, garis hitam buatan, coretan spidol, atau gambar tempelan tidak wajar (seperti KUMIS BUATAN di wajah).
    - RECAPTURE: Adanya pola Moiré (garis layar pelangi) pertanda foto diambil dari layar HP/Monitor lain.
    - SPLICING & FONT: Jika ketebalan (bold) font NIK/Nama berbeda dengan teks bawaan, atau ada bayangan kotak sisa editan Photoshop di sekitar teks.

    ATURAN 2: VALIDASI LOGIKA MATEMATIKA (TOLAK / is_fake: true jika tidak cocok)
    - LOGIKA KTP (16 Digit): Digit 7-8 = Tanggal, 9-10 = Bulan, 11-12 = Dua digit terakhir Tahun Lahir. (JIKA WANITA: Tanggal lahir di NIK WAJIB ditambah 40). Hasil hitungan rumus NIK INI WAJIB SAMA dengan Input Tanggal Lahir ({tgl_lahir}) dan teks cetak di KTP. Jika NIK menunjukkan tahun 02 tetapi teks menunjukkan 1998, INI PALSU MUTLAK.
    - LOGIKA NPWP: Format NPWP baru (16 digit) untuk perorangan WAJIB SAMA PERSIS dengan NIK KTP. Jika format lama (15 digit), pastikan nama persis.
    - LOGIKA NIB: NIB wajib terdiri dari tepat 13 digit angka acak. Nama Penanggung Jawab di NIB wajib sama dengan nama di KTP dan Form.

    INSTRUKSI OUTPUT:
    Lakukan perhitungan dan observasi piksel dengan keras pada kolom `ai_reasoning` SEBELUM kamu memberikan kesimpulan akhir `is_fake`.
    Keluarkan HANYA format JSON murni:
    {{
      "data_diekstrak": {{
         "nik_ktp": "...",
         "npwp": "...",
         "nomor_nib": "..."
      }},
      "pengecekan_logika": {{
         "nama_cocok_semua_dokumen": true/false,
         "rumus_nik_cocok_form": true/false,
         "npwp_valid": true/false
      }},
      "ai_reasoning": "Langkah 1 (Visual):... Langkah 2 (Logika NIK vs Form):... Langkah 3 (NPWP & NIB):...",
      "is_fake": true/false,
      "risk_score": 0-100,
      "confidence_score": 0-100,
      "fraud_reason": "Sebutkan detail fraud jika ada (Misal: Ada kumis buatan di wajah, atau Tahun NIK tidak sinkron). Kosongkan jika asli."
    }}
    """
    
    completion = ai_client.chat.completions.create(
        model=QWEN_VL_MODEL, 
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": ktp_url}},
                    {"type": "image_url", "image_url": {"url": npwp_url}},
                    {"type": "image_url", "image_url": {"url": nib_url}},
                    {"type": "text", "text": system_prompt}
                ]
            }
        ],
        max_tokens=800, # Diperbesar agar AI leluasa menulis reasoning 3 dokumen
        temperature=0.01
    )
    
    # Mengambil hasil string menggunakan loop (KEBAL DARI BUG INDEX LIST)
    hasil_ai_raw = ""
    for pilihan in completion.choices:
        hasil_ai_raw = pilihan.message.content
        break
        
    # Membersihkan tag <think> dan markdown (KEBAL DARI ERROR JSON)
    hasil_ai_raw = re.sub(r'<think>.*?</think>', '', hasil_ai_raw, flags=re.DOTALL)
    match = re.search(r'\{.*\}', hasil_ai_raw, re.DOTALL)
    
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass
            
    return {"is_fake": True, "fraud_reason": "Gagal membaca JSON dari AI", "ai_reasoning": hasil_ai_raw}