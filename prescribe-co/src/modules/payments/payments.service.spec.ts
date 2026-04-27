import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { Payment } from './entities/payment.entity';
import { PaymentMethod, PaymentStatus } from './payment.enums';
import { PAYMENT_PROVIDER_TOKEN } from './provider/payment-provider.interface';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-action.enum';

// ── Factories ─────────────────────────────────────────────────────────────────

const PRESCRIPTION_ID = 'prescription-001';
const PAYMENT_ID = 'payment-001';

function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: PAYMENT_ID,
    prescriptionRequestId: PRESCRIPTION_ID,
    paymentMethod: PaymentMethod.CARD,
    status: PaymentStatus.AUTHORISED,
    amountPence: 1999,
    refundedAmountPence: 0,
    currency: 'GBP',
    paymentMethodToken: 'pm_test_token',
    providerPaymentId: 'mock_pi_abc123',
    providerChargeId: null,
    providerRefundId: null,
    rawProviderResponse: null,
    failureCode: null,
    failureMessage: null,
    idempotencyKey: 'idem-001',
    lastWebhookEventId: null,
    authorisedAt: new Date(),
    capturedAt: null,
    voidedAt: null,
    refundedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    prescriptionRequest: {} as any,
    isVoidable: true,
    isRefundable: false,
    netAmountPence: 1999,
    ...overrides,
  } as Payment;
}

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRepo = {
  create: jest.fn().mockImplementation((dto) => ({ ...dto, id: PAYMENT_ID })),
  save: jest.fn().mockImplementation(async (p) => p),
  findOne: jest.fn(),
};

const mockProvider = {
  authorise: jest.fn(),
  capture: jest.fn(),
  void: jest.fn(),
  refund: jest.fn(),
};

