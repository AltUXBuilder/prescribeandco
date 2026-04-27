/**
 * Full lifecycle of a prescription request.
 * State machine — transitions are enforced in PrescriptionStateMachine service.
 *
 *  DRAFT ──► SUBMITTED ──► UNDER_REVIEW ──► APPROVED ──► DISPENSING ──► FULFILLED
 *                │                  │
 *                ▼                  ▼
 *           CANCELLED           REJECTED
 *                                   │
 *                                   ▼
 *                               EXPIRED  (time-based, set by cron)
 */
export enum PrescriptionStatus {
  DRAFT        = 'DRAFT',
  SUBMITTED    = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED     = 'APPROVED',
  REJECTED     = 'REJECTED',
  DISPENSING   = 'DISPENSING',
  FULFILLED    = 'FULFILLED',
  CANCELLED    = 'CANCELLED',
  EXPIRED      = 'EXPIRED',
}

/**
 * Eligibility status computed at submission time from questionnaire responses.
 *
 *  PASS  — all required questions answered, no disqualifying answers
 *  FLAG  — eligible but one or more answers warrant clinical attention
 *           (e.g. moderate risk factors that don't auto-disqualify)
 *  FAIL  — one or more disqualifying answers; prescriber must review
 *           before any approval is possible
 */
export enum EligibilityStatus {
  PASS = 'PASS',
  FLAG = 'FLAG',
  FAIL = 'FAIL',
}

/**
 * Document types accepted with a prescription request.
 */
export enum DocumentType {
  ID_PROOF          = 'ID_PROOF',
  NHS_EXEMPTION     = 'NHS_EXEMPTION',
  PRESCRIPTION_SCAN = 'PRESCRIPTION_SCAN',
  OTHER             = 'OTHER',
}

/**
 * Virus scan state for uploaded documents.
 */
export enum ScanStatus {
  PENDING  = 'PENDING',
  CLEAN    = 'CLEAN',
  INFECTED = 'INFECTED',
}
