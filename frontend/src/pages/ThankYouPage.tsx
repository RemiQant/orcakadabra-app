import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, BadgeCheck } from 'lucide-react'
import paylabsLogo from '@/assets/paylabs-logo.png'

// ── Stepper — all steps done ──────────────────────────────────────────────────
function StepCircle({ done }: { done: boolean }) {
  const base = 'w-9 h-9 rounded-full flex items-center justify-center'
  return done
    ? <div className={`${base} bg-green-500`}><CheckCircle2 size={18} className="text-white" /></div>
    : <div className={`${base} bg-paylabs-navy`} />
}

function Stepper() {
  const steps: { label: string }[] = [
    { label: 'Verifikasi KTP'  },
    { label: 'Verifikasi NPWP' },
    { label: 'Selesai'         },
  ]
  return (
    <div className="flex items-start gap-0 mt-8">
      {steps.map((step, i) => (
        <div key={i} className="flex items-start">
          <div className="flex flex-col items-center gap-2">
            <StepCircle done />
            <p className="text-center text-xs text-gray-500 leading-snug">
              Step {i + 1}<br />{step.label}
            </p>
          </div>
          {i < steps.length - 1 && (
            <div className="w-24 h-0.5 bg-green-400 mt-[18px] mx-1" />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Thank You Page ────────────────────────────────────────────────────────────
export default function ThankYouPage() {
  const navigate = useNavigate()

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
        className="bg-white rounded-2xl shadow-md w-full max-w-lg px-10 py-10 flex flex-col items-center gap-6 text-center"
      >
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
          className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center"
        >
          <BadgeCheck size={48} className="text-green-500" strokeWidth={1.5} />
        </motion.div>

        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Terima Kasih!</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Pengajuan Anda telah berhasil dikirim.<br />
            Tim kami akan meninjau dokumen Anda dan menghubungi Anda dalam <span className="font-semibold text-paylabs-navy">1 hari kerja</span>.
          </p>
        </div>

        <div className="w-full bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 text-sm text-blue-700 leading-relaxed">
          Anda akan menerima notifikasi melalui email atau nomor yang terdaftar setelah proses verifikasi selesai.
        </div>

        <button
          onClick={() => navigate('/')}
          className="w-full py-3 rounded-xl bg-paylabs-navy text-white font-semibold text-base hover:bg-[#1d2a3e] active:scale-[0.98] transition-all"
        >
          Kembali ke Beranda
        </button>
      </motion.div>

      {/* Stepper — all green */}
      <Stepper />
    </div>
  )
}
