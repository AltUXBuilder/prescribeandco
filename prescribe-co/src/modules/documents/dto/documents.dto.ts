import { Expose } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';
import { DocumentType, ScanStatus } from '../../../common/enums/prescription.enums';

/**
 * Sent alongside a multipart file upload.
 * The actual binary is handled by Multer; this DTO covers metadata.
 */
export class UploadDocumentDto {
  @IsEnum(DocumentType)
  documentType: DocumentType;
}

/**
 * Webhook body from the AV scanner (internal service).
 * Updates the scan_status of a document after async scanning.
 */
export class ScanWebhookDto {
  @IsEnum(ScanStatus)
  scanStatus: ScanStatus;

  @IsOptional()
  threatName?: string;
}

export class DocumentResponseDto {
  @Expose() id: string;
  @Expose() prescriptionRequestId: string;
  @Expose() documentType: DocumentType;
  @Expose() originalFilename: string;
  @Expose() mimeType: string;
  @Expose() fileSizeBytes: number;
  @Expose() scanStatus: ScanStatus;
  @Expose() uploadedAt: Date;
  /** Injected by the service — time-limited S3 pre-signed URL */
  @Expose() presignedUrl?: string;
}
