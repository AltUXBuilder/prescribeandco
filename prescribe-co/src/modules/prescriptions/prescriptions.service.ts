import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { PrescriptionRequest } from './entities/prescription-request.entity';
import { PrescriptionStateMachine } from './services/prescription-state-machine.service';
import { EligibilityCalculator } from './services/eligibility-calculator.service';
import { DocumentsService } from '../documents/documents.service';
import { ProductsService } from '../products/products.service';
import { QuestionnairesService } from '../questionnaires/questionnaires.service';
import {
  AttachQuestionnaireResponseDto,
  CancelPrescriptionRequestDto,
  CreatePrescriptionRequestDto,
  PaginatedPrescriptionsDto,
  PrescriptionQueryDto,
  PrescriptionRequestResponseDto,
  SubmitPrescriptionRequestDto,
} from './dto/prescriptions.dto';
import {
  PrescriptionStatus,
} from '../../common/enums/prescription.enums';
import { ProductStatus } from '../../common/enums/medicine-type.enum';
import { PaymentsService } from '../payments/payments.service';
import { AuditHelper } from '../audit/audit.helper';

@Injectable()
export class PrescriptionsService {
  constructor(
    @InjectRepository(PrescriptionRequest)
    private readonly prescriptionRepo: Repository<PrescriptionRequest>,

    private readonly stateMachine: PrescriptionStateMachine,
    private readonly eligibilityCalculator: EligibilityCalculator,
    private readonly documentsService: DocumentsService,
    private readonly productsService: ProductsService,
    private readonly questionnairesService: QuestionnairesService,
    // Injected via forwardRef to avoid circular dep: Prescriptions ↔ Payments
    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
    private readonly auditHelper: AuditHelper,
  ) {}

  // ── Step 1: Create DRAFT ────────────────────────────────────────────────────

  /**
   * Creates a DRAFT prescription request for the authenticated customer.
   *
   * Pre-flight checks:
   *   - Product exists and is ACTIVE
   *   - Product requires a prescription (POM / configured P medicine)
   *   - Customer does not already have an open request for the same product
   */
  async createDraft(
    customerId: string,
    dto: CreatePrescriptionRequestDto,
  ): Promise<PrescriptionRequest> {
    const product = await this.productsService.findById(dto.productId);

    if (product.status !== ProductStatus.ACTIVE) {
      throw new BadRequestException(
        `Product "${product.name}" is not currently available`,
      );
    }

    if (!product.requiresPrescription) {
      throw new BadRequestException(
        `Product "${product.name}" does not require a prescription request`,
      );
    }

    // Prevent duplicate open requests
    await this.assertNoDuplicateOpenRequest(customerId, dto.productId);

    const prescription = this.prescriptionRepo.create({
      customerId,
      productId: dto.productId,
      deliveryAddressId: dto.deliveryAddressId ?? null,
      customerNote: dto.customerNote ?? null,
      status: PrescriptionStatus.DRAFT,
      eligibilityStatus: null,
      eligibilityNotes: null,
    });

    const saved = await this.prescriptionRepo.save(prescription);
    await this.auditHelper.logPrescriptionDraftCreated(customerId, saved.id, dto.productId);
    return saved;
  }

  // ── Step 2: Attach questionnaire response ───────────────────────────────────

  /**
   * Links a completed questionnaire response to the DRAFT.
   * Validates:
   *   - Request is still DRAFT (editable)
   *   - Response belongs to the same customer
   *   - Response is for the questionnaire linked to the product
   *   - Product actually requires a questionnaire
   */
  async attachQuestionnaireResponse(
    prescriptionId: string,
    customerId: string,
    dto: AttachQuestionnaireResponseDto,
  ): Promise<PrescriptionRequest> {
    const prescription = await this.findOwnedDraft(prescriptionId, customerId);
    const product = await this.productsService.findById(prescription.productId);

    if (!product.requiresQuestionnaire) {
      throw new BadRequestException(
        `Product "${product.name}" does not require a questionnaire`,
      );
    }

    // Load the response and validate ownership + questionnaire match
    const response = await this.questionnairesService.findResponseById(
      dto.questionnaireResponseId,
    );

    if (response.userId !== customerId) {
      throw new ForbiddenException(
        'You can only attach your own questionnaire responses',
      );
    }

    if (response.questionnaireId !== product.questionnaireId) {
      throw new BadRequestException(
        'This questionnaire response is for a different product questionnaire',
      );
    }

    prescription.questionnaireResponseId = response.id;
    const saved = await this.prescriptionRepo.save(prescription);
    await this.auditHelper.logQuestionnaireAttached(customerId, prescriptionId, response.id);
    return saved;
  }

