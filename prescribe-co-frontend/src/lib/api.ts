/**
 * P&Co. API Service Layer
 * ──────────────────────
 * All network calls live here. Components never call fetch() directly.
 * Uses the server-side base URL for Server Components, browser URL for Client Components.
 */

const API_BASE =
  typeof window === 'undefined'
    ? (process.env.API_INTERNAL_URL ?? 'http://localhost:3001/api/v1')
    : (process.env.NEXT_PUBLIC_API_URL  ?? '/api/v1')

// ── Types ──────────────────────────────────────────────────────────────────

export type MedicineType = 'POM' | 'P' | 'GSL'
export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'
export type PrescriptionStatus =
  | 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW'
  | 'APPROVED' | 'REJECTED' | 'DISPENSING' | 'FULFILLED'
  | 'CANCELLED' | 'EXPIRED'
export type EligibilityStatus = 'PASS' | 'FLAG' | 'FAIL'
export type Role = 'CUSTOMER' | 'ADMIN' | 'PRESCRIBER' | 'DISPENSER'

export interface Category {
  id: string
  name: string
  slug: string
  sortOrder: number
  children?: Category[]
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  bnfCode: string | null
  medicineType: MedicineType
  requiresPrescription: boolean
  requiresQuestionnaire: boolean
  questionnaireId: string | null
  categoryId: string | null
  pricePence: number
  formattedPrice: string
  status: ProductStatus
  stockCount: number | null
  isAvailable: boolean
  imageUrl?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface User {
  id: string
  email: string
  role: Role
  firstName: string
  lastName: string
  nhsNumber: string | null
  phone: string | null
  isVerified: boolean
  isActive: boolean
  createdAt: string
}

export interface PrescriptionRequest {
  id: string
  customerId: string
  productId: string
  questionnaireResponseId: string | null
  deliveryAddressId: string | null
  status: PrescriptionStatus
  eligibilityStatus: EligibilityStatus | null
  eligibilityNotes: string[] | null
  customerNote: string | null
  submittedAt: string | null
  createdAt: string
  updatedAt: string
  documents: PrescriptionDocument[]
}

export interface PrescriptionDocument {
  id: string
  documentType: string
  originalFilename: string
  mimeType: string
  fileSizeBytes: number
  scanStatus: string
  uploadedAt: string
  presignedUrl?: string
}

export interface QuestionnaireSchema {
  version: number
  questions: QuestionSchema[]
}

export interface QuestionSchema {
  id: string
  type: 'TEXT' | 'BOOLEAN' | 'SINGLE_CHOICE' | 'MULTI_CHOICE' | 'SCALE' | 'DATE'
  text: string
  hint?: string
  isRequired: boolean
  options?: { value: string; label: string; disqualifying?: boolean }[]
  scale?: { min: number; max: number; minLabel?: string; maxLabel?: string }
  showIf?: { questionId: string; operator: string; value: string | string[] }
  sortOrder: number
}

export interface Questionnaire {
  id: string
  title: string
  description: string | null
  schema: QuestionnaireSchema
  version: number
  isActive: boolean
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface LoginResponse extends AuthTokens {
  user: User
}

export interface AuditLog {
  id: string
  actorId: string | null
  gphcNumber: string | null
  actorRole: string | null
  action: string
  entityType: string
  entityId: string
  metadata: Record<string, unknown> | null
  ipAddress: string | null
  createdAt: string
}

// ── HTTP client ────────────────────────────────────────────────────────────

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  token?: string
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, token, ...init } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message ?? `HTTP ${response.status}`)
  }

  if (response.status === 204) return undefined as T
  return response.json()
}

// ── Auth ───────────────────────────────────────────────────────────────────

export const authService = {
  login: (email: string, password: string) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),

  register: (data: {
    email: string; password: string; firstName: string;
    lastName: string; nhsNumber?: string; dateOfBirth?: string
  }) =>
    request<AuthTokens>('/auth/register', { method: 'POST', body: data }),

  logout: (refreshToken: string, token: string) =>
    request<void>('/auth/logout', {
      method: 'POST',
      body: { refreshToken },
      token,
    }),

  refresh: (refreshToken: string) =>
    request<AuthTokens>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
    }),
}

// ── Products ───────────────────────────────────────────────────────────────

export const productsService = {
  list: (params?: {
    medicineType?: MedicineType
    categoryId?: string
    requiresPrescription?: boolean
    search?: string
    page?: number
    limit?: number
  }) => {
    const qs = new URLSearchParams()
    if (params?.medicineType)           qs.set('medicineType', params.medicineType)
    if (params?.categoryId)             qs.set('categoryId', params.categoryId)
    if (params?.requiresPrescription !== undefined)
      qs.set('requiresPrescription', String(params.requiresPrescription))
    if (params?.search)                 qs.set('search', params.search)
    if (params?.page)                   qs.set('page', String(params.page))
    if (params?.limit)                  qs.set('limit', String(params.limit))
    return request<PaginatedResponse<Product>>(`/products?${qs}`, { next: { revalidate: 60 } })
  },

  bySlug: (slug: string) =>
    request<Product>(`/products/slug/${slug}`, { next: { revalidate: 60 } }),

  byId: (id: string) =>
    request<Product>(`/products/${id}`, { next: { revalidate: 60 } }),

  getQuestionnaire: (productId: string) =>
    request<{ requiresQuestionnaire: boolean; questionnaire: Questionnaire | null }>(
      `/products/${productId}/questionnaire`,
      { next: { revalidate: 300 } },
    ),
}

