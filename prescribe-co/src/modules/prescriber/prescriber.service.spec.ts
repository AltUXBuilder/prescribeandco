import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PrescriberService } from './prescriber.service';
import { PrescriptionRequest } from '../prescriptions/entities/prescription-request.entity';
import { PrescriberProfile } from '../users/entities/prescriber-profile.entity';
import { PrescriptionStateMachine } from '../prescriptions/services/prescription-state-machine.service';
import { AuditService } from '../audit/audit.service';
import { DocumentsService } from '../documents/documents.service';
import {
  EligibilityStatus,
  PrescriptionStatus,
} from '../../common/enums/prescription.enums';
import { AuditAction } from '../audit/audit-action.enum';

// ── Factories ─────────────────────────────────────────────────────────────────

const PRESCRIBER_ID = 'prescriber-uuid-001';
const PRESCRIPTION_ID = 'prescription-uuid-001';
const GPHC = '1234567';

function makeProfile(overrides: Partial<PrescriberProfile> = {}): PrescriberProfile {
  return {
    id: 'profile-001',
    userId: PRESCRIBER_ID,
    gphcNumber: GPHC,
    gphcVerified: true,
    gphcVerifiedAt: new Date(),
    specialisation: null,
    organisation: null,
    indemnityRef: null,
    indemnityExpiry: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {} as any,
    ...overrides,
  };
}

function makePrescription(overrides: Partial<PrescriptionRequest> = {}): PrescriptionRequest {
  return {
    id: PRESCRIPTION_ID,
    customerId: 'customer-001',
    productId: 'product-001',
    prescriberId: PRESCRIBER_ID,
    dispenserId: null,
    status: PrescriptionStatus.UNDER_REVIEW,
    eligibilityStatus: EligibilityStatus.PASS,
    eligibilityNotes: null,
    questionnaireResponseId: null,
    deliveryAddressId: 'address-001',
    customerNote: null,
    prescriberNote: null,
    rejectionReason: null,
    dosageInstructions: null,
    quantityDispensed: null,
    expiryDate: null,
    prescribedDate: null,
    submittedAt: new Date(),
    reviewedAt: new Date(),
    approvedAt: null,
    cancelledAt: null,
    dispensingStartedAt: null,
    fulfilledAt: null,
    trackingNumber: null,
    courierName: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    customer: { id: 'customer-001', firstName: 'Jane', lastName: 'Smith', dateOfBirth: null, nhsNumber: null } as any,
    product: { id: 'product-001', name: 'Test Medicine', medicineType: 'POM', bnfCode: null, requiresPrescription: true } as any,
    questionnaireResponse: null,
    documents: [],
    isEditable: false,
    isCancellable: false,
    ...overrides,
  };
}

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockPrescriptionRepo = {
  findOne: jest.fn(),
  find: jest.fn(),
  findAndCount: jest.fn(),
  count: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
};

const mockProfileRepo = {
  findOne: jest.fn(),
};

const mockAuditService = {
  logPrescriberAction: jest.fn().mockResolvedValue(undefined),
  getEntityHistory: jest.fn().mockResolvedValue([]),
};

const mockDocumentsService = {
  enrichWithPresignedUrls: jest.fn().mockResolvedValue([]),
};

