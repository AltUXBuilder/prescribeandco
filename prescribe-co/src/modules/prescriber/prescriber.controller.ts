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
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { PrescriberService } from './prescriber.service';
import {
  ApprovePrescriptionDto,
  ClaimPrescriptionDto,
  PaginatedQueueDto,
  PrescriberQueueQueryDto,
  PrescriberReviewResponseDto,
  RejectPrescriptionDto,
  RequestMoreInfoDto,
} from './dto/prescriber.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { PrescriberGuard } from './prescriber.guard';
import { PrescriberProfile } from '../users/entities/prescriber-profile.entity';

/**
 * PrescriberController
 * ─────────────────────
 * All routes require:
 *   1. JwtAuthGuard    (global) — valid access token
 *   2. RolesGuard      (global) — role = PRESCRIBER
 *   3. PrescriberGuard (route)  — GPhC verified + indemnity not expired
 *
 * PrescriberGuard is applied at the class level so every route in this
 * controller requires a verified prescriber profile.
 */
@UseInterceptors(ClassSerializerInterceptor)
@Roles(Role.PRESCRIBER)
@UseGuards(PrescriberGuard)
@Controller('prescriber')
export class PrescriberController {
  constructor(private readonly prescriberService: PrescriberService) {}

  // ── Work queue ──────────────────────────────────────────────────────────────

  /**
   * GET /prescriber/queue
   * Returns SUBMITTED prescriptions (the primary inbox) by default.
   * Pass ?status=UNDER_REVIEW to see claimed-but-not-resolved prescriptions.
   * Pass ?eligibilityStatus=FAIL to triage high-risk cases.
   */
  @Get('queue')
  async getQueue(
    @Query() query: PrescriberQueueQueryDto,
    @CurrentUser('id') prescriberId: string,
  ): Promise<PaginatedQueueDto> {
    return this.prescriberService.getQueue(prescriberId, query);
  }

  // ── Review detail ───────────────────────────────────────────────────────────

  /**
   * GET /prescriber/prescriptions/:id
   * Full clinical review view — patient demographics, questionnaire answers,
   * documents with pre-signed URLs, and the complete audit trail.
   *
   * This read is itself audited (PRESCRIPTION_VIEWED).
   */
  @Get('prescriptions/:id')
  async getReviewDetail(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') prescriberId: string,
    @Req() req: Request,
  ): Promise<PrescriberReviewResponseDto> {
    const profile: PrescriberProfile = (req as any).prescriberProfile;
    return this.prescriberService.getReviewDetail(id, prescriberId, profile);
  }

  // ── Claim ───────────────────────────────────────────────────────────────────

  /**
   * PATCH /prescriber/prescriptions/:id/claim
   * SUBMITTED → UNDER_REVIEW.
   * Claims the prescription for this prescriber.
   * Prevents concurrent review by two prescribers.
   */
  @Patch('prescriptions/:id/claim')
  @HttpCode(HttpStatus.OK)
  async claim(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ClaimPrescriptionDto,
    @CurrentUser('id') prescriberId: string,
    @Req() req: Request,
  ) {
    const profile: PrescriberProfile = (req as any).prescriberProfile;
    const prescription = await this.prescriberService.claim(id, prescriberId, profile, dto);
    return { id: prescription.id, status: prescription.status, prescriberId: prescription.prescriberId };
  }

  // ── Approve ─────────────────────────────────────────────────────────────────

  /**
   * POST /prescriber/prescriptions/:id/approve
   * UNDER_REVIEW → APPROVED.
   *
   * Required fields: dosageInstructions, quantityToDispense, expiryDate.
   * FAIL eligibility additionally requires: eligibilityOverrideJustification.
   *
   * Audit record includes: prescriber ID, GPhC number, timestamp, full diff.
   */
  @Post('prescriptions/:id/approve')
  @HttpCode(HttpStatus.OK)
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApprovePrescriptionDto,
    @CurrentUser('id') prescriberId: string,
    @Req() req: Request,
  ) {
    const profile: PrescriberProfile = (req as any).prescriberProfile;
    const prescription = await this.prescriberService.approve(id, prescriberId, profile, dto);
    return {
      id: prescription.id,
      status: prescription.status,
      approvedAt: prescription.approvedAt,
      expiryDate: prescription.expiryDate,
      dosageInstructions: prescription.dosageInstructions,
    };
  }

  // ── Reject ──────────────────────────────────────────────────────────────────

  /**
   * POST /prescriber/prescriptions/:id/reject
   * UNDER_REVIEW → REJECTED.
   *
   * reason (shown to customer) is mandatory.
   * internalNote (not shown to customer) is optional but required for FAIL eligibility.
   *
   * Audit record includes: rejection reason, internal note, prescriber ID, GPhC.
   */
  @Post('prescriptions/:id/reject')
  @HttpCode(HttpStatus.OK)
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectPrescriptionDto,
    @CurrentUser('id') prescriberId: string,
    @Req() req: Request,
  ) {
    const profile: PrescriberProfile = (req as any).prescriberProfile;
    const prescription = await this.prescriberService.reject(id, prescriberId, profile, dto);
    return {
      id: prescription.id,
      status: prescription.status,
      rejectionReason: prescription.rejectionReason,
    };
  }

  // ── Request more info ───────────────────────────────────────────────────────

  /**
   * POST /prescriber/prescriptions/:id/request-info
   * Status remains UNDER_REVIEW — no state transition.
   * Appends a timestamped note to prescriberNote and fires a notification
   * to the customer (notification module integration — next phase).
   *
   * Audit record includes: requestedInformation text, prescriber ID, GPhC.
   */
  @Post('prescriptions/:id/request-info')
  @HttpCode(HttpStatus.OK)
  async requestMoreInfo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RequestMoreInfoDto,
    @CurrentUser('id') prescriberId: string,
    @Req() req: Request,
  ) {
    const profile: PrescriberProfile = (req as any).prescriberProfile;
    const prescription = await this.prescriberService.requestMoreInfo(
      id,
      prescriberId,
      profile,
      dto,
    );
    return {
      id: prescription.id,
      status: prescription.status,
      prescriberNote: prescription.prescriberNote,
    };
  }
}
