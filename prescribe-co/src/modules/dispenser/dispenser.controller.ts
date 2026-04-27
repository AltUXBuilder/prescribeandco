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
import { DispenserService } from './dispenser.service';
import {
  ClaimForDispensingDto,
  DispenserDetailDto,
  DispenserQueueQueryDto,
  MarkFulfilledDto,
  PaginatedDispenserQueueDto,
  UpdateTrackingDto,
} from './dto/dispenser.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';

/**
 * DispenserController
 * ────────────────────
 * All routes require:
 *   1. JwtAuthGuard  (global) — valid access token
 *   2. RolesGuard    (global) — role = DISPENSER
 *
 * Unlike prescribers, dispensers do not hold a GPhC number and have no
 * equivalent PrescriberGuard. Role enforcement via RolesGuard is sufficient.
 * Access to specific prescriptions is enforced at the service layer.
 */
@UseInterceptors(ClassSerializerInterceptor)
@Roles(Role.DISPENSER)
@Controller('dispenser')
export class DispenserController {
  constructor(private readonly dispenserService: DispenserService) {}

  // ── Queue ───────────────────────────────────────────────────────────────────

  /**
   * GET /dispenser/queue
   * Returns APPROVED prescriptions by default (unclaimed, ready to pick up).
   * Pass ?status=DISPENSING to see items currently being processed by this dispenser.
   *
   * Queue is ordered by approvedAt ASC (oldest approvals first — FIFO processing).
   */
  @Get('queue')
  async getQueue(
    @Query() query: DispenserQueueQueryDto,
    @CurrentUser('id') dispenserId: string,
  ): Promise<PaginatedDispenserQueueDto> {
    return this.dispenserService.getQueue(dispenserId, query);
  }

  // ── Detail ──────────────────────────────────────────────────────────────────

  /**
   * GET /dispenser/prescriptions/:id
   * Full dispensing detail — patient name, NHS number, product, dosage,
   * expiry, delivery address, tracking info.
   *
   * Only visible when status is APPROVED, DISPENSING (owned by caller), or FULFILLED.
   * Returns 404 for any other status to avoid leaking clinical state.
   */
  @Get('prescriptions/:id')
  async getDetail(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') dispenserId: string,
  ): Promise<DispenserDetailDto> {
    return this.dispenserService.getDetail(id, dispenserId);
  }

  // ── Claim (APPROVED → DISPENSING) ───────────────────────────────────────────

  /**
   * PATCH /dispenser/prescriptions/:id/claim
   * Claim an APPROVED prescription to begin dispensing.
   *
   * - Sets dispenserId on the prescription
   * - Transitions status APPROVED → DISPENSING
   * - Throws 403 if already claimed by another dispenser
   * - Idempotent: re-claiming your own DISPENSING item is a no-op
   *
   * Audit: PRESCRIPTION_DISPENSING_STARTED logged with before/after diff.
   */
  @Patch('prescriptions/:id/claim')
  @HttpCode(HttpStatus.OK)
  async claim(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ClaimForDispensingDto,
    @CurrentUser('id') dispenserId: string,
  ) {
    const prescription = await this.dispenserService.claim(id, dispenserId, dto);
    return {
      id: prescription.id,
      status: prescription.status,
      dispenserId: prescription.dispenserId,
      dispensingStartedAt: prescription.dispensingStartedAt,
    };
  }

  // ── Update tracking ─────────────────────────────────────────────────────────

  /**
   * PATCH /dispenser/prescriptions/:id/tracking
   * Update courier and tracking number while the prescription is DISPENSING.
   * Can be called multiple times — useful when a label is reprinted or
   * courier changes after initial assignment.
   *
   * Audit: PRESCRIPTION_TRACKING_UPDATED logged with before/after diff.
   */
  @Patch('prescriptions/:id/tracking')
  @HttpCode(HttpStatus.OK)
  async updateTracking(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTrackingDto,
    @CurrentUser('id') dispenserId: string,
  ) {
    const prescription = await this.dispenserService.updateTracking(id, dispenserId, dto);
    return {
      id: prescription.id,
      trackingNumber: prescription.trackingNumber,
      courierName: prescription.courierName,
      updatedAt: prescription.updatedAt,
    };
  }

  // ── Mark fulfilled / shipped (DISPENSING → FULFILLED) ───────────────────────

  /**
   * POST /dispenser/prescriptions/:id/fulfil
   * Mark the prescription as dispatched and fulfilled.
   *
   * Required: trackingNumber, courierName (UK dispensing record requirements).
   * Optional: dispensingNote.
   *
   * Guards (enforced by service):
   *   - Status must be DISPENSING
   *   - Prescription must be owned by this dispenser
   *   - expiryDate must not have passed
   *
   * Audit: PRESCRIPTION_FULFILLED logged with full diff including tracking info.
   */
  @Post('prescriptions/:id/fulfil')
  @HttpCode(HttpStatus.OK)
  async markFulfilled(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MarkFulfilledDto,
    @CurrentUser('id') dispenserId: string,
  ) {
    const prescription = await this.dispenserService.markFulfilled(id, dispenserId, dto);
    return {
      id: prescription.id,
      status: prescription.status,
      trackingNumber: prescription.trackingNumber,
      courierName: prescription.courierName,
      fulfilledAt: prescription.fulfilledAt,
    };
  }
}
