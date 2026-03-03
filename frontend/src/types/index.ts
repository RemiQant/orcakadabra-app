/**
 * TypeScript types mirroring the Supabase `merchants_kyc` table.
 * Keep in sync with docs/TECHNICAL_SPEC.md — Section 4 (Database).
 */

export type KYCStatus =
  | 'pending'
  | 'approved'
  | 'reupload_requested'
  | 'rejected'

/** Shape returned by GET /admin/submissions (list view — no raw_ai_json) */
export interface MerchantKYCSummary {
  id: string
  created_at: string
  nama_lengkap: string
  nik: string
  tgl_lahir: string
  ktp_url: string
  is_fake: boolean
  risk_score: number
  fraud_reason: string
  status: KYCStatus
  admin_notes: string | null
}

/** Shape returned by GET /admin/submissions/{id} (full detail) */
export interface MerchantKYCDetail extends MerchantKYCSummary {
  ai_reasoning: string
  raw_ai_json: {
    is_fake: boolean
    risk_score: number
    confidence_score: number
    ai_reasoning: string
    fraud_reason: string
    data_ekstraksi: {
      nik_ktp: string
    }
  }
}

/** Shape of the AI analysis block inside POST /kyc/verify-merchant response */
export interface AIAnalysis {
  is_fake: boolean
  risk_score: number
  confidence_score: number
  ai_reasoning: string
  fraud_reason: string
  data_ekstraksi: {
    nik_ktp: string
  }
}

/** Full response from POST /kyc/verify-merchant */
export interface KYCVerifyResponse {
  status: 'success'
  data: MerchantKYCDetail
  ai_analysis: AIAnalysis
}

/** Pagination metadata returned by list endpoints */
export interface Pagination {
  page: number
  limit: number
  count: number
}

/** Response shape from GET /admin/submissions */
export interface SubmissionsListResponse {
  status: 'success'
  data: MerchantKYCSummary[]
  pagination: Pagination
}

/** Request body for PATCH /admin/submissions/{id}/review */
export interface ReviewRequest {
  status: Exclude<KYCStatus, 'pending'>
  admin_notes?: string
}
