import { Expose, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  EligibilityStatus,
  PrescriptionStatus,
} from '../../../common/enums/prescription.enums';

// ── Create (DRAFT) ────────────────────────────────────────────────────────────

/**
 * Initial request body to create a DRAFT prescription request.
 * The customer chooses a product and optionally provides a delivery address.
 * Documents are uploaded separately; the request is submitted in a final step.
 */
export class CreatePrescriptionRequestDto {
  @IsUUID('4')
  productId: string;

  @IsOptional()
  @IsUUID('4')
  deliveryAddressId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  customerNote?: string;
}

// ── Attach questionnaire response ──────────────────────────────────────────

/**
 * Links a previously-submitted questionnaire response to a DRAFT request.
 * Called after the customer completes the questionnaire flow.
 */
export class AttachQuestionnaireResponseDto {
  @IsUUID('4')
  questionnaireResponseId: string;
}

import { AuthorisePaymentDto } from '../../payments/dto/payments.dto';

// ── Submit (DRAFT → SUBMITTED) ────────────────────────────────────────────────

/**
 * Finalises the draft and moves it to SUBMITTED.
 * Pre-flight validation runs before the status change.
 */
export class SubmitPrescriptionRequestDto {
  /**
   * Optional final delivery address override.
   * If already set on the draft, this field can be omitted.
   */
  @IsOptional()
  @IsUUID('4')
  deliveryAddressId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  customerNote?: string;

  /**
   * Payment details — required when product.pricePence > 0.
   * For EXEMPT / NHS_VOUCHER, paymentMethodToken may be omitted.
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => AuthorisePaymentDto)
  payment?: AuthorisePaymentDto;
}

// ── Cancel ────────────────────────────────────────────────────────────────────

export class CancelPrescriptionRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}

// ── Query filter (customer list) ──────────────────────────────────────────────

export class PrescriptionQueryDto {
  @IsOptional()
  @IsEnum(PrescriptionStatus)
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

// ── Responses ─────────────────────────────────────────────────────────────────

export class PrescriptionDocumentSummaryDto {
  @Expose() id: string;
  @Expose() documentType: string;
  @Expose() originalFilename: string;
  @Expose() mimeType: string;
  @Expose() fileSizeBytes: number;
  @Expose() scanStatus: string;
  @Expose() uploadedAt: Date;
  /** Pre-signed URL is injected by the service, not stored in the entity */
  @Expose() presignedUrl?: string;
}

export class PrescriptionRequestResponseDto {
  @Expose() id: string;
  @Expose() customerId: string;
  @Expose() productId: string;
  @Expose() questionnaireResponseId: string | null;
  @Expose() deliveryAddressId: string | null;
  @Expose() status: PrescriptionStatus;
  @Expose() eligibilityStatus: EligibilityStatus | null;
  @Expose() eligibilityNotes: string[] | null;
  @Expose() customerNote: string | null;
  @Expose() submittedAt: Date | null;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
  @Expose() @Type(() => PrescriptionDocumentSummaryDto) documents: PrescriptionDocumentSummaryDto[];
}

export class PaginatedPrescriptionsDto {
  @Expose() data: PrescriptionRequestResponseDto[];
  @Expose() total: number;
  @Expose() page: number;
  @Expose() limit: number;
  @Expose() totalPages: number;
}
