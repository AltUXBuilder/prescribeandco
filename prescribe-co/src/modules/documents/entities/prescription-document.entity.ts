import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Expose } from 'class-transformer';
import { DocumentType, ScanStatus } from '../../../common/enums/prescription.enums';
import { PrescriptionRequest } from '../../prescriptions/entities/prescription-request.entity';
import { User } from '../../users/entities/user.entity';

@Entity('prescription_documents')
export class PrescriptionDocument {
  @Expose()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Expose()
  @Index()
  @Column({ name: 'prescription_request_id', type: 'char', length: 36 })
  prescriptionRequestId: string;

  @Expose()
  @Index()
  @Column({ name: 'uploader_id', type: 'char', length: 36 })
  uploaderId: string;

  @Expose()
  @Column({
    name: 'document_type',
    type: 'enum',
    enum: DocumentType,
    default: DocumentType.OTHER,
  })
  documentType: DocumentType;

  /**
   * S3 object key. Never returned to the client directly —
   * use DocumentsService.generatePresignedUrl() for time-limited access.
   */
  @Column({ name: 's3_key', type: 'varchar', length: 500 })
  s3Key: string;

  @Expose()
  @Column({ name: 'original_filename', type: 'varchar', length: 255 })
  originalFilename: string;

  @Expose()
  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType: string;

  @Expose()
  @Column({ name: 'file_size_bytes', type: 'int', unsigned: true })
  fileSizeBytes: number;

  /**
   * Virus scan lifecycle.
   * Files start as PENDING; an async webhook from the AV scanner updates this.
   * A prescription cannot be submitted until all PENDING scans resolve.
   */
  @Expose()
  @Index()
  @Column({
    name: 'scan_status',
    type: 'enum',
    enum: ScanStatus,
    default: ScanStatus.PENDING,
  })
  scanStatus: ScanStatus;

  @Column({ name: 'scan_completed_at', type: 'timestamp', nullable: true })
  scanCompletedAt: Date | null;

  @Expose()
  @Column({ name: 'uploaded_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  uploadedAt: Date;

  // ── Relations ──────────────────────────────────────────────────────────────

  @ManyToOne(() => PrescriptionRequest, (pr) => pr.documents, { eager: false })
  @JoinColumn({ name: 'prescription_request_id' })
  prescriptionRequest: PrescriptionRequest;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'uploader_id' })
  uploader: User;
}
