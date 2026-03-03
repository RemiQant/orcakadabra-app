import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, XCircle, ShieldAlert, RotateCcw, ArrowRight, IdCard, Receipt, BadgeCheck, type LucideIcon } from 'lucide-react'
import paylabsLogo from '@/assets/paylabs-logo.png'
import type { KYCVerifyResponse } from '@/types'

// ── Stepper (shared visual — step 1 done, step 2 active for success) ──────────
function StepCircle({ state }: { state: 'done' | 'failed' | 'active' | 'upcoming' }) {
  const base = 'w-9 h-9 rounded-full flex items-center justify-center'
  if (state === 'done')     return <div className={`${base} bg-green-500`}><CheckCircle2 size={18} className="text-white" /></div>
  if (state === 'failed')   return <div className={`${base} bg-red-500`}><XCircle size={18} className="text-white" /></div>
  if (state === 'active')   return <div className={`${base} border-[3px] border-paylabs-navy bg-white`} />
  return                           <div className={`${base} bg-paylabs-navy`} />
}

function Stepper({ failed }: { failed: boolean }) {
  const steps: { label: string; Icon: LucideIcon; state: 'done' | 'failed' | 'active' | 'upcoming' }[] = [
    { label: 'Verifikasi KTP',  Icon: IdCard,     state: failed ? 'failed' : 'done'   },
    { label: 'Verifikasi NPWP', Icon: Receipt,    state: failed ? 'upcoming' : 'active' },
    { label: 'Selesai',         Icon: BadgeCheck, state: 'upcoming' },
  ]
  return (
    <div className="flex items-start gap-0 mt-8">
      {steps.map((step, i) => (
        <div key={i} className="flex items-start">
          <div className="flex flex-col items-center gap-2">
            <StepCircle state={step.state} />
            <p className="text-center text-xs text-gray-500 leading-snug">
              Steps {i + 1}<br />{step.label}
            </p>
          </div>
          {i < steps.length - 1 && (
            <div className="w-24 h-0.5 bg-gray-400 mt-[18px] mx-1" />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Result Page ───────────────────────────────────────────────────────────────
export default function KYCResultPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const result = location.state?.result as KYCVerifyResponse | undefined

  // Guard: if landed here without data, send back to form
  if (!result) {
    navigate('/kyc', { replace: true })
    return null
  }

  const { ai_analysis, data } = result
  const failed = ai_analysis.is_fake || ai_analysis.risk_score >= 70

  return (
    <div className="min-h-[100vh] w-full bg-paylabs-bg flex flex-col items-center justify-center py-10 px-4">

      {/* Logo */}
      <div className="flex items-center mb-8">
        <img src={paylabsLogo} alt="Paylabs" className="h-10 w-auto" />
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="bg-white rounded-2xl shadow-md w-full max-w-lg px-10 py-10 flex flex-col items-center gap-6"
      >
        {failed ? (
          // ── FAILURE BRANCH ──────────────────────────────────────────────
          <>
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
              className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center"
            >
              <XCircle size={48} className="text-red-500" strokeWidth={1.5} />
            </motion.div>

            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-800 mb-1">Verifikasi Gagal</h1>
              <p className="text-sm text-gray-500">KTP Anda tidak dapat diverifikasi</p>
            </div>

            {/* Reason card */}
            <div className="w-full bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex gap-3">
              <ShieldAlert size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-700 leading-relaxed">
                <p className="font-semibold text-red-600 mb-1">Alasan Penolakan</p>
                <p>{ai_analysis.fraud_reason || 'Dokumen terdeteksi sebagai tidak valid.'}</p>
                {ai_analysis.risk_score > 0 && (
                  <p className="mt-2 text-xs text-gray-500">
                    Skor risiko: <span className="font-semibold text-red-500">{ai_analysis.risk_score}/100</span>
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={() => navigate('/kyc')}
              className="w-full py-3 rounded-xl bg-paylabs-navy text-white font-semibold text-base flex items-center justify-center gap-2 hover:bg-[#1d2a3e] active:scale-[0.98] transition-all"
            >
              <RotateCcw size={16} />
              Coba Lagi
            </button>
          </>
        ) : (
          // ── SUCCESS BRANCH ──────────────────────────────────────────────
          <>
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
              className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center"
            >
              <CheckCircle2 size={48} className="text-green-500" strokeWidth={1.5} />
            </motion.div>

            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-800 mb-1">Verifikasi Berhasil</h1>
              <p className="text-sm text-gray-500">Identitas Anda telah terverifikasi</p>
            </div>

            {/* Summary card */}
            <div className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 flex flex-col gap-2 text-sm">
              <Row label="Nama"          value={data.nama_lengkap} />
              <Row label="NIK"           value={data.nik} />
              <Row label="Tanggal Lahir" value={data.tgl_lahir} />
              {ai_analysis.confidence_score > 0 && (
                <Row
                  label="Confidence"
                  value={`${Math.round(ai_analysis.confidence_score)}%`}
                  highlight
                />
              )}
            </div>

            <button
              onClick={() => navigate('/kyc/npwp')}
              className="w-full py-3 rounded-xl bg-paylabs-navy text-white font-semibold text-base flex items-center justify-center gap-2 hover:bg-[#1d2a3e] active:scale-[0.98] transition-all"
            >
              Lanjut Verifikasi NPWP
              <ArrowRight size={16} />
            </button>
          </>
        )}
      </motion.div>

      {/* Stepper */}
      <Stepper failed={failed} />
    </div>
  )
}

function Row({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-500">{label}</span>
      <span className={`font-semibold ${highlight ? 'text-green-600' : 'text-gray-800'}`}>{value}</span>
    </div>
  )
}