const mockStateMachine = new PrescriptionStateMachine();

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PrescriberService', () => {
  let service: PrescriberService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrescriberService,
        { provide: getRepositoryToken(PrescriptionRequest), useValue: mockPrescriptionRepo },
        { provide: getRepositoryToken(PrescriberProfile),  useValue: mockProfileRepo },
        { provide: PrescriptionStateMachine, useValue: mockStateMachine },
        { provide: AuditService, useValue: mockAuditService },
        { provide: DocumentsService, useValue: mockDocumentsService },
      ],
    }).compile();

    service = module.get<PrescriberService>(PrescriberService);
    jest.clearAllMocks();
  });

  // ── approve ────────────────────────────────────────────────────────────────

  describe('approve', () => {
    const validDto = {
      dosageInstructions: 'Take one tablet twice daily',
      quantityToDispense: 28,
      expiryDate: (() => {
        const d = new Date();
        d.setMonth(d.getMonth() + 3);
        return d.toISOString().split('T')[0];
      })(),
    };

    it('approves successfully and logs audit event', async () => {
      const prescription = makePrescription();
      mockPrescriptionRepo.findOne.mockResolvedValue(prescription);
      mockPrescriptionRepo.save.mockImplementation(async (p) => ({ ...p, status: PrescriptionStatus.APPROVED, approvedAt: new Date() }));

      const result = await service.approve(PRESCRIPTION_ID, PRESCRIBER_ID, makeProfile(), validDto);

      expect(result.status).toBe(PrescriptionStatus.APPROVED);
      expect(mockAuditService.logPrescriberAction).toHaveBeenCalledWith(
        expect.objectContaining({
          prescriberId: PRESCRIBER_ID,
          gphcNumber: GPHC,
          action: AuditAction.PRESCRIPTION_APPROVED,
          prescriptionId: PRESCRIPTION_ID,
        }),
      );
    });

    it('rejects expiry date in the past', async () => {
      mockPrescriptionRepo.findOne.mockResolvedValue(makePrescription());
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      await expect(
        service.approve(PRESCRIPTION_ID, PRESCRIBER_ID, makeProfile(), {
          ...validDto,
          expiryDate: pastDate.toISOString().split('T')[0],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects expiry date beyond 6 months', async () => {
      mockPrescriptionRepo.findOne.mockResolvedValue(makePrescription());
      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 2);

      await expect(
        service.approve(PRESCRIPTION_ID, PRESCRIBER_ID, makeProfile(), {
          ...validDto,
          expiryDate: farFuture.toISOString().split('T')[0],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('requires override justification for FAIL eligibility', async () => {
      const failPrescription = makePrescription({ eligibilityStatus: EligibilityStatus.FAIL });
      mockPrescriptionRepo.findOne.mockResolvedValue(failPrescription);

      await expect(
        service.approve(PRESCRIPTION_ID, PRESCRIBER_ID, makeProfile(), validDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows FAIL eligibility approval with justification', async () => {
      const failPrescription = makePrescription({ eligibilityStatus: EligibilityStatus.FAIL });
      mockPrescriptionRepo.findOne.mockResolvedValue(failPrescription);
      mockPrescriptionRepo.save.mockImplementation(async (p) => ({ ...p }));

      await expect(
        service.approve(PRESCRIPTION_ID, PRESCRIBER_ID, makeProfile(), {
          ...validDto,
          eligibilityOverrideJustification: 'Clinical assessment confirms suitability despite flag.',
        }),
      ).resolves.toBeDefined();
    });

    it('throws ForbiddenException when prescriber does not own the prescription', async () => {
      const otherPrescriber = makePrescription({ prescriberId: 'other-prescriber-999' });
      mockPrescriptionRepo.findOne.mockResolvedValue(otherPrescriber);

      await expect(
        service.approve(PRESCRIPTION_ID, PRESCRIBER_ID, makeProfile(), validDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when status is not UNDER_REVIEW', async () => {
      const submitted = makePrescription({ status: PrescriptionStatus.SUBMITTED, prescriberId: PRESCRIBER_ID });
      mockPrescriptionRepo.findOne.mockResolvedValue(submitted);

      await expect(
        service.approve(PRESCRIPTION_ID, PRESCRIBER_ID, makeProfile(), validDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── reject ─────────────────────────────────────────────────────────────────

  describe('reject', () => {
    it('rejects successfully and logs audit event with reason', async () => {
      mockPrescriptionRepo.findOne.mockResolvedValue(makePrescription());
      mockPrescriptionRepo.save.mockImplementation(async (p) => ({
        ...p, status: PrescriptionStatus.REJECTED,
      }));

      const result = await service.reject(
        PRESCRIPTION_ID,
        PRESCRIBER_ID,
        makeProfile(),
        { reason: 'Contraindicated with existing medication', internalNote: 'Warfarin interaction' },
      );

      expect(result.status).toBe(PrescriptionStatus.REJECTED);
      expect(mockAuditService.logPrescriberAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.PRESCRIPTION_REJECTED,
          gphcNumber: GPHC,
          metadata: expect.objectContaining({
            rejectionReason: 'Contraindicated with existing medication',
          }),
        }),
      );
    });
  });

  // ── requestMoreInfo ────────────────────────────────────────────────────────

  describe('requestMoreInfo', () => {
    it('appends a timestamped note and logs audit event', async () => {
      mockPrescriptionRepo.findOne.mockResolvedValue(makePrescription({ prescriberNote: null }));
      mockPrescriptionRepo.save.mockImplementation(async (p) => p);

      await service.requestMoreInfo(
        PRESCRIPTION_ID,
        PRESCRIBER_ID,
        makeProfile(),
        { requestedInformation: 'Please provide a full list of current medications' },
      );

      expect(mockAuditService.logPrescriberAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.PRESCRIPTION_MORE_INFO_REQUESTED,
          metadata: expect.objectContaining({
            requestedInformation: 'Please provide a full list of current medications',
          }),
        }),
      );
    });

    it('throws if prescription is not UNDER_REVIEW', async () => {
      mockPrescriptionRepo.findOne.mockResolvedValue(
        makePrescription({ status: PrescriptionStatus.APPROVED }),
      );

      await expect(
        service.requestMoreInfo(
          PRESCRIPTION_ID,
          PRESCRIBER_ID,
          makeProfile(),
          { requestedInformation: 'Need more details' },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── claim ──────────────────────────────────────────────────────────────────

  describe('claim', () => {
    it('transitions SUBMITTED to UNDER_REVIEW', async () => {
      const submitted = makePrescription({
        status: PrescriptionStatus.SUBMITTED,
        prescriberId: null,
      });
      mockPrescriptionRepo.findOne.mockResolvedValue(submitted);
      mockPrescriptionRepo.save.mockImplementation(async (p) => ({
        ...p, status: PrescriptionStatus.UNDER_REVIEW, prescriberId: PRESCRIBER_ID,
      }));

      const result = await service.claim(
        PRESCRIPTION_ID, PRESCRIBER_ID, makeProfile(), {},
      );

      expect(result.status).toBe(PrescriptionStatus.UNDER_REVIEW);
      expect(result.prescriberId).toBe(PRESCRIBER_ID);
      expect(mockAuditService.logPrescriberAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.PRESCRIPTION_TAKEN_UNDER_REVIEW }),
      );
    });

    it('throws ForbiddenException if already claimed by another prescriber', async () => {
      const claimed = makePrescription({
        status: PrescriptionStatus.UNDER_REVIEW,
        prescriberId: 'other-prescriber-999',
      });
      mockPrescriptionRepo.findOne.mockResolvedValue(claimed);

      await expect(
        service.claim(PRESCRIPTION_ID, PRESCRIBER_ID, makeProfile(), {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
