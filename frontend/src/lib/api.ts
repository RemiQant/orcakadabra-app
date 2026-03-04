/**
 * Central API helper.
 * All requests go through here so base URL and error handling
 * are configured in one place — just update VITE_API_BASE_URL in .env.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string

if (!BASE_URL) {
  console.error(
    '[api] VITE_API_BASE_URL is not set. ' +
    'Create frontend/.env with VITE_API_BASE_URL=http://localhost:8080'
  )
}

/** Generic fetch wrapper — throws an Error with the detail message on non-2xx */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      // Only set Content-Type to JSON for non-FormData bodies.
      // FormData sets its own multipart boundary automatically.
      ...(!(init?.body instanceof FormData) && {
        'Content-Type': 'application/json',
      }),
    },
    ...init,
  })

  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const err = await res.json()
      detail = err?.detail ?? JSON.stringify(err)
    } catch {
      // response body wasn't JSON — keep the status code message
    }
    throw new Error(detail)
  }

  return res.json() as Promise<T>
}

// ── KYC ───────────────────────────────────────────────────────────────────────

import type { KYCVerifyResponse } from '@/types'

export function verifyMerchant(formData: FormData): Promise<KYCVerifyResponse> {
  return request<KYCVerifyResponse>('/kyc/verify-merchant', {
    method: 'POST',
    body: formData, // multipart/form-data — do NOT set Content-Type manually
  })
}

// ── Admin ─────────────────────────────────────────────────────────────────────

import type {
  MerchantKYCDetail,
  ReviewRequest,
  SubmissionsListResponse,
} from '@/types'

export interface GetSubmissionsParams {
  page?: number
  limit?: number
  status?: string
}

export function getSubmissions(
  params: GetSubmissionsParams = {}
): Promise<SubmissionsListResponse> {
  const qs = new URLSearchParams()
  if (params.page)   qs.set('page',   String(params.page))
  if (params.limit)  qs.set('limit',  String(params.limit))
  if (params.status) qs.set('status', params.status)
  const query = qs.toString() ? `?${qs}` : ''
  return request<SubmissionsListResponse>(`/admin/submissions${query}`)
}

export function getSubmissionById(id: string): Promise<{ status: string; data: MerchantKYCDetail }> {
  return request<{ status: string; data: MerchantKYCDetail }>(`/admin/submissions/${id}`)
}

export function reviewSubmission(
  id: string,
  body: ReviewRequest
): Promise<{ status: string; data: MerchantKYCDetail }> {
  return request<{ status: string; data: MerchantKYCDetail }>(
    `/admin/submissions/${id}/review`,
    { method: 'PATCH', body: JSON.stringify(body) }
  )
}
