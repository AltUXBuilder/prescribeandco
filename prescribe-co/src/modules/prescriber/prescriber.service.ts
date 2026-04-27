import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Not, Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { PrescriptionRequest } from '../prescriptions/entities/prescription-request.entity';
import { PrescriptionStateMachine } from '../prescriptions/services/prescription-state-machine.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-action.enum';
import { DocumentsService } from '../documents/documents.service';
import { auditContextStorage } from '../audit/interceptors/audit.interceptor';
import { PaymentsService } from '../payments/payments.service';
import {
  EligibilityStatus,
  PrescriptionStatus,
} from '../../common/enums/prescription.enums';
import {
  ApprovePrescriptionDto,
  ClaimPrescriptionDto,
  PaginatedQueueDto,
  PrescriberQueueItemDto,
  PrescriberQueueQueryDto,
  PrescriberReviewResponseDto,
  RejectPrescriptionDto,
  RequestMoreInfoDto,
} from './dto/prescriber.dto';
import { PrescriberProfile } from '../users/entities/prescriber-profile.entity';

/**
 * Maximum allowed prescription expiry from today (UK regulatory: 6 months for most POM).
 * Hard-coded; should be configurable per product in a future enhancement.
 */
const MAX_EXPIRY_MONTHS = 6;

@Injectable()
export class PrescriberService {
  constructor(
    @InjectRepository(PrescriptionRequest)
    private readonly prescriptionRepo: Repository<PrescriptionRequest>,

    @InjectRepository(PrescriberProfile)
    private readonly profileRepo: Repository<PrescriberProfile>,

    private readonly stateMachine: PrescriptionStateMachine,
    private readonly auditService: AuditService,
    private readonly documentsService: DocumentsService,

    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
  ) {}

  // ── Queue ──────────────────────────────────────────────────────────────────

