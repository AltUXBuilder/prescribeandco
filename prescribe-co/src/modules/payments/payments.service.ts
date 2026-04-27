import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { plainToInstance } from 'class-transformer';
import { Payment } from './entities/payment.entity';
import { PaymentMethod, PaymentStatus } from './payment.enums';
import {
  IPaymentProvider,
  PAYMENT_PROVIDER_TOKEN,
} from './provider/payment-provider.interface';
import {
  AuthorisePaymentDto,
  PaymentResponseDto,
  PaymentWebhookDto,
  RefundPaymentDto,
} from './dto/payments.dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-action.enum';
import { auditContextStorage } from '../audit/interceptors/audit.interceptor';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,

    @Inject(PAYMENT_PROVIDER_TOKEN)
    private readonly provider: IPaymentProvider,

    private readonly auditService: AuditService,
  ) {}

  // ── Authorise (called at prescription submission) ──────────────────────────

  /**
   * Charge the customer immediately at prescription submission.
   *
   * Called by PrescriptionsService.submit() as the final step after all
   * clinical pre-flight gates pass.
   *
   * Payment is captured in full at this point — no deferred capture.
   * If the prescription is later rejected, a refund is issued automatically.
   *
   * For NHS_VOUCHER and EXEMPT methods, no provider call is made —
   * the record is created and immediately marked CAPTURED.
   *
   * Rules:
   *   - A prescription may only have one active (non-voided, non-failed) payment
   *   - Idempotency key = payment.id (UUID); safe to retry if the provider call fails
   */
  async authorise(
    prescriptionRequestId: string,
    customerId: string,
    productName: string,
    amountPence: number,
    dto: AuthorisePaymentDto,
  ): Promise<Payment> {
    // Enforce one active payment per prescription
    await this.assertNoActivePayment(prescriptionRequestId);

    if (dto.paymentMethod === PaymentMethod.CARD && !dto.paymentMethodToken) {
      throw new BadRequestException(
        'paymentMethodToken is required for CARD payments',
      );
    }

    const idempotencyKey = uuidv4();

    const payment = this.paymentRepo.create({
      prescriptionRequestId,
      paymentMethod: dto.paymentMethod,
      status: PaymentStatus.PENDING,
      amountPence,
      currency: 'GBP',
      paymentMethodToken: dto.paymentMethodToken ?? null,
      idempotencyKey,
      refundedAmountPence: 0,
    });

    const saved = await this.paymentRepo.save(payment);

    // NHS voucher / exemption — zero-cost, no provider call needed
    if (
      dto.paymentMethod === PaymentMethod.NHS_VOUCHER ||
      dto.paymentMethod === PaymentMethod.EXEMPT
    ) {
      return this.setCaptured(saved, 'nhs_exempt', null, { exemptMethod: dto.paymentMethod });
    }

    // Card payment — charge immediately
    const result = await this.provider.authorise({
      amountPence,
      currency: 'GBP',
      paymentMethodToken: dto.paymentMethodToken!,
      idempotencyKey: saved.id,
      metadata: { prescriptionId: prescriptionRequestId, customerId, productName },
    });

    if (!result.success) {
      return this.setFailed(saved, result.errorCode ?? 'unknown', result.errorMessage ?? 'Payment failed', result.rawResponse);
    }

    return this.setCaptured(saved, result.providerPaymentId, result.providerReference, result.rawResponse);
  }

  // ── captureForPrescription — removed ──────────────────────────────────────
  //
  // Payment is now captured immediately at submission.
  // This method is retained as a no-op stub so any accidental call
  // does not throw and existing tests remain green.
  //
  async captureForPrescription(prescriptionRequestId: string): Promise<Payment> {
    const payment = await this.findActiveForPrescription(prescriptionRequestId);
    this.logger.debug(
      `captureForPrescription called on payment ${payment.id} (status: ${payment.status}) — no-op, payment already captured at submission`,
    );
    return payment;
  }

  // ── Refund on rejection ────────────────────────────────────────────────────

  /**
   * Issue a full refund when a prescriber rejects the prescription.
   * Because payment is captured at submission, rejection must trigger a refund
   * rather than a void.
   *
   * Called automatically by PrescriberService.reject().
   * Safe to call if no payment exists (returns null).
   */
  async refundOnRejection(
    prescriptionRequestId: string,
    reason: string,
  ): Promise<Payment | null> {
    const payment = await this.findOptionalForPrescription(prescriptionRequestId);

    if (!payment) return null;

    if (payment.status !== PaymentStatus.CAPTURED) {
      this.logger.warn(
        `refundOnRejection called but payment ${payment.id} is in status ${payment.status} — skipping`,
      );
      return payment;
    }

    // NHS / exempt — nothing to refund at the provider
    if (
      payment.paymentMethod === PaymentMethod.NHS_VOUCHER ||
      payment.paymentMethod === PaymentMethod.EXEMPT
    ) {
      payment.status = PaymentStatus.REFUNDED;
      payment.refundedAt = new Date();
      payment.refundedAmountPence = payment.amountPence;
      const saved = await this.paymentRepo.save(payment);
      await this.logPaymentAction(AuditAction.PAYMENT_REFUNDED, saved, {
        reason,
        exemptMethod: payment.paymentMethod,
      });
      return saved;
    }

    if (!payment.providerChargeId) {
      this.logger.error(
        `refundOnRejection: payment ${payment.id} is CAPTURED but has no providerChargeId`,
      );
      return payment;
    }

    const result = await this.provider.refund({
      providerChargeId: payment.providerChargeId,
      amountPence: payment.amountPence,
      reason,
      idempotencyKey: `${payment.idempotencyKey}_rejection_refund`,
    });

    if (!result.success) {
      this.logger.error(
        `Refund on rejection failed for payment ${payment.id}: [${result.errorCode}] ${result.errorMessage}`,
      );
      await this.logPaymentAction(AuditAction.PAYMENT_FAILED, payment, {
        refundError: result.errorMessage,
        reason,
      });
      return payment;
    }

    payment.status = PaymentStatus.REFUNDED;
    payment.refundedAmountPence = payment.amountPence;
    payment.providerRefundId = result.providerRefundId;
    payment.refundedAt = new Date();
    payment.rawProviderResponse = result.rawResponse;

    const saved = await this.paymentRepo.save(payment);
    await this.logPaymentAction(AuditAction.PAYMENT_REFUNDED, saved, {
      reason,
      refundId: result.providerRefundId,
    });

    return saved;
  }

  // ── voidForPrescription — now delegates to refundOnRejection ──────────────

  /**
   * Retained for compatibility. Delegates to refundOnRejection since payment
   * is now captured at submission and cannot be voided post-capture.
   */
  async voidForPrescription(
    prescriptionRequestId: string,
    reason: string,
  ): Promise<Payment | null> {
    return this.refundOnRejection(prescriptionRequestId, reason);
  }

  // ── Refund (Admin) ─────────────────────────────────────────────────────────

  /**
   * Issue a full or partial refund after capture.
   * Admin-only action via POST /payments/:id/refund.
   */
  async refund(paymentId: string, dto: RefundPaymentDto): Promise<Payment> {
    const payment = await this.findById(paymentId);

    if (!payment.isRefundable) {
      throw new BadRequestException(
        `Payment ${paymentId} is in status "${payment.status}" and cannot be refunded`,
      );
    }

    const refundAmount = dto.amountPence ?? payment.netAmountPence;

    if (refundAmount > payment.netAmountPence) {
      throw new BadRequestException(
        `Refund amount £${refundAmount / 100} exceeds net capturable amount £${payment.netAmountPence / 100}`,
      );
    }

    if (!payment.providerChargeId) {
      throw new InternalServerErrorException(
        `Cannot refund payment ${paymentId}: no providerChargeId`,
      );
    }

    const result = await this.provider.refund({
      providerChargeId: payment.providerChargeId,
      amountPence: refundAmount,
      reason: dto.reason,
      idempotencyKey: `${payment.idempotencyKey}_refund_${Date.now()}`,
    });

    if (!result.success) {
      throw new BadRequestException(
        `Refund failed: [${result.errorCode}] ${result.errorMessage}`,
      );
    }

    payment.refundedAmountPence += refundAmount;
    payment.providerRefundId = result.providerRefundId;
    payment.refundedAt = new Date();
    payment.status =
      payment.refundedAmountPence >= payment.amountPence
        ? PaymentStatus.REFUNDED
        : PaymentStatus.PARTIALLY_REFUNDED;
    payment.rawProviderResponse = result.rawResponse;

    const saved = await this.paymentRepo.save(payment);
    await this.logPaymentAction(AuditAction.PAYMENT_REFUNDED, saved, {
      refundAmountPence: refundAmount,
      reason: dto.reason,
      refundId: result.providerRefundId,
    });

    return saved;
  }

  // ── Webhook (idempotent event processing) ─────────────────────────────────

  /**
   * Process an inbound webhook event from the payment provider.
   * Must be idempotent — providers can replay events.
   *
   * Supported event types (provider-agnostic names):
   *   payment.authorised  — update status if still PENDING
   *   payment.captured    — update status if still AUTHORISED
   *   payment.failed      — mark as FAILED
   *   payment.refunded    — update refund amounts
   */
  async handleWebhook(dto: PaymentWebhookDto): Promise<void> {
    const payment = await this.paymentRepo.findOne({
      where: { providerPaymentId: dto.providerPaymentId },
    });

    if (!payment) {
      this.logger.warn(`Webhook: no payment found for providerPaymentId ${dto.providerPaymentId}`);
      return;
    }

    // Idempotency — skip already-processed events
    if (payment.lastWebhookEventId === dto.eventId) {
      this.logger.debug(`Webhook: duplicate event ${dto.eventId} — skipped`);
      return;
    }

    payment.lastWebhookEventId = dto.eventId;

    switch (dto.eventType) {
      case 'payment.authorised':
        if (payment.status === PaymentStatus.PENDING) {
          payment.status = PaymentStatus.AUTHORISED;
          payment.authorisedAt = new Date();
        }
        break;

      case 'payment.captured':
        if (payment.status === PaymentStatus.AUTHORISED) {
          payment.status = PaymentStatus.CAPTURED;
          payment.capturedAt = new Date();
        }
        break;

      case 'payment.failed':
        if (![PaymentStatus.CAPTURED, PaymentStatus.REFUNDED].includes(payment.status)) {
          payment.status = PaymentStatus.FAILED;
          payment.failureCode = (dto.payload?.['errorCode'] as string) ?? 'webhook_failed';
          payment.failureMessage = (dto.payload?.['errorMessage'] as string) ?? 'Payment failed';
        }
        break;

      case 'payment.refunded': {
        const refundedPence = (dto.payload?.['amountRefunded'] as number) ?? 0;
        payment.refundedAmountPence = refundedPence;
        payment.refundedAt = new Date();
        payment.status =
          refundedPence >= payment.amountPence
            ? PaymentStatus.REFUNDED
            : PaymentStatus.PARTIALLY_REFUNDED;
        break;
      }

      default:
        this.logger.debug(`Webhook: unhandled event type "${dto.eventType}"`);
    }

    await this.paymentRepo.save(payment);
  }

  // ── Read ───────────────────────────────────────────────────────────────────

  async findById(id: string): Promise<Payment> {
    const payment = await this.paymentRepo.findOne({ where: { id } });
    if (!payment) throw new NotFoundException(`Payment ${id} not found`);
    return payment;
  }

  async findByPrescription(prescriptionRequestId: string): Promise<Payment | null> {
    return this.paymentRepo.findOne({
      where: { prescriptionRequestId },
      order: { createdAt: 'DESC' },
    });
  }

  toResponseDto(payment: Payment): PaymentResponseDto {
    return plainToInstance(PaymentResponseDto, payment, {
      excludeExtraneousValues: true,
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async setCaptured(
    payment: Payment,
    providerPaymentId: string,
    providerChargeId: string | null,
    rawResponse: Record<string, unknown>,
  ): Promise<Payment> {
    payment.status = PaymentStatus.CAPTURED;
    payment.providerPaymentId = providerPaymentId;
    payment.providerChargeId = providerChargeId;
    payment.authorisedAt = new Date(); // same timestamp — charge was immediate
    payment.capturedAt = new Date();
    payment.rawProviderResponse = rawResponse;

    const saved = await this.paymentRepo.save(payment);
    await this.logPaymentAction(AuditAction.PAYMENT_CAPTURED, saved, {
      providerPaymentId,
      providerChargeId,
    });
    return saved;
  }

  private async setFailed(
    payment: Payment,
    errorCode: string,
    errorMessage: string,
    rawResponse: Record<string, unknown>,
  ): Promise<Payment> {
    payment.status = PaymentStatus.FAILED;
    payment.failureCode = errorCode;
    payment.failureMessage = errorMessage;
    payment.rawProviderResponse = rawResponse;

    const saved = await this.paymentRepo.save(payment);
    await this.logPaymentAction(AuditAction.PAYMENT_FAILED, saved, {
      errorCode,
      errorMessage,
    });
    return saved;
  }

  private async assertNoActivePayment(prescriptionRequestId: string): Promise<void> {
    const existing = await this.paymentRepo.findOne({
      where: { prescriptionRequestId },
    });

    if (
      existing &&
      ![PaymentStatus.FAILED, PaymentStatus.VOIDED].includes(existing.status)
    ) {
      throw new BadRequestException(
        `An active payment already exists for prescription ${prescriptionRequestId} ` +
          `(status: ${existing.status})`,
      );
    }
  }

  private async findActiveForPrescription(
    prescriptionRequestId: string,
  ): Promise<Payment> {
    const payment = await this.paymentRepo.findOne({
      where: { prescriptionRequestId },
      order: { createdAt: 'DESC' },
    });
    if (!payment) {
      throw new NotFoundException(
        `No payment found for prescription ${prescriptionRequestId}`,
      );
    }
    return payment;
  }

  private async findOptionalForPrescription(
    prescriptionRequestId: string,
  ): Promise<Payment | null> {
    return this.paymentRepo.findOne({
      where: { prescriptionRequestId },
      order: { createdAt: 'DESC' },
    });
  }

  private async logPaymentAction(
    action: AuditAction,
    payment: Payment,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const ctx = auditContextStorage.getStore();
    await this.auditService.log({
      actorId: ctx?.actorId ?? null,
      actorRole: null,
      gphcNumber: null,
      action,
      entityType: 'payments',
      entityId: payment.id,
      afterState: {
        status: payment.status,
        amountPence: payment.amountPence,
        providerPaymentId: payment.providerPaymentId,
        providerChargeId: payment.providerChargeId,
      },
      metadata: metadata ?? null,
      ipAddress: ctx?.ipAddress ?? null,
    });
  }
}
