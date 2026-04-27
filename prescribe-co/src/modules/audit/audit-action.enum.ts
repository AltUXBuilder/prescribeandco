/**
 * Exhaustive list of auditable actions.
 * Naming convention: DOMAIN_VERB  (e.g. PRESCRIPTION_APPROVED)
 *
 * These strings are stored verbatim in audit_logs.action.
 * Never rename a value once it's been written to production logs —
 * add a new one instead and keep the old value for backward-compat queries.
 */
export enum AuditAction {
  // ── Prescriptions ──────────────────────────────────────────────────────────
  PRESCRIPTION_DRAFT_CREATED       = 'PRESCRIPTION_DRAFT_CREATED',
  PRESCRIPTION_SUBMITTED           = 'PRESCRIPTION_SUBMITTED',
  PRESCRIPTION_TAKEN_UNDER_REVIEW  = 'PRESCRIPTION_TAKEN_UNDER_REVIEW',
  PRESCRIPTION_APPROVED            = 'PRESCRIPTION_APPROVED',
  PRESCRIPTION_REJECTED            = 'PRESCRIPTION_REJECTED',
  PRESCRIPTION_MORE_INFO_REQUESTED = 'PRESCRIPTION_MORE_INFO_REQUESTED',
  PRESCRIPTION_CANCELLED           = 'PRESCRIPTION_CANCELLED',
  PRESCRIPTION_EXPIRED             = 'PRESCRIPTION_EXPIRED',
  PRESCRIPTION_VIEWED              = 'PRESCRIPTION_VIEWED',
  PRESCRIPTION_QUESTIONNAIRE_ATTACHED = 'PRESCRIPTION_QUESTIONNAIRE_ATTACHED',

  // ── Questionnaire responses ─────────────────────────────────────────────────
  QUESTIONNAIRE_RESPONSE_SUBMITTED = 'QUESTIONNAIRE_RESPONSE_SUBMITTED',

  // ── Documents ──────────────────────────────────────────────────────────────
  DOCUMENT_UPLOADED                = 'DOCUMENT_UPLOADED',
  DOCUMENT_ACCESSED                = 'DOCUMENT_ACCESSED',
  DOCUMENT_DELETED                 = 'DOCUMENT_DELETED',
  DOCUMENT_SCAN_COMPLETED          = 'DOCUMENT_SCAN_COMPLETED',

  // ── Users ──────────────────────────────────────────────────────────────────
  USER_REGISTERED                  = 'USER_REGISTERED',
  USER_LOGIN                       = 'USER_LOGIN',
  USER_LOGOUT                      = 'USER_LOGOUT',
  USER_LOGOUT_ALL                  = 'USER_LOGOUT_ALL',
  USER_TOKEN_REFRESHED             = 'USER_TOKEN_REFRESHED',
  USER_ROLE_CHANGED                = 'USER_ROLE_CHANGED',
  USER_DEACTIVATED                 = 'USER_DEACTIVATED',
  USER_PASSWORD_CHANGED            = 'USER_PASSWORD_CHANGED',

  // ── Payments ───────────────────────────────────────────────────────────────
  PAYMENT_AUTHORISED               = 'PAYMENT_AUTHORISED',
  PAYMENT_CAPTURED                 = 'PAYMENT_CAPTURED',
  PAYMENT_FAILED                   = 'PAYMENT_FAILED',
  PAYMENT_VOIDED                   = 'PAYMENT_VOIDED',
  PAYMENT_REFUNDED                 = 'PAYMENT_REFUNDED',

  // ── Dispensing ─────────────────────────────────────────────────────────────
  PRESCRIPTION_DISPENSING_STARTED  = 'PRESCRIPTION_DISPENSING_STARTED',
  PRESCRIPTION_TRACKING_UPDATED    = 'PRESCRIPTION_TRACKING_UPDATED',
  PRESCRIPTION_FULFILLED           = 'PRESCRIPTION_FULFILLED',

  // ── Products ───────────────────────────────────────────────────────────────
  PRODUCT_CREATED                  = 'PRODUCT_CREATED',
  PRODUCT_UPDATED                  = 'PRODUCT_UPDATED',
  PRODUCT_ARCHIVED                 = 'PRODUCT_ARCHIVED',
  PRODUCT_QUESTIONNAIRE_ASSIGNED   = 'PRODUCT_QUESTIONNAIRE_ASSIGNED',
  PRODUCT_QUESTIONNAIRE_REMOVED    = 'PRODUCT_QUESTIONNAIRE_REMOVED',

  // ── Questionnaires (Admin) ──────────────────────────────────────────────────
  QUESTIONNAIRE_CREATED            = 'QUESTIONNAIRE_CREATED',
  QUESTIONNAIRE_UPDATED            = 'QUESTIONNAIRE_UPDATED',
  QUESTIONNAIRE_DEACTIVATED        = 'QUESTIONNAIRE_DEACTIVATED',
}