// ── Prescriptions ──────────────────────────────────────────────────────────

export const prescriptionsService = {
  list: (token: string, status?: PrescriptionStatus) =>
    request<PaginatedResponse<PrescriptionRequest>>(
      `/prescriptions${status ? `?status=${status}` : ''}`,
      { token },
    ),

  byId: (id: string, token: string) =>
    request<PrescriptionRequest>(`/prescriptions/${id}`, { token }),

  create: (productId: string, token: string, deliveryAddressId?: string) =>
    request<PrescriptionRequest>('/prescriptions', {
      method: 'POST',
      body: { productId, deliveryAddressId },
      token,
    }),

  attachQuestionnaire: (prescriptionId: string, responseId: string, token: string) =>
    request<PrescriptionRequest>(`/prescriptions/${prescriptionId}/questionnaire-response`, {
      method: 'PATCH',
      body: { questionnaireResponseId: responseId },
      token,
    }),

  submit: (prescriptionId: string, token: string, payment?: {
    paymentMethod: string; paymentMethodToken?: string
  }) =>
    request<PrescriptionRequest>(`/prescriptions/${prescriptionId}/submit`, {
      method: 'POST',
      body: { payment },
      token,
    }),

  cancel: (prescriptionId: string, reason: string, token: string) =>
    request<PrescriptionRequest>(`/prescriptions/${prescriptionId}/cancel`, {
      method: 'POST',
      body: { reason },
      token,
    }),
}

// ── Questionnaires ─────────────────────────────────────────────────────────

export const questionnairesService = {
  respond: (questionnaireId: string, answers: Record<string, unknown>, token: string) =>
    request<{ id: string; isEligible: boolean; ineligibilityReasons: string[] | null }>(
      `/questionnaires/${questionnaireId}/respond`,
      { method: 'POST', body: { answers }, token },
    ),
}

// ── Prescriber ─────────────────────────────────────────────────────────────

export const prescriberService = {
  getQueue: (token: string, status?: string, page = 1) =>
    request<PaginatedResponse<any>>(`/prescriber/queue?status=${status ?? 'SUBMITTED'}&page=${page}`, { token }),

  getDetail: (id: string, token: string) =>
    request<any>(`/prescriber/prescriptions/${id}`, { token }),

  claim: (id: string, token: string) =>
    request<any>(`/prescriber/prescriptions/${id}/claim`, { method: 'PATCH', body: {}, token }),

  approve: (id: string, data: any, token: string) =>
    request<any>(`/prescriber/prescriptions/${id}/approve`, { method: 'POST', body: data, token }),

  reject: (id: string, reason: string, token: string) =>
    request<any>(`/prescriber/prescriptions/${id}/reject`, {
      method: 'POST',
      body: { reason },
      token,
    }),

  requestInfo: (id: string, requestedInformation: string, token: string) =>
    request<any>(`/prescriber/prescriptions/${id}/request-info`, {
      method: 'POST',
      body: { requestedInformation },
      token,
    }),
}

// ── Dispenser ──────────────────────────────────────────────────────────────

export const dispenserService = {
  getQueue: (token: string, status?: string) =>
    request<PaginatedResponse<any>>(`/dispenser/queue?status=${status ?? 'APPROVED'}`, { token }),

  getDetail: (id: string, token: string) =>
    request<any>(`/dispenser/prescriptions/${id}`, { token }),

  claim: (id: string, token: string) =>
    request<any>(`/dispenser/prescriptions/${id}/claim`, { method: 'PATCH', body: {}, token }),

  updateTracking: (id: string, data: any, token: string) =>
    request<any>(`/dispenser/prescriptions/${id}/tracking`, { method: 'PATCH', body: data, token }),

  fulfil: (id: string, data: any, token: string) =>
    request<any>(`/dispenser/prescriptions/${id}/fulfil`, { method: 'POST', body: data, token }),
}

// ── Admin ──────────────────────────────────────────────────────────────────

export const adminService = {
  getUsers: (token: string, page = 1) =>
    request<PaginatedResponse<User>>(`/users?page=${page}`, { token }),

  getAuditLogs: (token: string, params?: { action?: string; from?: string; to?: string; page?: number }) => {
    const qs = new URLSearchParams()
    if (params?.action) qs.set('action', params.action)
    if (params?.from)   qs.set('from', params.from)
    if (params?.to)     qs.set('to', params.to)
    if (params?.page)   qs.set('page', String(params.page))
    return request<PaginatedResponse<AuditLog>>(`/audit?${qs}`, { token })
  },
}
