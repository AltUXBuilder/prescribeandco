import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
  AuthorisePaymentParams,
  AuthoriseResult,
  CapturePaymentParams,
  CaptureResult,
  IPaymentProvider,
  RefundPaymentParams,
  RefundResult,
  VoidPaymentParams,
  VoidResult,
} from './payment-provider.interface';

/**
 * StripePaymentProvider
 * ─────────────────────
 * Implements IPaymentProvider using Stripe's PaymentIntents API.
 *
 * Key Stripe configuration choices:
 *   capture_method: 'automatic'  — charge the card immediately at confirmation
 *   confirm: true                — confirms the intent in a single API call
 *   setup_future_usage omitted   — we don't store cards for reuse (PCI scope reduction)
 *
 * PCI compliance notes:
 *   - Raw card data never enters this service (handled by Stripe.js / Elements)
 *   - paymentMethodToken is a Stripe PaymentMethod ID (pm_xxx) from the frontend
 *   - We store only Stripe IDs (pi_xxx, ch_xxx, re_xxx), never card numbers
 */
@Injectable()
export class StripePaymentProvider implements IPaymentProvider {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(StripePaymentProvider.name);

  constructor(private readonly config: ConfigService) {
    this.stripe = new Stripe(config.get<string>('payments.stripeSecretKey')!, {
      apiVersion: '2024-04-10',
      typescript: true,
    });
  }

  // ── Authorise ──────────────────────────────────────────────────────────────

  async authorise(params: AuthorisePaymentParams): Promise<AuthoriseResult> {
    try {
      const intent = await this.stripe.paymentIntents.create(
        {
          amount: params.amountPence,
          currency: params.currency.toLowerCase(),
          payment_method: params.paymentMethodToken,
          capture_method: 'automatic', // charge immediately — no deferred capture needed
          confirm: true,
          metadata: {
            prescription_id: params.metadata.prescriptionId,
            customer_id:     params.metadata.customerId,
            product_name:    params.metadata.productName,
          },
          return_url: this.config.get<string>('payments.returnUrl'),
        },
        { idempotencyKey: `auth_${params.idempotencyKey}` },
      );

      const succeeded =
        intent.status === 'succeeded';

      return {
        success: succeeded,
        providerPaymentId: intent.id,
        providerReference: intent.latest_charge as string | null,
        rawResponse: intent as unknown as Record<string, unknown>,
        ...(!succeeded && {
          errorCode:    intent.last_payment_error?.code,
          errorMessage: intent.last_payment_error?.message,
        }),
      };
    } catch (err) {
      return this.handleStripeError('authorise', err);
    }
  }

  // ── Capture ────────────────────────────────────────────────────────────────

  async capture(params: CapturePaymentParams): Promise<CaptureResult> {
    try {
      const intent = await this.stripe.paymentIntents.capture(
        params.providerPaymentId,
        { amount_to_capture: params.amountPence },
        { idempotencyKey: `capture_${params.idempotencyKey}` },
      );

      return {
        success: intent.status === 'succeeded',
        providerChargeId: intent.latest_charge as string | null,
        rawResponse: intent as unknown as Record<string, unknown>,
        ...( intent.status !== 'succeeded' && {
          errorCode:    intent.last_payment_error?.code,
          errorMessage: intent.last_payment_error?.message,
        }),
      };
    } catch (err) {
      return { ...this.handleStripeError('capture', err), providerChargeId: null };
    }
  }

  // ── Void ───────────────────────────────────────────────────────────────────

  async void(params: VoidPaymentParams): Promise<VoidResult> {
    try {
      const intent = await this.stripe.paymentIntents.cancel(
        params.providerPaymentId,
        { cancellation_reason: 'abandoned' },
        { idempotencyKey: `void_${params.idempotencyKey}` },
      );

      return {
        success: intent.status === 'canceled',
        rawResponse: intent as unknown as Record<string, unknown>,
      };
    } catch (err) {
      return this.handleStripeError('void', err);
    }
  }

  // ── Refund ─────────────────────────────────────────────────────────────────

  async refund(params: RefundPaymentParams): Promise<RefundResult> {
    try {
      const refund = await this.stripe.refunds.create(
        {
          charge: params.providerChargeId,
          amount: params.amountPence,
          reason: 'requested_by_customer',
          metadata: { reason: params.reason },
        },
        { idempotencyKey: `refund_${params.idempotencyKey}` },
      );

      return {
        success: refund.status === 'succeeded',
        providerRefundId: refund.id,
        rawResponse: refund as unknown as Record<string, unknown>,
        ...(refund.status !== 'succeeded' && {
          errorCode:    refund.failure_reason ?? undefined,
          errorMessage: `Refund status: ${refund.status}`,
        }),
      };
    } catch (err) {
      return { ...this.handleStripeError('refund', err), providerRefundId: null };
    }
  }

  // ── Error normalisation ────────────────────────────────────────────────────

  private handleStripeError(
    operation: string,
    err: unknown,
  ): { success: false; errorCode: string; errorMessage: string; rawResponse: Record<string, unknown> } {
    if (err instanceof Stripe.errors.StripeError) {
      this.logger.warn(`Stripe ${operation} error: [${err.code}] ${err.message}`);
      return {
        success: false,
        errorCode: err.code ?? 'stripe_error',
        errorMessage: err.message,
        rawResponse: { type: err.type, code: err.code, message: err.message },
      };
    }
    this.logger.error(`Unexpected error during Stripe ${operation}`, err);
    return {
      success: false,
      errorCode: 'unexpected_error',
      errorMessage: 'An unexpected error occurred',
      rawResponse: { message: String(err) },
    };
  }
}
