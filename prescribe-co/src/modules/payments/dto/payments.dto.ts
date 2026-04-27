import { Expose } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PaymentMethod, PaymentStatus } from '../payment.enums';

// ── Authorise at submission ────────────────────────────────────────────────────

/**
 * Submitted by the customer as part of POST /prescriptions/:id/submit.
 * Contains the frontend SDK token — never a raw card number.
 * For NHS_VOUCHER and EXEMPT methods, paymentMethodToken may be omitted.
 */
export class AuthorisePaymentDto {
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  /**
   * Frontend SDK token (e.g. Stripe PaymentMethod ID: pm_xxx).
   * Required when paymentMethod = CARD.
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  paymentMethodToken?: string;
}

// ── Refund (Admin) ────────────────────────────────────────────────────────────

export class RefundPaymentDto {
  /**
   * Amount to refund in pence. Must be > 0 and ≤ netAmountPence.
   * If omitted, a full refund is issued.
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  amountPence?: number;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(500)
  reason: string;
}

// ── Webhook (internal — from payment provider) ────────────────────────────────

/**
 * Body sent by the payment provider webhook.
 * In production, additionally verify a provider signature header.
 */
export class PaymentWebhookDto {
  @IsString()
  @IsNotEmpty()
  eventType: string;

  @IsString()
  @IsNotEmpty()
  eventId: string;

  /** Provider payment intent ID */
  @IsString()
  @IsNotEmpty()
  providerPaymentId: string;

  /** Raw event payload — stored verbatim for audit */
  @IsOptional()
  payload?: Record<string, unknown>;
}

// ── Responses ─────────────────────────────────────────────────────────────────

export class PaymentResponseDto {
  @Expose() id: string;
  @Expose() prescriptionRequestId: string;
  @Expose() paymentMethod: PaymentMethod;
  @Expose() status: PaymentStatus;
  @Expose() amountPence: number;
  @Expose() refundedAmountPence: number;
  @Expose() currency: string;
  @Expose() providerPaymentId: string | null;
  @Expose() providerChargeId: string | null;
  @Expose() providerRefundId: string | null;
  @Expose() failureCode: string | null;
  @Expose() failureMessage: string | null;
  @Expose() authorisedAt: Date | null;
  @Expose() capturedAt: Date | null;
  @Expose() voidedAt: Date | null;
  @Expose() refundedAt: Date | null;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
  // rawProviderResponse, paymentMethodToken intentionally excluded
}
