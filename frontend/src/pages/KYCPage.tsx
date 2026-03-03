import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ImagePlus, User, Hash, CalendarDays, MapPin, IdCard, Receipt, BadgeCheck, type LucideIcon } from 'lucide-react'
import { verifyMerchant } from '@/lib/api'
import type { KYCVerifyResponse } from '@/types'
import paylabsLogo from '@/assets/paylabs-logo.png'

// ── Reusable form field ───────────────────────────────────────────────────────
function Field({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  icon: Icon,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  type?: string
  icon?: LucideIcon
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="font-semibold text-gray-800 text-sm flex items-center gap-1.5">
        {Icon && <Icon size={13} className="text-paylabs-teal" />}
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        required
        onChange={(e) => onChange(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-paylabs-teal focus:border-transparent transition-shadow"
      />
    </div>
  )
}

// ── Stepper ───────────────────────────────────────────────────────────────────
function StepCircle({ active, Icon }: { active: boolean; Icon: LucideIcon }) {
  return active ? (
    // Current step: hollow ring with icon
    <div className="w-9 h-9 rounded-full border-[3px] border-paylabs-navy bg-white flex items-center justify-center">
      <Icon size={16} className="text-paylabs-navy" />
    </div>
  ) : (
    // Upcoming step: filled with icon
    <div className="w-9 h-9 rounded-full bg-paylabs-navy flex items-center justify-center">
      <Icon size={16} className="text-white" />
    </div>
  )
}

function Stepper() {
  const steps: { label: string; active: boolean; Icon: LucideIcon }[] = [
    { label: 'Verifikasi KTP',  active: true,  Icon: IdCard      },
    { label: 'Verifikasi NPWP', active: false, Icon: Receipt     },
    { label: 'Selesai',         active: false, Icon: BadgeCheck  },
  ]
  return (
    <div className="flex items-start gap-0 mt-8">
      {steps.map((step, i) => (
        <div key={i} className="flex items-start">
          <div className="flex flex-col items-center gap-2">
            <StepCircle active={step.active} Icon={step.Icon} />
            <p className="text-center text-xs text-gray-500 leading-snug">
              Step {i + 1}<br />{step.label}
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

// ── KYC Page ──────────────────────────────────────────────────────────────────
export default function KYCPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [form, setForm] = useState({
    nama: '',
    nik: '',
    tgl_lahir: '',
    tempat_lahir: '',
  })
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (fd: FormData) => verifyMerchant(fd),
    onSuccess: (data: KYCVerifyResponse) => {
      navigate('/kyc/result', { state: { result: data } })
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  const handleFile = (f: File) => {
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  const handleSubmit = () => {
    setError(null)
    if (!file)                    return setError('Silakan unggah foto KTP Anda.')
    if (!form.nama.trim())         return setError('Nama lengkap wajib diisi.')
    if (!form.nik.trim())          return setError('NIK wajib diisi.')
    if (!form.tgl_lahir.trim())    return setError('Tanggal lahir wajib diisi.')
    if (!form.tempat_lahir.trim()) return setError('Tempat lahir wajib diisi.')

    const fd = new FormData()
    fd.append('nama', form.nama)
    fd.append('nik', form.nik)
    fd.append('tgl_lahir', form.tgl_lahir)
    fd.append('tempat_lahir', form.tempat_lahir)
    fd.append('ktp', file)
    mutation.mutate(fd)
  }

  const isLoading = mutation.isPending

  return (
    <div className="min-h-[100vh] w-full bg-paylabs-bg flex flex-col items-center justify-center py-10 px-4">

      {/* ── Logo ── */}
      <div className="flex items-center mb-8">
        <img src={paylabsLogo} alt="Paylabs" className="h-10 w-auto" />
      </div>

      {/* ── Card ── */}
      <div className="bg-white rounded-2xl shadow-md w-full max-w-3xl px-10 py-8">
        <h1 className="text-2xl text-center text-gray-600 font-bold mb-8">
          Verifikasi Identitas Anda
        </h1>

        <div className="flex gap-8">

          {/* Left column: upload + submit */}
          <div className="flex flex-col gap-4 w-64 flex-shrink-0">
            <p className="font-bold text-paylabs-navy text-lg">Unggah Foto KTP</p>

            {/* Upload zone */}
            <div
              onClick={() => !isLoading && fileInputRef.current?.click()}
              onDrop={(e) => { if (!isLoading) handleDrop(e) }}
              onDragOver={(e) => e.preventDefault()}
              className={`w-full aspect-[4/3] rounded-xl bg-paylabs-teal flex items-center justify-center overflow-hidden transition-opacity ${
                isLoading ? 'cursor-default' : 'cursor-pointer hover:opacity-90'
              }`}
            >
              {preview ? (
                <img
                  src={preview}
                  alt="Preview KTP"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-[#1B5070]">
                  <ImagePlus size={40} strokeWidth={1.5} />
                  <span className="text-xs font-medium">Klik atau seret foto KTP</span>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Verify button / AI processing bar */}
            {isLoading ? (
              <div className="flex flex-col items-center gap-2 w-full">
                {/* Progress track */}
                <div className="relative w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    className="absolute top-0 left-0 h-full w-1/2 bg-paylabs-navy rounded-full"
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{
                      duration: 1.4,
                      ease: 'easeInOut',
                      repeat: Infinity,
                      repeatType: 'loop',
                    }}
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

          {/* Right column: form fields */}
          <div className="flex-1 flex flex-col gap-3">
            <Field
              label="Nama Lengkap:"
              placeholder="Masukkan nama lengkap Anda"
              value={form.nama}
              onChange={(v) => setForm({ ...form, nama: v })}
              icon={User}
            />
            <Field
              label="NIK (Nomor Induk Kependudukan):"
              placeholder="Masukkan NIK (16 digit)"
              value={form.nik}
              onChange={(v) => setForm({ ...form, nik: v })}
              icon={Hash}
            />
            <Field
              label="Tanggal Lahir:"
              placeholder="dd-mm-yyyy"
              value={form.tgl_lahir}
              onChange={(v) => setForm({ ...form, tgl_lahir: v })}
              icon={CalendarDays}
            />
            <Field
              label="Tempat Lahir:"
              placeholder="Masukkan tempat lahir Anda"
              value={form.tempat_lahir}
              onChange={(v) => setForm({ ...form, tempat_lahir: v })}
              icon={MapPin}
            />
          </div>
        </div>
      </div>

      {/* ── Stepper ── */}
      <Stepper />
    </div>
  )
}