  // ── Step 3: Submit (DRAFT → SUBMITTED) ─────────────────────────────────────

  /**
   * Runs full pre-flight validation and moves the request to SUBMITTED.
   *
   * Pre-flight gates (in order):
   *   1. Request is DRAFT and owned by this customer
   *   2. Delivery address is set
   *   3. If product requires questionnaire → response is attached
   *   4. All uploaded documents have passed virus scanning
   *   5. Eligibility is computed from the questionnaire response
   *
   * After submission the request is visible in the prescriber work queue.
   */
  async submit(
    prescriptionId: string,
    customerId: string,
    dto: SubmitPrescriptionRequestDto,
  ): Promise<PrescriptionRequest> {
    const prescription = await this.findOwnedDraft(prescriptionId, customerId);

    // Allow a delivery address to be set or overridden at submission time
    if (dto.deliveryAddressId) {
      prescription.deliveryAddressId = dto.deliveryAddressId;
    }
    if (dto.customerNote !== undefined) {
      prescription.customerNote = dto.customerNote;
    }

    // ── Gate 1: Delivery address ────────────────────────────────────────────
    if (!prescription.deliveryAddressId) {
      throw new BadRequestException(
        'A delivery address must be set before submitting',
      );
    }

    // ── Gate 2: Questionnaire response ──────────────────────────────────────
    const product = await this.productsService.findById(prescription.productId);

    if (product.requiresQuestionnaire && !prescription.questionnaireResponseId) {
      throw new BadRequestException(
        `Product "${product.name}" requires a completed questionnaire. ` +
          'Please complete the questionnaire before submitting.',
      );
    }

    // ── Gate 3: Document virus scans ────────────────────────────────────────
    await this.documentsService.assertAllDocumentsClean(prescriptionId);

    // ── Compute eligibility ─────────────────────────────────────────────────
    let questionnaireResponse = null;
    if (prescription.questionnaireResponseId) {
      questionnaireResponse = await this.questionnairesService.findResponseById(
        prescription.questionnaireResponseId,
      );
    }

    const eligibility = this.eligibilityCalculator.calculate(questionnaireResponse);

    if (eligibility) {
      prescription.eligibilityStatus = eligibility.status;
      prescription.eligibilityNotes = eligibility.notes.length > 0 ? eligibility.notes : null;
    }

    // ── State transition ────────────────────────────────────────────────────
    this.stateMachine.assertTransition(
      prescription.status,
      PrescriptionStatus.SUBMITTED,
      prescriptionId,
    );

    prescription.status = PrescriptionStatus.SUBMITTED;
    prescription.submittedAt = new Date();

    const saved = await this.prescriptionRepo.save(prescription);

    // ── Gate 4: Authorise payment ───────────────────────────────────────────
    // Authorisation runs after the status flip so a provider failure does not
    // silently leave the prescription in DRAFT. If authorisation fails, the
    // saved SUBMITTED record remains; the caller receives the payment error.
    if (dto.payment) {
      const product = await this.productsService.findById(prescription.productId);
      const paymentResult = await this.paymentsService.authorise(
        prescriptionId,
        customerId,
        product.name,
        product.pricePence,
        dto.payment,
      );

      if (paymentResult.status === 'FAILED') {
        // Roll the prescription back to DRAFT so the customer can retry
        prescription.status = PrescriptionStatus.DRAFT;
        prescription.submittedAt = null;
        await this.prescriptionRepo.save(prescription);
        throw new BadRequestException(
          `Payment authorisation failed: ${paymentResult.failureMessage ?? 'Payment declined'}. ` +
            'Please check your payment details and try again.',
        );
      }
    }

    await this.auditHelper.logPrescriptionSubmitted(
      customerId,
      prescriptionId,
      saved.eligibilityStatus,
    );

    return saved;
  }

  // ── Cancel ──────────────────────────────────────────────────────────────────

