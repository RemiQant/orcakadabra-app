import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ImageOff,
} from 'lucide-react'
import { getSubmissionById, reviewSubmission } from '@/lib/api'
import paylabsLogo from '@/assets/paylabs-logo.png'
import type { KYCStatus } from '@/types'

// ── Derived verdict state ─────────────────────────────────────────────────────
type VerdictState = 'clean' | 'fake' | 'mismatch'

function deriveVerdict(
  isFake: boolean,
  riskScore: number,
  nikSubmitted: string | null,
  nikExtracted: string | null | undefined
): VerdictState {
  if (isFake || riskScore >= 70) return 'fake'
  if (
    nikSubmitted &&
    nikExtracted &&
    nikSubmitted.trim() !== nikExtracted.trim()
  )
    return 'mismatch'
  return 'clean'
}

// ── Verdict card (left panel) ─────────────────────────────────────────────────
function VerdictCard({
  state,
  fraudReason,
}: {
  state: VerdictState
  fraudReason: string
}) {
  const cfg = {
    clean: {
      icon: <CheckCircle2 size={32} className="text-green-500" strokeWidth={2} />,
      text: 'AI tidak mendeteksi adanya kejanggalan.',
    },
    fake: {
      icon: <XCircle size={32} className="text-red-500" strokeWidth={2} />,
      text: fraudReason || 'AI mendeteksi KTP Palsu (Fotokopi).',
    },
    mismatch: {
      icon: <AlertTriangle size={32} className="text-amber-500" strokeWidth={2} />,
      text: fraudReason || 'AI mendeteksi adanya kesalahan informasi yang diunggah pengguna.',
    },
  }[state]

  return (
    <div className="bg-white rounded-2xl shadow px-6 py-5 flex flex-col items-start gap-3 w-full">
      {cfg.icon}
      <p className="text-paylabs-navy font-bold text-lg leading-snug">{cfg.text}</p>
    </div>
  )
}

// ── Field row (right panel) ───────────────────────────────────────────────────
function FieldRow({
  label,
  value,
  valid,
  mono = false,
}: {
  label: string
  value: string
  valid: boolean
  mono?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      <div className="flex items-center gap-3">
        <div
          className={`flex-1 border rounded-lg px-4 py-2.5 text-sm bg-gray-50 text-gray-800 ${
            mono ? 'font-mono' : ''
          } ${valid ? 'border-gray-200' : 'border-red-300 bg-red-50 text-red-700'}`}
        >
          {value || '—'}
        </div>
        {valid ? (
          <CheckCircle2 size={24} className="shrink-0 text-green-500" strokeWidth={2} />
        ) : (
          <XCircle size={24} className="shrink-0 text-red-500" strokeWidth={2} />
        )}
      </div>
    </div>
  )
}

