import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DispenserService } from './dispenser.service';
import { PrescriptionRequest } from '../prescriptions/entities/prescription-request.entity';
import { PrescriptionStateMachine } from '../prescriptions/services/prescription-state-machine.service';
import { AuditService } from '../audit/audit.service';
import { PrescriptionStatus, EligibilityStatus } from '../../common/enums/prescription.enums';
import { AuditAction } from '../audit/audit-action.enum';

// ── Factories ─────────────────────────────────────────────────────────────────

const DISPENSER_ID  = 'dispenser-uuid-001';
const OTHER_DISPENSER = 'dispenser-uuid-002';
const PRESCRIPTION_ID = 'prescription-uuid-001';

function makePrescription(overrides: Partial<PrescriptionRequest> = {}): PrescriptionRequest {
  const future = new Date();
  future.setMonth(future.getMonth() + 3);

  return {
    id: PRESCRIPTION_ID,
    customerId: 'customer-001',
    productId: 'product-001',
    prescriberId: 'prescriber-001',
    dispenserId: null,
    status: PrescriptionStatus.APPROVED,
    eligibilityStatus: EligibilityStatus.PASS,
    eligibilityNotes: null,
    questionnaireResponseId: null,
    deliveryAddressId: 'address-001',
    customerNote: null,
    prescriberNote: null,
    rejectionReason: null,
    dosageInstructions: 'Take one tablet twice daily',
    quantityDispensed: 28,
    prescribedDate: new Date(),
    expiryDate: future,
    approvedAt: new Date(),
    submittedAt: new Date(),
    reviewedAt: new Date(),
    dispensingStartedAt: null,
    fulfilledAt: null,
    cancelledAt: null,
    trackingNumber: null,
    courierName: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    customer: { id: 'customer-001', firstName: 'Jane', lastName: 'Smith', nhsNumber: '1234567890' } as any,
    product: { id: 'product-001', name: 'Test Medicine', medicineType: 'POM', bnfCode: null } as any,
    questionnaireResponse: null,
    documents: [],
    isEditable: false,
    isCancellable: false,
    ...overrides,
  };
}

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRepo = {
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  save: jest.fn(),
};

const mockAuditService = {
  log: jest.fn().mockResolvedValue(undefined),
};