  /**
   * Customer cancels their own DRAFT or SUBMITTED request.
   * UNDER_REVIEW and beyond cannot be cancelled by the customer.
   */
  async cancel(
    prescriptionId: string,
    customerId: string,
    dto: CancelPrescriptionRequestDto,
  ): Promise<PrescriptionRequest> {
    const prescription = await this.findOwnedPrescription(prescriptionId, customerId);

    this.stateMachine.assertTransition(
      prescription.status,
      PrescriptionStatus.CANCELLED,
      prescriptionId,
    );

    prescription.status = PrescriptionStatus.CANCELLED;
    prescription.rejectionReason = dto.reason;
    prescription.cancelledAt = new Date();

    const saved = await this.prescriptionRepo.save(prescription);
    await this.auditHelper.logPrescriptionCancelled(customerId, 'CUSTOMER', prescriptionId, dto.reason);
    return saved;
  }

  // ── Read ────────────────────────────────────────────────────────────────────

  async findMyPrescriptions(
    customerId: string,
    query: PrescriptionQueryDto,
  ): Promise<PaginatedPrescriptionsDto> {
    const { page = 1, limit = 20, status } = query;
    const skip = (page - 1) * limit;

    const where: any = { customerId };
    if (status) where.status = status;

    const [prescriptions, total] = await this.prescriptionRepo.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
      relations: ['documents'],
    });

    const data = await Promise.all(
      prescriptions.map((p) => this.toResponseDto(p)),
    );

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findMyPrescriptionById(
    prescriptionId: string,
    customerId: string,
  ): Promise<PrescriptionRequest> {
    const prescription = await this.prescriptionRepo.findOne({
      where: { id: prescriptionId, customerId },
      relations: ['product', 'documents', 'questionnaireResponse'],
    });

    if (!prescription) {
      throw new NotFoundException(
        `Prescription request ${prescriptionId} not found`,
      );
    }

    return prescription;
  }

  // ── Internal helpers ────────────────────────────────────────────────────────

  private async findOwnedDraft(
    id: string,
    customerId: string,
  ): Promise<PrescriptionRequest> {
    const prescription = await this.findOwnedPrescription(id, customerId);

    if (!prescription.isEditable) {
      throw new BadRequestException(
        `Prescription request ${id} is in status "${prescription.status}" and can no longer be edited`,
      );
    }

    return prescription;
  }

  private async findOwnedPrescription(
    id: string,
    customerId: string,
  ): Promise<PrescriptionRequest> {
    const prescription = await this.prescriptionRepo.findOne({
      where: { id },
    });

    if (!prescription) {
      throw new NotFoundException(`Prescription request ${id} not found`);
    }

    if (prescription.customerId !== customerId) {
      // Return 404 rather than 403 to avoid exposing existence of other users' requests
      throw new NotFoundException(`Prescription request ${id} not found`);
    }

    return prescription;
  }

  private async assertNoDuplicateOpenRequest(
    customerId: string,
    productId: string,
  ): Promise<void> {
    const openStatuses = [
      PrescriptionStatus.DRAFT,
      PrescriptionStatus.SUBMITTED,
      PrescriptionStatus.UNDER_REVIEW,
      PrescriptionStatus.APPROVED,
    ];

    for (const status of openStatuses) {
      const existing = await this.prescriptionRepo.findOne({
        where: { customerId, productId, status },
      });

      if (existing) {
        throw new BadRequestException(
          `You already have an open prescription request for this product (status: ${status}). ` +
            `Request ID: ${existing.id}`,
        );
      }
    }
  }

  async toResponseDto(
    prescription: PrescriptionRequest,
  ): Promise<PrescriptionRequestResponseDto> {
    // Enrich documents with pre-signed URLs if loaded
    let enrichedDocs: any[] = [];
    if (prescription.documents?.length) {
      const enriched = await this.documentsService.enrichWithPresignedUrls(
        prescription.documents,
      );
      enrichedDocs = enriched.map((d) =>
        this.documentsService.toResponseDto(d, d.presignedUrl),
      );
    }

    return plainToInstance(
      PrescriptionRequestResponseDto,
      { ...prescription, documents: enrichedDocs },
      { excludeExtraneousValues: true },
    );
  }
}
