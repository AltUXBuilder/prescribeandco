/**
 * PaymentProvider — abstract interface for payment operations.
 *
 * This is the only surface area that touches an external payment provider.
 * Swap implementations (Stripe, GoCardless, SumUp, mock) without changing
 * a single line of business logic.
 *
 * Design principles:
 *   - All methods are async and return a typed result object
 *   - Errors are returned as structured ProviderError objects, never thrown
 *   - Raw provider responses are captured in rawResponse for audit storage
 *   - PCI compliance: this layer never stores or logs card numbers
 */

export interface AuthorisePaymentParams {
  /** Amount in pence to authorise */
  amountPence: number;
  currency: string;
  /** Opaque token from the frontend SDK (e.g. Stripe PaymentMethod ID) */
  paymentMethodToken: string;
  /**
   * Idempotency key — safe to retry without double-charging.
   * Use the Payment entity UUID.
   */
  idempotencyKey: string;
  metadata: {
    prescriptionId: string;
    customerId: string;
    productName: string;
  };
}

export interface AuthoriseResult {
  success: boolean;
  /** Provider's unique ID for this payment intent / authorisation */
  providerPaymentId: string;
  /** Provider-specific reference for this authorisation (e.g. charge ID) */
  providerReference: string | null;
  errorCode?: string;
  errorMessage?: string;
  /** Full provider response for audit storage */
  rawResponse: Record<string, unknown>;
}

export interface CapturePaymentParams {
  providerPaymentId: string;
  amountPence: number;
  idempotencyKey: string;
}

export interface CaptureResult {
  success: boolean;
  providerChargeId: string | null;
  errorCode?: string;
  errorMessage?: string;
  rawResponse: Record<string, unknown>;
}

export interface VoidPaymentParams {
  providerPaymentId: string;
  reason: string;
  idempotencyKey: string;
}

export interface VoidResult {
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  rawResponse: Record<string, unknown>;
}

export interface RefundPaymentParams {
  providerChargeId: string;
  amountPence: number;
  reason: string;
  idempotencyKey: string;
}

export interface RefundResult {
  success: boolean;
  providerRefundId: string | null;
  errorCode?: string;
  errorMessage?: string;
  rawResponse: Record<string, unknown>;
}

/**
 * The contract. Inject this token, not concrete implementations.
 * Registration: { provide: PAYMENT_PROVIDER_TOKEN, useClass: StripePaymentProvider }
 */
export const PAYMENT_PROVIDER_TOKEN = 'PAYMENT_PROVIDER';

export interface IPaymentProvider {
  /**
   * Authorise (reserve) funds without capturing.
   * Called at prescription submission time.
   */
  authorise(params: AuthorisePaymentParams): Promise<AuthoriseResult>;

  /**
   * Capture a previously authorised payment.
   * Called when a prescriber approves the prescription.
   */
  capture(params: CapturePaymentParams): Promise<CaptureResult>;

  /**
   * Void an authorisation before capture.
   * Called when a prescription is rejected or cancelled.
   */
  void(params: VoidPaymentParams): Promise<VoidResult>;

  /**
   * Issue a full or partial refund after capture.
   * Called manually by an admin or automatically on certain cancellations.
   */
  refund(params: RefundPaymentParams): Promise<RefundResult>;
}
