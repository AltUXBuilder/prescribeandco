import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Expose } from 'class-transformer';
import { PaymentMethod, PaymentStatus } from '../payment.enums';
import { PrescriptionRequest } from '../../prescriptions/entities/prescription-request.entity';

/**
 * Payment record — one row per prescription request.
 * A prescription may have at most one non-voided payment row; this is
 * enforced by the service layer, not a DB constraint (to allow retries).
 *
 * PCI considerations:
 *   - Raw card data is never stored here
 *   - paymentMethodToken is the frontend SDK token (e.g. Stripe pm_xxx)
 *     used only to initiate authorisation; it is not re-usable and not a PAN
 *   - providerPaymentId, providerChargeId, providerRefundId are provider-side IDs
 *   - rawProviderResponse stores the full provider payload for audit — it must
 *     be excluded from any API response (no @Expose())
 */
@Entity('payments')
export class Payment {
  @Expose()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Expose()
  @Index()
  @Column({ name: 'prescription_request_id', type: 'char', length: 36 })
  prescriptionRequestId: string;

  @Expose()
  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.CARD,
  })
  paymentMethod: PaymentMethod;

  @Expose()
  @Index()
  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  /**
   * Amount in pence — captured from product.pricePence at authorisation time.
   * Stored here so the captured amount is immutable even if the product price changes.
   */
  @Expose()
  @Column({ name: 'amount_pence', type: 'int', unsigned: true })
  amountPence: number;

  @Expose()
  @Column({ name: 'refunded_amount_pence', type: 'int', unsigned: true, default: 0 })
  refundedAmountPence: number;

  @Expose()
  @Column({ type: 'char', length: 3, default: 'GBP' })
  currency: string;

  // ── Provider identifiers ───────────────────────────────────────────────────

  /**
   * The opaque frontend SDK token submitted by the customer.
   * Used once to initiate the authorisation, then irrelevant.
   * Stored for dispute resolution only; stripped from all API responses.
   */
  @Column({ name: 'payment_method_token', type: 'varchar', length: 255, nullable: true })
  paymentMethodToken: string | null;

  /**
   * Provider's payment intent / authorisation ID (e.g. Stripe pi_xxx).
   * Required to capture or void.
   */
  @Expose()
  @Index({ unique: true, where: 'provider_payment_id IS NOT NULL' })
  @Column({ name: 'provider_payment_id', type: 'varchar', length: 100, nullable: true })
  providerPaymentId: string | null;

  /**
   * Provider's charge ID — populated after successful capture (e.g. Stripe ch_xxx).
   * Required for refunds.
   */
  @Expose()
  @Column({ name: 'provider_charge_id', type: 'varchar', length: 100, nullable: true })
  providerChargeId: string | null;

  /** Provider's refund ID — populated after a refund is issued (e.g. Stripe re_xxx). */
  @Expose()
  @Column({ name: 'provider_refund_id', type: 'varchar', length: 100, nullable: true })
  providerRefundId: string | null;

  /**
   * Full raw response from the payment provider at each operation.
   * Stored for audit, dispute resolution, and debugging.
   * NEVER included in API responses — contains provider-internal data.
   */
  @Column({ name: 'raw_provider_response', type: 'json', nullable: true })
  rawProviderResponse: Record<string, unknown> | null;

  /** Provider error code when status = FAILED */
  @Expose()
  @Column({ name: 'failure_code', type: 'varchar', length: 100, nullable: true })
  failureCode: string | null;

  @Expose()
  @Column({ name: 'failure_message', type: 'varchar', length: 500, nullable: true })
  failureMessage: string | null;

  /**
   * Idempotency key used for provider calls.
   * Stored so we can detect and recover from duplicate webhook events.
   */
  @Column({ name: 'idempotency_key', type: 'varchar', length: 36, unique: true })
  idempotencyKey: string;

  /**
   * Provider webhook event ID — used to deduplicate incoming webhook events.
   * Updated each time a webhook is processed.
   */
  @Column({ name: 'last_webhook_event_id', type: 'varchar', length: 100, nullable: true })
  lastWebhookEventId: string | null;

  // ── Lifecycle timestamps ───────────────────────────────────────────────────

  @Expose()
  @Column({ name: 'authorised_at', type: 'timestamp', nullable: true })
  authorisedAt: Date | null;

  @Expose()
  @Column({ name: 'captured_at', type: 'timestamp', nullable: true })
  capturedAt: Date | null;

  @Expose()
  @Column({ name: 'voided_at', type: 'timestamp', nullable: true })
  voidedAt: Date | null;

  @Expose()
  @Column({ name: 'refunded_at', type: 'timestamp', nullable: true })
  refundedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // ── Relations ──────────────────────────────────────────────────────────────

  @ManyToOne(() => PrescriptionRequest, { eager: false })
  @JoinColumn({ name: 'prescription_request_id' })
  prescriptionRequest: PrescriptionRequest;

  // ── Computed helpers ───────────────────────────────────────────────────────

  get isVoidable(): boolean {
    return this.status === PaymentStatus.AUTHORISED;
  }

  get isRefundable(): boolean {
    return (
      this.status === PaymentStatus.CAPTURED ||
      this.status === PaymentStatus.PARTIALLY_REFUNDED
    );
  }

  get netAmountPence(): number {
    return this.amountPence - this.refundedAmountPence;
  }
}