const stateMachine = new PrescriptionStateMachine();

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DispenserService', () => {
  let service: DispenserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DispenserService,
        { provide: getRepositoryToken(PrescriptionRequest), useValue: mockRepo },
        { provide: PrescriptionStateMachine, useValue: stateMachine },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<DispenserService>(DispenserService);
    jest.clearAllMocks();
  });

  // ── getQueue ───────────────────────────────────────────────────────────────

  describe('getQueue', () => {
    it('returns paginated APPROVED prescriptions by default', async () => {
      mockRepo.findAndCount.mockResolvedValue([[makePrescription()], 1]);

      const result = await service.getQueue(DISPENSER_ID, { page: 1, limit: 20 });

      expect(result.total).toBe(1);
      expect(mockRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: PrescriptionStatus.APPROVED }),
        }),
      );
    });

    it('scopes DISPENSING queue to this dispenser only', async () => {
      mockRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.getQueue(DISPENSER_ID, {
        status: PrescriptionStatus.DISPENSING,
        page: 1,
        limit: 20,
      });

      expect(mockRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: PrescriptionStatus.DISPENSING,
            dispenserId: DISPENSER_ID,
          }),
        }),
      );
    });
  });

  // ── claim ──────────────────────────────────────────────────────────────────

  describe('claim', () => {
    it('transitions APPROVED to DISPENSING and logs audit', async () => {
      const prescription = makePrescription({ status: PrescriptionStatus.APPROVED });
      mockRepo.findOne.mockResolvedValue(prescription);
      mockRepo.save.mockImplementation(async (p) => ({
        ...p,
        status: PrescriptionStatus.DISPENSING,
        dispenserId: DISPENSER_ID,
        dispensingStartedAt: new Date(),
      }));

      const result = await service.claim(PRESCRIPTION_ID, DISPENSER_ID, {});

      expect(result.status).toBe(PrescriptionStatus.DISPENSING);
      expect(result.dispenserId).toBe(DISPENSER_ID);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: DISPENSER_ID,
          actorRole: 'DISPENSER',
          action: AuditAction.PRESCRIPTION_DISPENSING_STARTED,
          entityId: PRESCRIPTION_ID,
        }),
      );
    });

    it('is idempotent — re-claiming own DISPENSING prescription is a no-op', async () => {
      const inProgress = makePrescription({
        status: PrescriptionStatus.DISPENSING,
        dispenserId: DISPENSER_ID,
      });
      mockRepo.findOne.mockResolvedValue(inProgress);

      const result = await service.claim(PRESCRIPTION_ID, DISPENSER_ID, {});

      expect(result.status).toBe(PrescriptionStatus.DISPENSING);
      expect(mockRepo.save).not.toHaveBeenCalled(); // no DB write needed
    });

    it('throws ForbiddenException if DISPENSING is claimed by another dispenser', async () => {
      mockRepo.findOne.mockResolvedValue(
        makePrescription({ status: PrescriptionStatus.DISPENSING, dispenserId: OTHER_DISPENSER }),
      );

      await expect(service.claim(PRESCRIPTION_ID, DISPENSER_ID, {})).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException for invalid state (e.g. FULFILLED)', async () => {
      mockRepo.findOne.mockResolvedValue(
        makePrescription({ status: PrescriptionStatus.FULFILLED }),
      );

      await expect(service.claim(PRESCRIPTION_ID, DISPENSER_ID, {})).rejects.toThrow(BadRequestException);
    });
  });

  // ── updateTracking ─────────────────────────────────────────────────────────

  describe('updateTracking', () => {
    it('updates tracking fields and logs audit', async () => {
      mockRepo.findOne.mockResolvedValue(
        makePrescription({ status: PrescriptionStatus.DISPENSING, dispenserId: DISPENSER_ID }),
      );
      mockRepo.save.mockImplementation(async (p) => ({
        ...p,
        trackingNumber: 'RM123456789GB',
        courierName: 'Royal Mail',
      }));

      const result = await service.updateTracking(PRESCRIPTION_ID, DISPENSER_ID, {
        trackingNumber: 'RM123456789GB',
        courierName: 'Royal Mail',
      });

      expect(result.trackingNumber).toBe('RM123456789GB');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.PRESCRIPTION_TRACKING_UPDATED }),
      );
    });

    it('throws BadRequestException if not DISPENSING', async () => {
      mockRepo.findOne.mockResolvedValue(makePrescription({ status: PrescriptionStatus.APPROVED }));

      await expect(
        service.updateTracking(PRESCRIPTION_ID, DISPENSER_ID, { trackingNumber: 'X' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException if owned by another dispenser', async () => {
      mockRepo.findOne.mockResolvedValue(
        makePrescription({ status: PrescriptionStatus.DISPENSING, dispenserId: OTHER_DISPENSER }),
      );

      await expect(
        service.updateTracking(PRESCRIPTION_ID, DISPENSER_ID, { trackingNumber: 'X' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── markFulfilled ──────────────────────────────────────────────────────────

  describe('markFulfilled', () => {
    const validDto = {
      trackingNumber: 'RM123456789GB',
      courierName: 'Royal Mail',
    };

    it('transitions DISPENSING to FULFILLED with tracking info and logs audit', async () => {
      mockRepo.findOne.mockResolvedValue(
        makePrescription({ status: PrescriptionStatus.DISPENSING, dispenserId: DISPENSER_ID }),
      );
      mockRepo.save.mockImplementation(async (p) => ({
        ...p,
        status: PrescriptionStatus.FULFILLED,
        fulfilledAt: new Date(),
        trackingNumber: validDto.trackingNumber,
        courierName: validDto.courierName,
      }));

      const result = await service.markFulfilled(PRESCRIPTION_ID, DISPENSER_ID, validDto);

      expect(result.status).toBe(PrescriptionStatus.FULFILLED);
      expect(result.trackingNumber).toBe('RM123456789GB');
      expect(result.fulfilledAt).toBeDefined();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.PRESCRIPTION_FULFILLED,
          metadata: expect.objectContaining({ trackingNumber: 'RM123456789GB' }),
        }),
      );
    });

    it('throws BadRequestException if prescription is expired', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      mockRepo.findOne.mockResolvedValue(
        makePrescription({
          status: PrescriptionStatus.DISPENSING,
          dispenserId: DISPENSER_ID,
          expiryDate: yesterday,
        }),
      );

      await expect(
        service.markFulfilled(PRESCRIPTION_ID, DISPENSER_ID, validDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException if owned by another dispenser', async () => {
      mockRepo.findOne.mockResolvedValue(
        makePrescription({ status: PrescriptionStatus.DISPENSING, dispenserId: OTHER_DISPENSER }),
      );

      await expect(
        service.markFulfilled(PRESCRIPTION_ID, DISPENSER_ID, validDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if status is not DISPENSING', async () => {
      mockRepo.findOne.mockResolvedValue(
        makePrescription({ status: PrescriptionStatus.APPROVED }),
      );

      await expect(
        service.markFulfilled(PRESCRIPTION_ID, DISPENSER_ID, validDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── getDetail ──────────────────────────────────────────────────────────────

  describe('getDetail', () => {
    it('returns detail for APPROVED prescription', async () => {
      mockRepo.findOne.mockResolvedValue(makePrescription({ status: PrescriptionStatus.APPROVED }));
      const result = await service.getDetail(PRESCRIPTION_ID, DISPENSER_ID);
      expect(result.id).toBe(PRESCRIPTION_ID);
    });

    it('returns detail for FULFILLED prescription', async () => {
      mockRepo.findOne.mockResolvedValue(makePrescription({
        status: PrescriptionStatus.FULFILLED,
        dispenserId: DISPENSER_ID,
      }));
      const result = await service.getDetail(PRESCRIPTION_ID, DISPENSER_ID);
      expect(result.status).toBe(PrescriptionStatus.FULFILLED);
    });

    it('throws NotFoundException for SUBMITTED prescription (not visible to dispenser)', async () => {
      mockRepo.findOne.mockResolvedValue(makePrescription({ status: PrescriptionStatus.SUBMITTED }));
      await expect(service.getDetail(PRESCRIPTION_ID, DISPENSER_ID)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when DISPENSING prescription belongs to another dispenser', async () => {
      mockRepo.findOne.mockResolvedValue(makePrescription({
        status: PrescriptionStatus.DISPENSING,
        dispenserId: OTHER_DISPENSER,
      }));
      await expect(service.getDetail(PRESCRIPTION_ID, DISPENSER_ID)).rejects.toThrow(ForbiddenException);
    });
  });
});
