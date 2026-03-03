import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  Users,
} from 'lucide-react'
import { getSubmissions } from '@/lib/api'
import paylabsLogo from '@/assets/paylabs-logo.png'
import type { KYCStatus, MerchantKYCSummary } from '@/types'

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: KYCStatus }) {
  const map: Record<KYCStatus, { bg: string; text: string; label: string }> = {
    pending:            { bg: 'bg-amber-100',  text: 'text-amber-700',  label: 'Menunggu' },
    approved:           { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Disetujui' },
    rejected:           { bg: 'bg-red-100',    text: 'text-red-700',    label: 'Ditolak' },
    reupload_requested: { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Minta Ulang' },
  }
  const { bg, text, label } = map[status] ?? map.pending
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${bg} ${text}`}>
      {label}
    </span>
  )
}

// ── AI verdict chip ────────────────────────────────────────────────────────────
function VerdictChip({ isFake, riskScore }: { isFake: boolean; riskScore: number }) {
  if (isFake || riskScore >= 70) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
        <ShieldX size={12} /> Palsu
      </span>
    )
  }
  if (riskScore >= 40) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
        <AlertTriangle size={12} /> Waspada
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
      <ShieldCheck size={12} /> Aman
    </span>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType
  label: string
  value: number | string
  color: string
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm px-5 py-4 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-full flex items-center justify-center ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-500 leading-tight">{label}</p>
        <p className="text-2xl font-bold text-paylabs-navy leading-tight">{value}</p>
      </div>
    </div>
  )
}

// ── Filter tabs ───────────────────────────────────────────────────────────────
const FILTER_TABS: { value: string; label: string }[] = [
  { value: '',                   label: 'Semua' },
  { value: 'pending',            label: 'Menunggu' },
  { value: 'approved',           label: 'Disetujui' },
  { value: 'rejected',           label: 'Ditolak' },
  { value: 'reupload_requested', label: 'Minta Ulang' },
]

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const LIMIT = 15

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-submissions', statusFilter, page],
    queryFn: () => getSubmissions({ page, limit: LIMIT, status: statusFilter || undefined }),
    staleTime: 30_000,
  })

  const submissions: MerchantKYCSummary[] = data?.data ?? []
  const pagination = data?.pagination

  // Quick stats derived from current full fetch (page 1, no filter) for counts
  const { data: allData } = useQuery({
    queryKey: ['admin-submissions-all'],
    queryFn: () => getSubmissions({ limit: 100 }),
    staleTime: 60_000,
  })
  const all = allData?.data ?? []
  const countPending  = all.filter(s => s.status === 'pending').length
  const countApproved = all.filter(s => s.status === 'approved').length
  const countRejected = all.filter(s => s.status === 'rejected').length

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  return (
    <div className="min-h-screen bg-paylabs-bg">
      {/* ── Top Nav ─────────────────────────────────────────────────── */}
      <header className="bg-paylabs-navy shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <img src={paylabsLogo} alt="Paylabs" className="h-8 w-auto" />
          <div className="flex items-center gap-2 text-white/80 text-sm font-medium">
            <LayoutDashboard size={16} />
            Admin Panel
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* ── Page title ─────────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-bold text-paylabs-navy">Dashboard Verifikasi KYC</h1>
          <p className="text-sm text-gray-500 mt-0.5">Pantau dan tinjau semua pengajuan merchant</p>
        </div>

        {/* ── Stat cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Users}        label="Total Pengajuan" value={all.length}    color="bg-paylabs-teal" />
          <StatCard icon={Clock}        label="Menunggu"        value={countPending}  color="bg-amber-400" />
          <StatCard icon={CheckCircle2} label="Disetujui"       value={countApproved} color="bg-green-500" />
          <StatCard icon={XCircle}      label="Ditolak"         value={countRejected} color="bg-red-500" />
        </div>

        {/* ── Filter tabs + refresh ───────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-1 bg-white rounded-xl shadow-sm p-1 border border-gray-100">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.value}
                onClick={() => { setStatusFilter(tab.value); setPage(1) }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === tab.value
                    ? 'bg-paylabs-navy text-white shadow-sm'
                    : 'text-gray-500 hover:text-paylabs-navy hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 text-sm text-paylabs-teal hover:text-paylabs-navy font-medium"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* ── Table ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
              Memuat data...
            </div>
          ) : isError ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-red-500 text-sm">
              <XCircle size={28} />
              Gagal memuat data. Pastikan backend berjalan.
            </div>
          ) : submissions.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
              Tidak ada pengajuan ditemukan.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-paylabs-navy text-white text-left">
                  <th className="px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Nama Lengkap</th>
                  <th className="px-4 py-3 font-semibold">NIK</th>
                  <th className="px-4 py-3 font-semibold">Tanggal Lahir</th>
                  <th className="px-4 py-3 font-semibold">Risk</th>
                  <th className="px-4 py-3 font-semibold">AI Verdict</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Waktu Submit</th>
                  <th className="px-4 py-3 font-semibold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {submissions.map((sub, idx) => (
                  <tr
                    key={sub.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/dashboard/${sub.id}`)}
                  >
                    <td className="px-4 py-3 text-gray-400 tabular-nums">
                      {(page - 1) * LIMIT + idx + 1}
                    </td>
                    <td className="px-4 py-3 font-medium text-paylabs-navy max-w-[180px] truncate">
                      {sub.nama_lengkap}
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                      {sub.nik ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{sub.tgl_lahir}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-semibold tabular-nums ${
                          sub.risk_score >= 70
                            ? 'text-red-600'
                            : sub.risk_score >= 40
                            ? 'text-amber-600'
                            : 'text-green-600'
                        }`}
                      >
                        {sub.risk_score}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <VerdictChip isFake={sub.is_fake} riskScore={sub.risk_score} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={sub.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {formatDate(sub.created_at)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/dashboard/${sub.id}`) }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-paylabs-teal text-white text-xs font-medium hover:bg-paylabs-navy transition-colors"
                      >
                        <Eye size={13} /> Lihat
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Pagination ─────────────────────────────────────────────── */}
        {pagination && pagination.count > LIMIT && (
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              Menampilkan {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, pagination.count)} dari{' '}
              {pagination.count} pengajuan
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                disabled={page * LIMIT >= pagination.count}
                onClick={() => setPage(p => p + 1)}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
