import { Expose, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  Max,
} from 'class-validator';
import { PrescriptionStatus } from '../../../common/enums/prescription.enums';

// ── Queue filter ──────────────────────────────────────────────────────────────

/**
 * Query params for GET /dispenser/queue.
 * Default status = APPROVED (the primary work queue).
 * DISPENSING returns in-progress items claimed by this dispenser.
 */
export class DispenserQueueQueryDto {
  @IsOptional()
  @IsEnum([PrescriptionStatus.APPROVED, PrescriptionStatus.DISPENSING])
  status?: PrescriptionStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 20;
}

// ── Claim (APPROVED → DISPENSING) ─────────────────────────────────────────────

/**
 * No required body — dispenser ID comes from the JWT.
 * Optional note field for handover context.
 */
export class ClaimForDispensingDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

// ── Mark as dispensed / shipped (DISPENSING → FULFILLED) ──────────────────────

/**
 * Required body when marking a prescription as fulfilled (shipped to customer).
 * Tracking number and courier are mandatory — UK pharmacy regulations require
 * a documented dispatch record for every POM dispensing.
 */
export class MarkFulfilledDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Tracking number must be at least 3 characters' })
  @MaxLength(100)
  trackingNumber: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  courierName: string;

  /**
   * Optional dispenser note — e.g. "Left with neighbour", "Requires cold chain".
   * Stored in prescriberNote (repurposed as general clinical notes field).
   */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  dispensingNote?: string;
}

// ── Update tracking (while DISPENSING) ───────────────────────────────────────

/**
 * Allows tracking info to be updated before the item ships.
 * All fields optional — only provided fields are updated.
 */
export class UpdateTrackingDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  trackingNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  courierName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  dispensingNote?: string;
}

// ── Response DTOs ─────────────────────────────────────────────────────────────

export class DispenserQueueItemDto {
  @Expose() id: string;
  @Expose() status: PrescriptionStatus;
  @Expose() approvedAt: Date | null;
  @Expose() submittedAt: Date | null;
  @Expose() createdAt: Date;
  @Expose() customerName: string;
  @Expose() deliveryPostcode: string | null;
  @Expose() productName: string;
  @Expose() medicineType: string;
  @Expose() dosageInstructions: string | null;
  @Expose() quantityDispensed: number | null;
  @Expose() expiryDate: Date | null;
  @Expose() dispenserId: string | null;
}

export class DispenserDetailDto {
  @Expose() id: string;
  @Expose() status: PrescriptionStatus;
  @Expose() customerId: string;
  @Expose() customerName: string;
  @Expose() customerNhsNumber: string | null;
  @Expose() productName: string;
  @Expose() medicineType: string;
  @Expose() bnfCode: string | null;
  @Expose() dosageInstructions: string | null;
  @Expose() quantityDispensed: number | null;
  @Expose() prescribedDate: Date | null;
  @Expose() expiryDate: Date | null;
  @Expose() deliveryAddressId: string | null;
  @Expose() dispenserId: string | null;
  @Expose() trackingNumber: string | null;
  @Expose() courierName: string | null;
  @Expose() dispensingStartedAt: Date | null;
  @Expose() fulfilledAt: Date | null;
  @Expose() approvedAt: Date | null;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
}

export class PaginatedDispenserQueueDto {
  @Expose() data: DispenserQueueItemDto[];
  @Expose() total: number;
  @Expose() page: number;
  @Expose() limit: number;
  @Expose() totalPages: number;
}
