import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';
import {
  AttachQuestionnaireResponseDto,
  CancelPrescriptionRequestDto,
  CreatePrescriptionRequestDto,
  PaginatedPrescriptionsDto,
  PrescriptionQueryDto,
  PrescriptionRequestResponseDto,
  SubmitPrescriptionRequestDto,
} from './dto/prescriptions.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { plainToInstance } from 'class-transformer';

@UseInterceptors(ClassSerializerInterceptor)
@Controller('prescriptions')
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  // ── Step 1: Create DRAFT ────────────────────────────────────────────────────

  /**
   * POST /prescriptions
   * CUSTOMER — create a new DRAFT prescription request for a product.
   *
   * Returns immediately with a DRAFT record and an ID the client uses
   * for subsequent document uploads, questionnaire attachment, and submission.
   */
  @Post()
  @Roles(Role.CUSTOMER)
  async create(
    @Body() dto: CreatePrescriptionRequestDto,
    @CurrentUser('id') customerId: string,
  ): Promise<PrescriptionRequestResponseDto> {
    const prescription = await this.prescriptionsService.createDraft(customerId, dto);
    return this.prescriptionsService.toResponseDto(prescription);
  }

  // ── Step 2: Attach questionnaire ────────────────────────────────────────────

  /**
   * PATCH /prescriptions/:id/questionnaire-response
   * CUSTOMER — attach a completed questionnaire response to the DRAFT.
   *
   * Called after the customer submits the product questionnaire via
   * POST /questionnaires/:id/respond. The response ID from that call
   * is passed here.
   */
  @Patch(':id/questionnaire-response')
  @Roles(Role.CUSTOMER)
  async attachQuestionnaire(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AttachQuestionnaireResponseDto,
    @CurrentUser('id') customerId: string,
  ): Promise<PrescriptionRequestResponseDto> {
    const prescription = await this.prescriptionsService.attachQuestionnaireResponse(
      id,
      customerId,
      dto,
    );
    return this.prescriptionsService.toResponseDto(prescription);
  }

  // ── Step 3: Upload documents ─────────────────────────────────────────────────
  // Handled by DocumentsController at POST /prescriptions/:id/documents

  // ── Step 4: Submit ──────────────────────────────────────────────────────────

  /**
   * POST /prescriptions/:id/submit
   * CUSTOMER — finalise the DRAFT and move to SUBMITTED.
   *
   * Runs the full pre-flight check:
   *   ✓ Delivery address set
   *   ✓ Questionnaire response attached (if product requires it)
   *   ✓ All documents are virus-scan CLEAN
   *   ✓ Eligibility computed
   *
   * After this point the request enters the prescriber work queue.
   */
  @Post(':id/submit')
  @Roles(Role.CUSTOMER)
  @HttpCode(HttpStatus.OK)
  async submit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitPrescriptionRequestDto,
    @CurrentUser('id') customerId: string,
  ): Promise<PrescriptionRequestResponseDto> {
    const prescription = await this.prescriptionsService.submit(id, customerId, dto);
    return this.prescriptionsService.toResponseDto(prescription);
  }

  // ── Cancel ──────────────────────────────────────────────────────────────────

  /**
   * POST /prescriptions/:id/cancel
   * CUSTOMER — cancel a DRAFT or SUBMITTED request.
   * Requests that are UNDER_REVIEW or beyond cannot be cancelled by the customer.
   */
  @Post(':id/cancel')
  @Roles(Role.CUSTOMER)
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelPrescriptionRequestDto,
    @CurrentUser('id') customerId: string,
  ): Promise<PrescriptionRequestResponseDto> {
    const prescription = await this.prescriptionsService.cancel(id, customerId, dto);
    return this.prescriptionsService.toResponseDto(prescription);
  }

  // ── Read ────────────────────────────────────────────────────────────────────

  /**
   * GET /prescriptions
   * CUSTOMER — paginated list of own prescription requests.
   * Supports filtering by status.
   */
  @Get()
  @Roles(Role.CUSTOMER)
  async findMine(
    @Query() query: PrescriptionQueryDto,
    @CurrentUser('id') customerId: string,
  ): Promise<PaginatedPrescriptionsDto> {
    return this.prescriptionsService.findMyPrescriptions(customerId, query);
  }

  /**
   * GET /prescriptions/:id
   * CUSTOMER — full detail of a single prescription including documents.
   * Document entries include pre-signed S3 URLs (15 min TTL).
   */
  @Get(':id')
  @Roles(Role.CUSTOMER)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') customerId: string,
  ): Promise<PrescriptionRequestResponseDto> {
    const prescription = await this.prescriptionsService.findMyPrescriptionById(
      id,
      customerId,
    );
    return this.prescriptionsService.toResponseDto(prescription);
  }
}
