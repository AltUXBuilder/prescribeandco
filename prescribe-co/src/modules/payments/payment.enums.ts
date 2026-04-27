/**
 * Lifecycle of a single payment record.
 *
 *  PENDING      → created, not yet sent to the payment provider
 *  AUTHORISED   → provider has reserved funds; not yet charged
 *  CAPTURED     → funds transferred; triggered by prescription approval
 *  VOIDED       → authorisation cancelled before capture (on rejection/cancellation)
 *  FAILED       → provider returned a failure at any stage
 *  REFUNDED     → full refund issued after capture
 *  PARTIALLY_REFUNDED → partial refund issued
 */
export enum PaymentStatus {
  PENDING             = 'PENDING',
  AUTHORISED          = 'AUTHORISED',
  CAPTURED            = 'CAPTURED',
  VOIDED              = 'VOIDED',
  FAILED              = 'FAILED',
  REFUNDED            = 'REFUNDED',
  PARTIALLY_REFUNDED  = 'PARTIALLY_REFUNDED',
}

/**
 * Payment methods accepted.
 * Stored on the payment record so refund / re-auth flows know the instrument type.
 */
export enum PaymentMethod {
  CARD         = 'CARD',
  NHS_VOUCHER  = 'NHS_VOUCHER',   // NHS prescription prepayment certificate
  EXEMPT       = 'EXEMPT',        // NHS exemption — zero-cost, no provider call needed
}