const mockAuditService = {
  log: jest.fn().mockResolvedValue(undefined),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getRepositoryToken(Payment), useValue: mockRepo },
        { provide: PAYMENT_PROVIDER_TOKEN, useValue: mockProvider },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    jest.clearAllMocks();
  });

  // ── authorise ──────────────────────────────────────────────────────────────

  describe('authorise', () => {
    it('creates AUTHORISED payment on provider success', async () => {
      mockRepo.findOne.mockResolvedValueOnce(null); // no existing payment
      mockProvider.authorise.mockResolvedValue({
        success: true,
        providerPaymentId: 'mock_pi_xyz',
        providerReference: 'mock_ch_xyz',
        rawResponse: {},
      });

      const result = await service.authorise(
        PRESCRIPTION_ID, 'customer-1', 'Paracetamol 500mg', 1999,
        { paymentMethod: PaymentMethod.CARD, paymentMethodToken: 'pm_test' },
      );

      expect(result.status).toBe(PaymentStatus.AUTHORISED);
      expect(result.providerPaymentId).toBe('mock_pi_xyz');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.PAYMENT_AUTHORISED }),
      );
    });

    it('creates FAILED payment when provider declines', async () => {
      mockRepo.findOne.mockResolvedValueOnce(null);
      mockProvider.authorise.mockResolvedValue({
        success: false,
        providerPaymentId: '',
        providerReference: null,
        errorCode: 'card_declined',
        errorMessage: 'Card declined',
        rawResponse: {},
      });

      const result = await service.authorise(
        PRESCRIPTION_ID, 'customer-1', 'Medicine', 999,
        { paymentMethod: PaymentMethod.CARD, paymentMethodToken: 'pm_fail' },
      );

      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(result.failureCode).toBe('card_declined');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.PAYMENT_FAILED }),
      );
    });

    it('bypasses provider for NHS_EXEMPT payment', async () => {
      mockRepo.findOne.mockResolvedValueOnce(null);

      const result = await service.authorise(
        PRESCRIPTION_ID, 'customer-1', 'Medicine', 0,
        { paymentMethod: PaymentMethod.EXEMPT },
      );

      expect(result.status).toBe(PaymentStatus.AUTHORISED);
      expect(mockProvider.authorise).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when active payment already exists', async () => {
      mockRepo.findOne.mockResolvedValueOnce(makePayment({ status: PaymentStatus.AUTHORISED }));

      await expect(
        service.authorise(PRESCRIPTION_ID, 'c', 'M', 999, {
          paymentMethod: PaymentMethod.CARD,
          paymentMethodToken: 'pm_x',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for CARD without paymentMethodToken', async () => {
      mockRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.authorise(PRESCRIPTION_ID, 'c', 'M', 999, {
          paymentMethod: PaymentMethod.CARD,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── captureForPrescription ─────────────────────────────────────────────────

  describe('captureForPrescription', () => {
    it('captures an AUTHORISED payment and logs audit', async () => {
      mockRepo.findOne.mockResolvedValue(makePayment());
      mockProvider.capture.mockResolvedValue({
        success: true,
        providerChargeId: 'mock_ch_captured',
        rawResponse: {},
      });

      const result = await service.captureForPrescription(PRESCRIPTION_ID);

      expect(result.status).toBe(PaymentStatus.CAPTURED);
      expect(result.providerChargeId).toBe('mock_ch_captured');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.PAYMENT_CAPTURED }),
      );
    });

    it('marks as FAILED if capture fails at the provider', async () => {
      mockRepo.findOne.mockResolvedValue(makePayment());
      mockProvider.capture.mockResolvedValue({
        success: false,
        providerChargeId: null,
        errorCode: 'insufficient_funds',
        errorMessage: 'Not enough funds',
        rawResponse: {},
      });

      const result = await service.captureForPrescription(PRESCRIPTION_ID);

      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(result.failureCode).toBe('insufficient_funds');
    });

    it('is idempotent — skips capture if already CAPTURED', async () => {
      mockRepo.findOne.mockResolvedValue(
        makePayment({ status: PaymentStatus.CAPTURED, capturedAt: new Date() }),
      );

      const result = await service.captureForPrescription(PRESCRIPTION_ID);

      expect(result.status).toBe(PaymentStatus.CAPTURED);
      expect(mockProvider.capture).not.toHaveBeenCalled();
    });
  });

  // ── voidForPrescription ────────────────────────────────────────────────────

  describe('voidForPrescription', () => {
    it('voids an AUTHORISED payment and logs audit', async () => {
      mockRepo.findOne.mockResolvedValue(makePayment());
      mockProvider.void.mockResolvedValue({ success: true, rawResponse: {} });

      const result = await service.voidForPrescription(PRESCRIPTION_ID, 'Rejected by prescriber');

      expect(result?.status).toBe(PaymentStatus.VOIDED);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.PAYMENT_VOIDED }),
      );
    });

    it('returns null when no payment exists (draft cancelled)', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await service.voidForPrescription(PRESCRIPTION_ID, 'Cancelled');
      expect(result).toBeNull();
    });

    it('throws BadRequestException if payment is already CAPTURED', async () => {
      mockRepo.findOne.mockResolvedValue(
        makePayment({ status: PaymentStatus.CAPTURED, isVoidable: false }),
      );

      await expect(
        service.voidForPrescription(PRESCRIPTION_ID, 'Rejected'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── refund ─────────────────────────────────────────────────────────────────

  describe('refund', () => {
    it('issues a full refund for a CAPTURED payment', async () => {
      const captured = makePayment({
        status: PaymentStatus.CAPTURED,
        providerChargeId: 'ch_captured',
        capturedAt: new Date(),
        isVoidable: false,
        isRefundable: true,
        netAmountPence: 1999,
      });
      mockRepo.findOne.mockResolvedValue(captured);
      mockProvider.refund.mockResolvedValue({
        success: true,
        providerRefundId: 'mock_re_001',
        rawResponse: {},
      });

      const result = await service.refund(PAYMENT_ID, {
        reason: 'Customer request — product not required',
      });

      expect(result.status).toBe(PaymentStatus.REFUNDED);
      expect(result.refundedAmountPence).toBe(1999);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.PAYMENT_REFUNDED }),
      );
    });

    it('throws BadRequestException when refund amount exceeds net amount', async () => {
      const captured = makePayment({
        status: PaymentStatus.CAPTURED,
        providerChargeId: 'ch_x',
        isRefundable: true,
        netAmountPence: 1999,
      });
      mockRepo.findOne.mockResolvedValue(captured);

      await expect(
        service.refund(PAYMENT_ID, { amountPence: 99999, reason: 'Too much' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── handleWebhook ──────────────────────────────────────────────────────────

  describe('handleWebhook', () => {
    it('processes payment.captured webhook and updates status', async () => {
      mockRepo.findOne.mockResolvedValue(makePayment());

      await service.handleWebhook({
        eventType: 'payment.captured',
        eventId: 'evt_001',
        providerPaymentId: 'mock_pi_abc123',
      });

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: PaymentStatus.CAPTURED }),
      );
    });

    it('is idempotent — duplicate events are skipped', async () => {
      mockRepo.findOne.mockResolvedValue(
        makePayment({ lastWebhookEventId: 'evt_already_processed' }),
      );

      await service.handleWebhook({
        eventType: 'payment.captured',
        eventId: 'evt_already_processed',
        providerPaymentId: 'mock_pi_abc123',
      });

      expect(mockRepo.save).not.toHaveBeenCalled();
    });
  });
});
