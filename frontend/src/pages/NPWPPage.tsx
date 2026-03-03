import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ImagePlus, User, Hash, MapPin, CheckCircle2, IdCard, Receipt, BadgeCheck, type LucideIcon } from 'lucide-react'
import paylabsLogo from '@/assets/paylabs-logo.png'

// ── Reusable form field ───────────────────────────────────────────────────────
function Field({
  label, placeholder, value, onChange, icon: Icon,
}: {
  label: string; placeholder: string; value: string
  onChange: (v: string) => void; icon?: LucideIcon
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="font-semibold text-gray-800 text-sm flex items-center gap-1.5">
        {Icon && <Icon size={13} className="text-paylabs-teal" />}
        {label}
      </label>
      <input
        placeholder={placeholder}
        value={value}
        required
        onChange={(e) => onChange(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-paylabs-teal focus:border-transparent transition-shadow"
      />
    </div>
  )
}

// ── Stepper — step 1 done, step 2 active ─────────────────────────────────────
function StepCircle({ state, Icon }: { state: 'done' | 'active' | 'upcoming'; Icon: LucideIcon }) {
  const base = 'w-9 h-9 rounded-full flex items-center justify-center'
  if (state === 'done')   return <div className={`${base} bg-green-500`}><CheckCircle2 size={18} className="text-white" /></div>
  if (state === 'active') return <div className={`${base} border-[3px] border-paylabs-navy bg-white`}><Icon size={16} className="text-paylabs-navy" /></div>
  return                         <div className={`${base} bg-paylabs-navy`}><Icon size={16} className="text-white" /></div>
}

function Stepper() {
  const steps: { label: string; Icon: LucideIcon; state: 'done' | 'active' | 'upcoming' }[] = [
    { label: 'Verifikasi KTP',  Icon: IdCard,     state: 'done'     },
    { label: 'Verifikasi NPWP', Icon: Receipt,    state: 'active'   },
    { label: 'Selesai',         Icon: BadgeCheck, state: 'upcoming' },
  ]
  return (
    <div className="flex items-start mt-8">
      {steps.map((step, i) => (
        <div key={i} className="flex items-start">
          <div className="flex flex-col items-center gap-2">
            <StepCircle state={step.state} Icon={step.Icon} />
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

// ── NPWP Page ─────────────────────────────────────────────────────────────────
export default function NPWPPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [form, setForm] = useState({ npwp: '', nama: '', alamat: '' })
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Simulate AI check then navigate to thank you
  useEffect(() => {
    if (!isLoading) return
    const timer = setTimeout(() => navigate('/kyc/thankyou'), 2500)
    return () => clearTimeout(timer)
  }, [isLoading, navigate])

  const handleFile = (f: File) => setPreview(URL.createObjectURL(f))

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  const handleSubmit = () => {
    setError(null)
    if (!preview)           return setError('Silakan unggah foto NPWP Anda.')
    if (!form.npwp.trim())  return setError('Nomor NPWP wajib diisi.')
    if (!form.nama.trim())  return setError('Nama sesuai NPWP wajib diisi.')
    if (!form.alamat.trim()) return setError('Alamat wajib diisi.')
    setIsLoading(true)
  }

  return (
    <div className="min-h-[100vh] w-full bg-paylabs-bg flex flex-col items-center justify-center py-10 px-4">

      {/* Logo */}
      <div className="flex items-center mb-8">
        <img src={paylabsLogo} alt="Paylabs" className="h-10 w-auto" />
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-md w-full max-w-3xl px-10 py-8">
        <h1 className="text-2xl text-center text-gray-600 font-bold mb-8">
          Verifikasi NPWP
        </h1>

        <div className="flex gap-8">

          {/* Left: upload + submit */}
          <div className="flex flex-col gap-4 w-64 flex-shrink-0">
            <p className="font-bold text-paylabs-navy text-lg">Unggah Foto NPWP</p>

            <div
              onClick={() => !isLoading && fileInputRef.current?.click()}
              onDrop={(e) => { if (!isLoading) handleDrop(e) }}
              onDragOver={(e) => e.preventDefault()}
              className={`w-full aspect-[4/3] rounded-xl bg-paylabs-teal flex items-center justify-center overflow-hidden transition-opacity ${
                isLoading ? 'cursor-default' : 'cursor-pointer hover:opacity-90'
              }`}
            >
              {preview ? (
                <img src={preview} alt="Preview NPWP" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-[#1B5070]">
                  <ImagePlus size={40} strokeWidth={1.5} />
                  <span className="text-xs font-medium">Klik atau seret foto NPWP</span>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />

            {isLoading ? (
              <div className="flex flex-col items-center gap-2 w-full">
                <div className="relative w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    className="absolute top-0 left-0 h-full w-1/2 bg-paylabs-navy rounded-full"
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 1.4, ease: 'easeInOut', repeat: Infinity, repeatType: 'loop' }}
                  />
                </div>
                <p className="text-xs text-gray-500 font-medium">Pengecekan oleh AI</p>
              </div>
            ) : (
              <button
                onClick={handleSubmit}
                className="w-full py-3 rounded-xl bg-paylabs-navy text-white font-semibold text-base tracking-wide hover:bg-[#1d2a3e] active:scale-[0.98] transition-all"
              >
                Verify
              </button>
            )}

            {error && (
              <p className="text-red-500 text-xs text-center leading-snug">{error}</p>
            )}
          </div>

          {/* Right: form fields */}
          <div className="flex-1 flex flex-col gap-3">
            <Field
              label="Nomor NPWP:"
              placeholder="Masukkan nomor NPWP (15/16 digit)"
              value={form.npwp}
              onChange={(v) => setForm({ ...form, npwp: v })}
              icon={Hash}
            />
            <Field
              label="Nama Sesuai NPWP:"
              placeholder="Masukkan nama sesuai NPWP Anda"
              value={form.nama}
              onChange={(v) => setForm({ ...form, nama: v })}
              icon={User}
            />
            <Field
              label="Alamat:"
              placeholder="Masukkan alamat sesuai NPWP Anda"
              value={form.alamat}
              onChange={(v) => setForm({ ...form, alamat: v })}
              icon={MapPin}
            />
          </div>
        </div>
      </div>

      <Stepper />
    </div>
  )
}