// ── Action buttons ────────────────────────────────────────────────────────────
const STATUS_ACTIONS: {
  status: Exclude<KYCStatus, 'pending'>
  label: string
  classes: string
  Icon: React.ElementType
}[] = [
  {
    status: 'approved',
    label: 'Terima',
    classes:
      'bg-green-500 hover:bg-green-600 text-white border-2 border-green-600',
    Icon: CheckCircle2,
  },
  {
    status: 'reupload_requested',
    label: 'Upload Kembali',
    classes:
      'bg-amber-400 hover:bg-amber-500 text-white border-2 border-amber-500',
    Icon: AlertTriangle,
  },
  {
    status: 'rejected',
    label: 'Blokir',
    classes: 'bg-red-500 hover:bg-red-600 text-white border-2 border-red-600',
    Icon: XCircle,
  },
]

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminSubmissionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [showReasoning, setShowReasoning] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')
  const [actionFeedback, setActionFeedback] = useState<string | null>(null)

  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['admin-submission', id],
    queryFn: () => getSubmissionById(id!),
    enabled: !!id,
  })

  const mutation = useMutation({
    mutationFn: (status: Exclude<KYCStatus, 'pending'>) =>
      reviewSubmission(id!, { status, admin_notes: adminNotes || undefined }),
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ['admin-submissions'] })
      queryClient.invalidateQueries({ queryKey: ['admin-submission', id] })
      setActionFeedback(status)
    },
  })

  // ── Loading / error states ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-paylabs-bg flex items-center justify-center text-gray-400">
        Memuat data pengajuan...
      </div>
    )
  }
  if (isError || !data?.data) {
    return (
      <div className="min-h-screen bg-paylabs-bg flex flex-col items-center justify-center gap-4 text-red-500">
        <XCircle size={40} strokeWidth={1.5} />
        <p className="font-semibold">Pengajuan tidak ditemukan atau terjadi kesalahan.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="text-sm text-paylabs-teal underline"
        >
          Kembali ke Dashboard
        </button>
      </div>
    )
  }

  const sub = data.data
  const raw = sub.raw_ai_json
  const nikExtracted = raw?.data_ekstraksi?.nik_ktp ?? null
  const confidenceScore = raw?.confidence_score ?? 0
  const verdictState = deriveVerdict(sub.is_fake, sub.risk_score, sub.nik, nikExtracted)

  // Field validity
  const nikValid = !sub.is_fake
    ? !!(nikExtracted && sub.nik && sub.nik.trim() === nikExtracted.trim())
    : false
  const allFieldsValid = !sub.is_fake && verdictState === 'clean'

  const alreadyReviewed = sub.status !== 'pending'

  return (
    <div className="min-h-screen flex flex-col md:flex-row">

      {/* ──────── LEFT PANEL — navy ──────────────────────────────────── */}
      <div className="w-full md:w-5/12 bg-paylabs-navy flex flex-col px-8 py-8 gap-6 min-h-screen">

        {/* Back button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="self-start w-11 h-11 rounded-full border-2 border-white/30 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>

        {/* KTP image */}
        <div className="rounded-2xl overflow-hidden border-2 border-white/20 bg-black/20">
          {sub.ktp_url ? (
            <img
              src={sub.ktp_url}
              alt="KTP"
              className="w-full object-contain max-h-56"
              onError={e => {
                ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                ;(e.currentTarget.nextSibling as HTMLElement)!.style.display =
                  'flex'
              }}
            />
          ) : null}
          {/* Fallback icon */}
          <div
            className="w-full h-48 hidden items-center justify-center flex-col gap-2 text-white/40"
          >
            <ImageOff size={36} strokeWidth={1.5} />
            <span className="text-sm">Gambar tidak tersedia</span>
          </div>
        </div>

        {/* Verdict card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut', delay: 0.1 }}
        >
          <VerdictCard
            state={verdictState}
            fraudReason={sub.fraud_reason}
          />
        </motion.div>

        {/* Confidence level */}
        <p className="text-center text-white/60 text-sm font-medium">
          Confidence Level: {confidenceScore}%
        </p>

        {/* Risk score bar */}
        <div className="mt-auto">
          <div className="flex justify-between text-xs text-white/50 mb-1">
            <span>Risk Score</span>
            <span className="font-semibold text-white">{sub.risk_score} / 100</span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                sub.risk_score >= 70
                  ? 'bg-red-400'
                  : sub.risk_score >= 40
                  ? 'bg-amber-400'
                  : 'bg-green-400'
              }`}
              style={{ width: `${sub.risk_score}%` }}
            />
          </div>
        </div>
      </div>

      {/* ──────── RIGHT PANEL — white ────────────────────────────────── */}
      <div className="flex-1 bg-white flex flex-col px-8 py-8 gap-5 overflow-y-auto">

        {/* Logo */}
        <div className="flex justify-center mb-2">
          <img src={paylabsLogo} alt="Paylabs" className="h-8 w-auto" />
        </div>

        {/* Already-reviewed banner */}
        {alreadyReviewed && (
          <div
            className={`rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2 ${
              sub.status === 'approved'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : sub.status === 'rejected'
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}
          >
            <CheckCircle2 size={16} />
            Pengajuan ini sudah ditinjau dengan status:{' '}
            <strong className="capitalize">{sub.status.replace('_', ' ')}</strong>
            {sub.admin_notes && (
              <span className="text-xs ml-1 opacity-70">— {sub.admin_notes}</span>
            )}
          </div>
        )}

        {/* Success feedback banner */}
        <AnimatePresence>
          {actionFeedback && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl px-4 py-3 bg-green-50 text-green-700 border border-green-200 text-sm font-medium flex items-center gap-2"
            >
              <CheckCircle2 size={16} />
              Status berhasil diperbarui ke <strong>{actionFeedback.replace('_', ' ')}</strong>.
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fields */}
        <div className="space-y-3">
          <FieldRow
            label="Nama Lengkap:"
            value={sub.nama_lengkap}
            valid={allFieldsValid || verdictState === 'mismatch'}
          />
          <FieldRow
            label="NIK (Nomor Induk Kependudukan):"
            value={sub.nik ?? '—'}
            valid={nikValid}
            mono
          />
          <FieldRow
            label="Tanggal Lahir:"
            value={sub.tgl_lahir}
            valid={allFieldsValid}
          />
          {/* NIK from AI (data_ekstraksi) comparison row */}
          {nikExtracted && (
            <FieldRow
              label="NIK Terbaca AI (dari gambar KTP):"
              value={nikExtracted}
              valid={nikValid}
              mono
            />
          )}
        </div>

        {/* AI Reasoning (collapsible) */}
        {sub.ai_reasoning && (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowReasoning(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-paylabs-navy hover:bg-gray-50 transition-colors"
            >
              Penjelasan AI
              {showReasoning ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <AnimatePresence>
              {showReasoning && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 text-sm text-gray-600 whitespace-pre-wrap leading-relaxed border-t border-gray-100 pt-3 bg-gray-50">
                    {sub.ai_reasoning}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Admin notes input */}
        {!alreadyReviewed && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">
              Catatan Admin{' '}
              <span className="text-gray-400 font-normal">(opsional)</span>
            </label>
            <textarea
              rows={2}
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
              placeholder="Tuliskan alasan penolakan atau catatan untuk pelamar..."
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-paylabs-teal/40 placeholder:text-gray-400"
            />
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 pt-1 mt-auto flex-wrap">
          {STATUS_ACTIONS.map(({ status, label, classes, Icon }) => (
            <button
              key={status}
              disabled={alreadyReviewed || mutation.isPending}
              onClick={() => mutation.mutate(status)}
              className={`flex-1 min-w-[110px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${classes} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Icon size={16} strokeWidth={2.5} />
              {label}
            </button>
          ))}
        </div>

        {mutation.isError && (
          <p className="text-xs text-red-500 text-center">
            Gagal memperbarui status. Coba lagi.
          </p>
        )}

        {/* Metadata strip */}
        <div className="mt-2 pt-4 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs text-gray-400">
          <div>
            <span className="font-medium text-gray-500">ID Pengajuan</span>
            <p className="font-mono mt-0.5 break-all">{sub.id}</p>
          </div>
          <div>
            <span className="font-medium text-gray-500">Waktu Submit</span>
            <p className="mt-0.5">
              {new Date(sub.created_at).toLocaleString('id-ID', {
                dateStyle: 'long',
                timeStyle: 'short',
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