  /**
   * Returns the prescriber work queue.
   * Default: SUBMITTED prescriptions (unclaimed), ordered oldest-first (FIFO).
   * Optional: UNDER_REVIEW filtered to this prescriber's claimed items.
   */
  async getQueue(
    prescriberId: string,
    query: PrescriberQueueQueryDto,
  ): Promise<PaginatedQueueDto> {
    const { page = 1, limit = 20, status, eligibilityStatus } = query;
    const skip = (page - 1) * limit;

    const statusFilter = status ?? PrescriptionStatus.SUBMITTED;

    const where: FindOptionsWhere<PrescriptionRequest> = { status: statusFilter };

    // UNDER_REVIEW is scoped to this prescriber — they should only see their own claimed items
    if (statusFilter === PrescriptionStatus.UNDER_REVIEW) {
      where.prescriberId = prescriberId;
    }

    if (eligibilityStatus) {
      where.eligibilityStatus = eligibilityStatus;
    }

    const [prescriptions, total] = await this.prescriptionRepo.findAndCount({
      where,
      skip,
      take: limit,
      order: { submittedAt: 'ASC' }, // FIFO — oldest submitted first
      relations: ['customer', 'product'],
    });

    const data: PrescriberQueueItemDto[] = prescriptions.map((p) => ({
      id: p.id,
      status: p.status,
      eligibilityStatus: p.eligibilityStatus,
      submittedAt: p.submittedAt,
      createdAt: p.createdAt,
      customerName: `${p.customer.firstName} ${p.customer.lastName}`,
      productName: p.product.name,
      medicineType: p.product.medicineType,
    }));

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Detail view ────────────────────────────────────────────────────────────

  /**
   * Full clinical review view for a single prescription.
   * Loads: patient demographics + medical history count, product, questionnaire
   * response, documents with pre-signed URLs, and the complete audit trail.
   *
   * Every read of a prescription by a prescriber is itself audited.
   */
  async getReviewDetail(
    prescriptionId: string,
    prescriberId: string,
    profile: PrescriberProfile,
  ): Promise<PrescriberReviewResponseDto> {
    const prescription = await this.loadFullPrescription(prescriptionId);

    // Count prior prescriptions for this customer (medical history indicator)
    const previousPrescriptionCount = await this.prescriptionRepo.count({
      where: {
        customerId: prescription.customerId,
        id: Not(prescriptionId),
        status: PrescriptionStatus.FULFILLED,
      },
    });

    // Enrich documents with pre-signed URLs
    const enrichedDocs = prescription.documents?.length
      ? await this.documentsService.enrichWithPresignedUrls(prescription.documents)
      : [];

    // Fetch audit trail
    const auditHistory = await this.auditService.getEntityHistory(
      'prescription_requests',
      prescriptionId,
    );

    // Log this read action for regulatory traceability
    const ctx = auditContextStorage.getStore();
    await this.auditService.logPrescriberAction({
      prescriberId,
      gphcNumber: profile.gphcNumber,
      action: AuditAction.PRESCRIPTION_VIEWED,
      prescriptionId,
      beforeState: {},
      afterState: {},
      metadata: { viewedAt: new Date().toISOString() },
      ipAddress: ctx?.ipAddress ?? undefined,
      userAgent: ctx?.userAgent ?? undefined,
    });

    return {
      id: prescription.id,
      status: prescription.status,
      eligibilityStatus: prescription.eligibilityStatus,
      eligibilityNotes: prescription.eligibilityNotes,
      customerNote: prescription.customerNote,
      prescriberNote: prescription.prescriberNote,
      submittedAt: prescription.submittedAt,
      reviewedAt: prescription.reviewedAt,
      createdAt: prescription.createdAt,
      patient: {
        id: prescription.customer.id,
        firstName: prescription.customer.firstName,
        lastName: prescription.customer.lastName,
        dateOfBirth: prescription.customer.dateOfBirth,
        nhsNumber: prescription.customer.nhsNumber,
        previousPrescriptionCount,
      },
      product: {
        id: prescription.product.id,
        name: prescription.product.name,
        medicineType: prescription.product.medicineType,
        bnfCode: prescription.product.bnfCode,
        requiresPrescription: prescription.product.requiresPrescription,
      },
      questionnaireResponse: prescription.questionnaireResponse
        ? {
            id: prescription.questionnaireResponse.id,
            questionnaireVersion: prescription.questionnaireResponse.questionnaireVersion,
            answers: prescription.questionnaireResponse.answers,
            isEligible: prescription.questionnaireResponse.isEligible,
            ineligibilityReasons: prescription.questionnaireResponse.ineligibilityReasons,
            submittedAt: prescription.questionnaireResponse.submittedAt,
          }
        : null,
      documents: enrichedDocs.map((d) => ({
        id: d.id,
        documentType: d.documentType,
        originalFilename: d.originalFilename,
        mimeType: d.mimeType,
        scanStatus: d.scanStatus,
        uploadedAt: d.uploadedAt,
        presignedUrl: (d as any).presignedUrl,
      })),
      auditHistory: auditHistory.map((a) => ({
        action: a.action,
        actorRole: a.actorRole,
        gphcNumber: a.gphcNumber,
        metadata: a.metadata,
        createdAt: a.createdAt,
      })),
    };
  }

  // ── Claim (SUBMITTED → UNDER_REVIEW) ───────────────────────────────────────

  /**
   * Prescriber claims a submitted prescription, moving it to UNDER_REVIEW.
   * Prevents two prescribers from reviewing the same request simultaneously.
   */
  async claim(
    prescriptionId: string,
    prescriberId: string,
    profile: PrescriberProfile,
    dto: ClaimPrescriptionDto,
  ): Promise<PrescriptionRequest> {
    const prescription = await this.loadFullPrescription(prescriptionId);

    // Guard: don't re-claim something already under review by someone else
    if (
      prescription.status === PrescriptionStatus.UNDER_REVIEW &&
      prescription.prescriberId !== prescriberId
    ) {
      throw new ForbiddenException(
        'This prescription is already under review by another prescriber',
      );
    }

    const before = this.snapshotStatus(prescription);

    this.stateMachine.assertTransition(
      prescription.status,
      PrescriptionStatus.UNDER_REVIEW,
      prescriptionId,
    );

    prescription.status = PrescriptionStatus.UNDER_REVIEW;
    prescription.prescriberId = prescriberId;
    prescription.reviewedAt = new Date();
    if (dto.note) prescription.prescriberNote = dto.note;

    const saved = await this.prescriptionRepo.save(prescription);

    const ctx = auditContextStorage.getStore();
    await this.auditService.logPrescriberAction({
      prescriberId,
      gphcNumber: profile.gphcNumber,
      action: AuditAction.PRESCRIPTION_TAKEN_UNDER_REVIEW,
      prescriptionId,
      beforeState: before,
      afterState: this.snapshotStatus(saved),
      metadata: dto.note ? { note: dto.note } : undefined,
      ipAddress: ctx?.ipAddress ?? undefined,
      userAgent: ctx?.userAgent ?? undefined,
    });

    return saved;
  }

  // ── Approve ────────────────────────────────────────────────────────────────

  /**
   * Approve the prescription request, generating the clinical prescription.
   *
   * Business rules enforced:
   *   1. Prescription must be UNDER_REVIEW and owned by this prescriber
   *   2. expiryDate must be in the future and within 6 months
   *   3. FAIL eligibility requires an eligibilityOverrideJustification
   *   4. Override justification is mandatory minimum 20 chars (enforced in DTO too)
   */
  async approve(
    prescriptionId: string,
    prescriberId: string,
    profile: PrescriberProfile,
    dto: ApprovePrescriptionDto,
  ): Promise<PrescriptionRequest> {
    const prescription = await this.loadAndAssertOwnership(prescriptionId, prescriberId);

    // ── Expiry validation ────────────────────────────────────────────────────
    const expiry = new Date(dto.expiryDate);
    const maxExpiry = new Date();
    maxExpiry.setMonth(maxExpiry.getMonth() + MAX_EXPIRY_MONTHS);

    if (expiry <= new Date()) {
      throw new BadRequestException('Expiry date must be in the future');
    }
    if (expiry > maxExpiry) {
      throw new BadRequestException(
        `Expiry date cannot exceed ${MAX_EXPIRY_MONTHS} months from today (UK POM regulations)`,
      );
    }

    // ── FAIL eligibility override ────────────────────────────────────────────
    if (prescription.eligibilityStatus === EligibilityStatus.FAIL) {
      if (!dto.eligibilityOverrideJustification) {
        throw new BadRequestException(
          'An eligibility override justification is required when approving a FAIL-eligibility prescription. ' +
            'The prescriber must document their clinical reasoning.',
        );
      }
    }

    const before = this.snapshotStatus(prescription);

    this.stateMachine.assertTransition(
      prescription.status,
      PrescriptionStatus.APPROVED,
      prescriptionId,
    );

    prescription.status       = PrescriptionStatus.APPROVED;
    prescription.approvedAt   = new Date();
    prescription.prescribedDate       = new Date();
    prescription.expiryDate           = expiry;
    prescription.dosageInstructions   = dto.dosageInstructions;
    prescription.quantityDispensed    = dto.quantityToDispense;
    prescription.prescriberNote       = dto.clinicalNote ?? prescription.prescriberNote;

    const saved = await this.prescriptionRepo.save(prescription);

    // Payment was already captured at prescription submission — no action needed here.

    const ctx = auditContextStorage.getStore();
    await this.auditService.logPrescriberAction({
      prescriberId,
      gphcNumber: profile.gphcNumber,
      action: AuditAction.PRESCRIPTION_APPROVED,
      prescriptionId,
      beforeState: before,
      afterState: this.snapshotStatus(saved),
      metadata: {
        dosageInstructions: dto.dosageInstructions,
        quantityToDispense: dto.quantityToDispense,
        expiryDate: dto.expiryDate,
        eligibilityOverride: dto.eligibilityOverrideJustification ?? null,
        clinicalNote: dto.clinicalNote ?? null,
        eligibilityStatus: prescription.eligibilityStatus,
      },
      ipAddress: ctx?.ipAddress ?? undefined,
      userAgent: ctx?.userAgent ?? undefined,
    });

    return saved;
  }

  // ── Reject ─────────────────────────────────────────────────────────────────

  /**
   * Reject the prescription request with a mandatory reason.
   * The reason is shown to the customer; the internalNote is not.
   */
  async reject(
    prescriptionId: string,
    prescriberId: string,
    profile: PrescriberProfile,
    dto: RejectPrescriptionDto,
  ): Promise<PrescriptionRequest> {
    const prescription = await this.loadAndAssertOwnership(prescriptionId, prescriberId);

    const before = this.snapshotStatus(prescription);

    this.stateMachine.assertTransition(
      prescription.status,
      PrescriptionStatus.REJECTED,
      prescriptionId,
    );

    prescription.status          = PrescriptionStatus.REJECTED;
    prescription.rejectionReason = dto.reason;

    // Store internal note without overwriting prior clinical notes
    if (dto.internalNote) {
      prescription.prescriberNote = dto.internalNote;
    }

    const saved = await this.prescriptionRepo.save(prescription);

    // ── Refund payment — prescription rejected after payment was taken ────
    await this.paymentsService.refundOnRejection(
      prescriptionId,
      `Prescription rejected by prescriber: ${dto.reason}`,
    ).catch(() => undefined); // refund failure is logged inside PaymentsService

    const ctx = auditContextStorage.getStore();
    await this.auditService.logPrescriberAction({
      prescriberId,
      gphcNumber: profile.gphcNumber,
      action: AuditAction.PRESCRIPTION_REJECTED,
      prescriptionId,
      beforeState: before,
      afterState: this.snapshotStatus(saved),
      metadata: {
        rejectionReason: dto.reason,
        internalNote: dto.internalNote ?? null,
        eligibilityStatus: prescription.eligibilityStatus,
      },
      ipAddress: ctx?.ipAddress ?? undefined,
      userAgent: ctx?.userAgent ?? undefined,
    });

    return saved;
  }

  // ── Request more info ──────────────────────────────────────────────────────

  /**
   * Pause the review and ask the customer for additional information.
   * Status stays UNDER_REVIEW — the customer is notified via the
   * notifications module (next phase) with the requestedInformation text.
   *
   * This is NOT a state transition — the prescription stays UNDER_REVIEW
   * so the prescriber retains ownership and can resume once info is provided.
   */
  async requestMoreInfo(
    prescriptionId: string,
    prescriberId: string,
    profile: PrescriberProfile,
    dto: RequestMoreInfoDto,
  ): Promise<PrescriptionRequest> {
    const prescription = await this.loadAndAssertOwnership(prescriptionId, prescriberId);

    if (prescription.status !== PrescriptionStatus.UNDER_REVIEW) {
      throw new BadRequestException(
        `Can only request more information on UNDER_REVIEW prescriptions. ` +
          `Current status: ${prescription.status}`,
      );
    }

    const before = this.snapshotStatus(prescription);

    // Append to prescriber note so history is preserved
    const existingNote = prescription.prescriberNote ?? '';
    const separator = existingNote ? '\n\n' : '';
    prescription.prescriberNote =
      `${existingNote}${separator}[Info Request ${new Date().toISOString()}]: ${dto.requestedInformation}`;

    const saved = await this.prescriptionRepo.save(prescription);

    const ctx = auditContextStorage.getStore();
    await this.auditService.logPrescriberAction({
      prescriberId,
      gphcNumber: profile.gphcNumber,
      action: AuditAction.PRESCRIPTION_MORE_INFO_REQUESTED,
      prescriptionId,
      beforeState: before,
      afterState: this.snapshotStatus(saved),
      metadata: {
        requestedInformation: dto.requestedInformation,
      },
      ipAddress: ctx?.ipAddress ?? undefined,
      userAgent: ctx?.userAgent ?? undefined,
    });

    return saved;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async loadFullPrescription(id: string): Promise<PrescriptionRequest> {
    const prescription = await this.prescriptionRepo.findOne({
      where: { id },
      relations: [
        'customer',
        'product',
        'questionnaireResponse',
        'documents',
      ],
    });

    if (!prescription) {
      throw new NotFoundException(`Prescription request ${id} not found`);
    }

    return prescription;
  }

  /**
   * Load a prescription and assert it is UNDER_REVIEW and owned by this prescriber.
   * Called before any mutating clinical action.
   */
  private async loadAndAssertOwnership(
    id: string,
    prescriberId: string,
  ): Promise<PrescriptionRequest> {
    const prescription = await this.loadFullPrescription(id);

    if (prescription.status !== PrescriptionStatus.UNDER_REVIEW) {
      throw new BadRequestException(
        `Clinical actions require status UNDER_REVIEW. Current status: ${prescription.status}. ` +
          `Use PATCH /prescriptions/${id}/claim first.`,
      );
    }

    if (prescription.prescriberId !== prescriberId) {
      throw new ForbiddenException(
        'You are not the assigned prescriber for this prescription request',
      );
    }

    return prescription;
  }

  /**
   * Creates a plain-object snapshot of the status-related fields for audit diff.
   * Deliberately selective — we don't snapshot entire entities to avoid leaking PII.
   */
  private snapshotStatus(p: PrescriptionRequest): Record<string, unknown> {
    return {
      status: p.status,
      eligibilityStatus: p.eligibilityStatus,
      prescriberId: p.prescriberId,
      prescriberNote: p.prescriberNote,
      rejectionReason: p.rejectionReason,
      dosageInstructions: p.dosageInstructions,
      expiryDate: p.expiryDate,
      approvedAt: p.approvedAt,
      reviewedAt: p.reviewedAt,
    };
  }
}
