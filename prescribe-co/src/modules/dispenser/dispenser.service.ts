import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { PrescriptionRequest } from '../prescriptions/entities/prescription-request.entity';
import { PrescriptionStateMachine } from '../prescriptions/services/prescription-state-machine.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-action.enum';
import { auditContextStorage } from '../audit/interceptors/audit.interceptor';
import { PrescriptionStatus } from '../../common/enums/prescription.enums';
import {
  ClaimForDispensingDto,
  DispenserDetailDto,
  DispenserQueueItemDto,
  DispenserQueueQueryDto,
  MarkFulfilledDto,
  PaginatedDispenserQueueDto,
  UpdateTrackingDto,
} from './dto/dispenser.dto';

@Injectable()
export class DispenserService {
  constructor(
    @InjectRepository(PrescriptionRequest)
    private readonly prescriptionRepo: Repository<PrescriptionRequest>,

    private readonly stateMachine: PrescriptionStateMachine,
    private readonly auditService: AuditService,
  ) {}

  // ── Queue ──────────────────────────────────────────────────────────────────

  /**
   * Returns the dispenser work queue.
   *
   * APPROVED (default) — all approved prescriptions ready to be picked up.
   *   Ordered by approvedAt ASC (FIFO) so oldest approvals are processed first.
   *
   * DISPENSING — in-progress items claimed by this dispenser specifically.
   *   Scoped to dispenserId to prevent cross-dispenser interference.
   */
  async getQueue(
    dispenserId: string,
    query: DispenserQueueQueryDto,
  ): Promise<PaginatedDispenserQueueDto> {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    const statusFilter = query.status ?? PrescriptionStatus.APPROVED;

    const where: FindOptionsWhere<PrescriptionRequest> = { status: statusFilter };

    // DISPENSING queue is scoped to this dispenser only
    if (statusFilter === PrescriptionStatus.DISPENSING) {
      where.dispenserId = dispenserId;
    }

    const [prescriptions, total] = await this.prescriptionRepo.findAndCount({
      where,
      skip,
      take: limit,
      order: { approvedAt: 'ASC' },
      relations: ['customer', 'product'],
    });

    const data: DispenserQueueItemDto[] = prescriptions.map((p) => ({
      id: p.id,
      status: p.status,
      approvedAt: p.approvedAt,
      submittedAt: p.submittedAt,
      createdAt: p.createdAt,
      customerName: `${p.customer.firstName} ${p.customer.lastName}`,
      deliveryPostcode: null, // address loaded separately; postcode omitted from queue list
      productName: p.product.name,
      medicineType: p.product.medicineType,
      dosageInstructions: p.dosageInstructions,
      quantityDispensed: p.quantityDispensed,
      expiryDate: p.expiryDate,
      dispenserId: p.dispenserId,
    }));

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Detail view ────────────────────────────────────────────────────────────

  /**
   * Full dispensing detail for a single prescription.
   * Only visible to the dispenser when status is APPROVED or DISPENSING.
   * Also visible when FULFILLED so the dispenser can review completed records.
   */
  async getDetail(
    prescriptionId: string,
    dispenserId: string,
  ): Promise<DispenserDetailDto> {
    const prescription = await this.loadPrescription(prescriptionId);

    const allowedStatuses = [
      PrescriptionStatus.APPROVED,
      PrescriptionStatus.DISPENSING,
      PrescriptionStatus.FULFILLED,
    ];

    if (!allowedStatuses.includes(prescription.status)) {
      // Return 404 rather than expose status of in-flight clinical review
      throw new NotFoundException(`Prescription ${prescriptionId} not found`);
    }

    // DISPENSING records are scoped to the owning dispenser
    if (
      prescription.status === PrescriptionStatus.DISPENSING &&
      prescription.dispenserId !== dispenserId
    ) {
      throw new ForbiddenException(
        'This prescription is currently being processed by another dispenser',
      );
    }

    return this.toDetailDto(prescription);
  }

  // ── Claim (APPROVED → DISPENSING) ─────────────────────────────────────────

  /**
   * Dispenser claims an approved prescription to begin the dispensing process.
   * Sets dispenserId and transitions status to DISPENSING.
   *
   * Guard: if the prescription is already DISPENSING by another dispenser,
   * a ForbiddenException is thrown to prevent double-dispensing.
   */
  async claim(
    prescriptionId: string,
    dispenserId: string,
    dto: ClaimForDispensingDto,
  ): Promise<PrescriptionRequest> {
    const prescription = await this.loadPrescription(prescriptionId);

    // Allow re-claiming your own DISPENSING item (idempotent)
    if (
      prescription.status === PrescriptionStatus.DISPENSING &&
      prescription.dispenserId === dispenserId
    ) {
      return prescription;
    }

    // Block if someone else is already dispensing
    if (
      prescription.status === PrescriptionStatus.DISPENSING &&
      prescription.dispenserId !== dispenserId
    ) {
      throw new ForbiddenException(
        'This prescription is already being dispensed by another dispenser',
      );
    }

    const before = this.snapshot(prescription);

    this.stateMachine.assertTransition(
      prescription.status,
      PrescriptionStatus.DISPENSING,
      prescriptionId,
    );

    prescription.status = PrescriptionStatus.DISPENSING;
    prescription.dispenserId = dispenserId;
    prescription.dispensingStartedAt = new Date();

    if (dto.note) {
      prescription.prescriberNote = dto.note; // reused as general clinical notes field
    }

    const saved = await this.prescriptionRepo.save(prescription);

    await this.logDispenserAction({
      dispenserId,
      action: AuditAction.PRESCRIPTION_DISPENSING_STARTED,
      prescriptionId,
      beforeState: before,
      afterState: this.snapshot(saved),
      metadata: dto.note ? { note: dto.note } : undefined,
    });

    return saved;
  }

  // ── Update tracking info (while DISPENSING) ────────────────────────────────

  /**
   * Update courier / tracking details before the item ships.
   * Prescription must be DISPENSING and owned by this dispenser.
   * Can be called multiple times (e.g. tracking number changes after label print).
   */
  async updateTracking(
    prescriptionId: string,
    dispenserId: string,
    dto: UpdateTrackingDto,
  ): Promise<PrescriptionRequest> {
    const prescription = await this.loadOwnedDispensing(prescriptionId, dispenserId);

    const before = this.snapshot(prescription);

    if (dto.trackingNumber !== undefined) {
      prescription.trackingNumber = dto.trackingNumber;
    }
    if (dto.courierName !== undefined) {
      prescription.courierName = dto.courierName;
    }
    if (dto.dispensingNote !== undefined) {
      prescription.prescriberNote = dto.dispensingNote;
    }

    const saved = await this.prescriptionRepo.save(prescription);

    await this.logDispenserAction({
      dispenserId,
      action: AuditAction.PRESCRIPTION_TRACKING_UPDATED,
      prescriptionId,
      beforeState: before,
      afterState: this.snapshot(saved),
      metadata: {
        trackingNumber: dto.trackingNumber ?? null,
        courierName: dto.courierName ?? null,
      },
    });

    return saved;
  }

  // ── Mark fulfilled / shipped (DISPENSING → FULFILLED) ─────────────────────

  /**
   * Marks the prescription as shipped and fulfilled.
   * Sets tracking number, courier, and fulfilledAt timestamp.
   *
   * Business rules:
   *   - Must be DISPENSING and owned by this dispenser
   *   - trackingNumber and courierName are mandatory (UK dispensing record requirement)
   *   - expiryDate must not have passed at time of fulfilment
   */
  async markFulfilled(
    prescriptionId: string,
    dispenserId: string,
    dto: MarkFulfilledDto,
  ): Promise<PrescriptionRequest> {
    const prescription = await this.loadOwnedDispensing(prescriptionId, dispenserId);

    // Guard: prescription must not be expired before shipping
    if (prescription.expiryDate && prescription.expiryDate < new Date()) {
      throw new BadRequestException(
        `Prescription expired on ${prescription.expiryDate.toISOString().split('T')[0]}. ` +
          'Cannot mark an expired prescription as fulfilled. Contact the prescriber.',
      );
    }

    const before = this.snapshot(prescription);

    this.stateMachine.assertTransition(
      prescription.status,
      PrescriptionStatus.FULFILLED,
      prescriptionId,
    );

    prescription.status = PrescriptionStatus.FULFILLED;
    prescription.trackingNumber = dto.trackingNumber;
    prescription.courierName = dto.courierName;
    prescription.fulfilledAt = new Date();

    if (dto.dispensingNote) {
      prescription.prescriberNote = dto.dispensingNote;
    }

    const saved = await this.prescriptionRepo.save(prescription);

    await this.logDispenserAction({
      dispenserId,
      action: AuditAction.PRESCRIPTION_FULFILLED,
      prescriptionId,
      beforeState: before,
      afterState: this.snapshot(saved),
      metadata: {
        trackingNumber: dto.trackingNumber,
        courierName: dto.courierName,
        dispensingNote: dto.dispensingNote ?? null,
        fulfilledAt: saved.fulfilledAt?.toISOString(),
      },
    });

    return saved;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async loadPrescription(id: string): Promise<PrescriptionRequest> {
    const prescription = await this.prescriptionRepo.findOne({
      where: { id },
      relations: ['customer', 'product'],
    });
    if (!prescription) {
      throw new NotFoundException(`Prescription request ${id} not found`);
    }
    return prescription;
  }

  /**
   * Load a prescription and assert it is DISPENSING and owned by this dispenser.
   * Used before any mutating action that requires active dispensing ownership.
   */
  private async loadOwnedDispensing(
    id: string,
    dispenserId: string,
  ): Promise<PrescriptionRequest> {
    const prescription = await this.loadPrescription(id);

    if (prescription.status !== PrescriptionStatus.DISPENSING) {
      throw new BadRequestException(
        `This action requires status DISPENSING. Current status: "${prescription.status}". ` +
          `Use PATCH /dispenser/prescriptions/${id}/claim first.`,
      );
    }

    if (prescription.dispenserId !== dispenserId) {
      throw new ForbiddenException(
        'You are not the assigned dispenser for this prescription request',
      );
    }

    return prescription;
  }

  /**
   * Minimal status snapshot for the audit before/after diff.
   * Deliberately selective — does not capture PII-heavy fields.
   */
  private snapshot(p: PrescriptionRequest): Record<string, unknown> {
    return {
      status: p.status,
      dispenserId: p.dispenserId,
      trackingNumber: p.trackingNumber,
      courierName: p.courierName,
      dispensingStartedAt: p.dispensingStartedAt,
      fulfilledAt: p.fulfilledAt,
      expiryDate: p.expiryDate,
      prescriberNote: p.prescriberNote,
    };
  }

  private toDetailDto(p: PrescriptionRequest): DispenserDetailDto {
    return {
      id: p.id,
      status: p.status,
      customerId: p.customerId,
      customerName: `${p.customer.firstName} ${p.customer.lastName}`,
      customerNhsNumber: p.customer.nhsNumber,
      productName: p.product.name,
      medicineType: p.product.medicineType,
      bnfCode: p.product.bnfCode,
      dosageInstructions: p.dosageInstructions,
      quantityDispensed: p.quantityDispensed,
      prescribedDate: p.prescribedDate,
      expiryDate: p.expiryDate,
      deliveryAddressId: p.deliveryAddressId,
      dispenserId: p.dispenserId,
      trackingNumber: p.trackingNumber,
      courierName: p.courierName,
      dispensingStartedAt: p.dispensingStartedAt,
      fulfilledAt: p.fulfilledAt,
      approvedAt: p.approvedAt,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  /**
   * Emit a dispenser-scoped audit record.
   * Reads IP/user-agent from AsyncLocalStorage (set by AuditInterceptor).
   * Never throws — audit failure must not block dispensing operations.
   */
  private async logDispenserAction(params: {
    dispenserId: string;
    action: AuditAction;
    prescriptionId: string;
    beforeState: Record<string, unknown>;
    afterState: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const ctx = auditContextStorage.getStore();

    await this.auditService.log({
      actorId: params.dispenserId,
      actorRole: 'DISPENSER',
      gphcNumber: null, // dispensers do not hold a GPhC number
      action: params.action,
      entityType: 'prescription_requests',
      entityId: params.prescriptionId,
      beforeState: params.beforeState,
      afterState: params.afterState,
      metadata: params.metadata ?? null,
      ipAddress: ctx?.ipAddress ?? null,
      userAgent: ctx?.userAgent ?? null,
    });
  }
}
