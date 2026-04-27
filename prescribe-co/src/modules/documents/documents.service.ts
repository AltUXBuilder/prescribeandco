import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrescriptionDocument } from './entities/prescription-document.entity';
import { StorageService } from './storage.service';
import { DocumentType, ScanStatus } from '../../common/enums/prescription.enums';
import { PrescriptionStatus } from '../../common/enums/prescription.enums';
import { DocumentResponseDto, ScanWebhookDto } from './dto/documents.dto';
import { plainToInstance } from 'class-transformer';
import { AuditHelper } from '../audit/audit.helper';

/** Max documents per prescription request */
const MAX_DOCS_PER_REQUEST = 10;

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(PrescriptionDocument)
    private readonly documentRepo: Repository<PrescriptionDocument>,

    private readonly storageService: StorageService,
    private readonly auditHelper: AuditHelper,
  ) {}

  // ── Upload ──────────────────────────────────────────────────────────────────

  /**
   * Upload a document to S3 and record metadata in the DB.
   * Guards:
   *   - Prescription must be in DRAFT status
   *   - Uploader must own the prescription
   *   - Max 10 documents per request
   */
  async upload(
    prescriptionRequestId: string,
    uploaderId: string,
    prescriptionStatus: PrescriptionStatus,
    prescriptionCustomerId: string,
    file: Express.Multer.File,
    documentType: DocumentType,
  ): Promise<PrescriptionDocument> {
    // Ownership check
    if (prescriptionCustomerId !== uploaderId) {
      throw new ForbiddenException('You can only upload documents to your own prescription requests');
    }

    // Status guard
    if (prescriptionStatus !== PrescriptionStatus.DRAFT) {
      throw new BadRequestException(
        'Documents can only be added to DRAFT prescription requests',
      );
    }

    // Cap total documents
    const existingCount = await this.documentRepo.count({
      where: { prescriptionRequestId },
    });
    if (existingCount >= MAX_DOCS_PER_REQUEST) {
      throw new BadRequestException(
        `A maximum of ${MAX_DOCS_PER_REQUEST} documents are allowed per prescription request`,
      );
    }

    // Upload to S3
    const { s3Key } = await this.storageService.upload(
      prescriptionRequestId,
      file.originalname,
      file.mimetype,
      file.buffer,
    );

    // Persist metadata
    const doc = this.documentRepo.create({
      prescriptionRequestId,
      uploaderId,
      documentType,
      s3Key,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      scanStatus: ScanStatus.PENDING,
    });

    const saved = await this.documentRepo.save(doc);
    await this.auditHelper.logDocumentUploaded(
      uploaderId, saved.id, prescriptionRequestId, documentType, file.originalname,
    );
    return saved;
  }

  // ── Read ────────────────────────────────────────────────────────────────────

  async findByPrescription(
    prescriptionRequestId: string,
  ): Promise<PrescriptionDocument[]> {
    return this.documentRepo.find({
      where: { prescriptionRequestId },
      order: { uploadedAt: 'ASC' },
    });
  }

  async findById(id: string): Promise<PrescriptionDocument> {
    const doc = await this.documentRepo.findOne({ where: { id } });
    if (!doc) throw new NotFoundException(`Document ${id} not found`);
    return doc;
  }

  /**
   * Generate a pre-signed URL for a document.
   * Caller must have already verified the requester has access to the
   * parent prescription request.
   */
  async getPresignedUrl(id: string, requesterId: string): Promise<string> {
    const doc = await this.findById(id);

    if (doc.uploaderId !== requesterId) {
      // Admins and prescribers bypass this via their own controller checks
      throw new ForbiddenException('You do not have access to this document');
    }

    if (doc.scanStatus === ScanStatus.INFECTED) {
      throw new BadRequestException('This document failed virus scanning and cannot be accessed');
    }

    return this.storageService.generatePresignedUrl(doc.s3Key);
  }

  /**
   * Generate pre-signed URLs for a batch of documents.
   * Used when loading a prescription detail view (avoids N+1 URL calls).
   * Skips infected documents silently.
   */
  async enrichWithPresignedUrls(
    docs: PrescriptionDocument[],
  ): Promise<Array<PrescriptionDocument & { presignedUrl?: string }>> {
    return Promise.all(
      docs.map(async (doc) => {
        if (doc.scanStatus === ScanStatus.INFECTED) {
          return { ...doc, presignedUrl: undefined };
        }
        const presignedUrl = await this.storageService.generatePresignedUrl(doc.s3Key);
        return { ...doc, presignedUrl };
      }),
    );
  }

  // ── AV scan webhook ─────────────────────────────────────────────────────────

  /**
   * Called by the async AV scanner webhook after scanning completes.
   * Updates scan_status to CLEAN or INFECTED.
   * Infected documents are flagged but not deleted — retained for audit.
   */
  async updateScanStatus(id: string, dto: ScanWebhookDto): Promise<PrescriptionDocument> {
    const doc = await this.findById(id);

    doc.scanStatus = dto.scanStatus;
    doc.scanCompletedAt = new Date();

    const saved = await this.documentRepo.save(doc);
    await this.auditHelper.logDocumentScanCompleted(id, dto.scanStatus, doc.originalFilename);
    return saved;
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  async remove(
    id: string,
    requesterId: string,
    prescriptionStatus: PrescriptionStatus,
  ): Promise<void> {
    const doc = await this.findById(id);

    if (doc.uploaderId !== requesterId) {
      throw new ForbiddenException('You can only delete your own documents');
    }

    if (prescriptionStatus !== PrescriptionStatus.DRAFT) {
      throw new BadRequestException(
        'Documents can only be removed from DRAFT prescription requests',
      );
    }

    await this.auditHelper.logDocumentDeleted(
      requesterId, id, doc.prescriptionRequestId, doc.originalFilename,
    );
    await this.storageService.delete(doc.s3Key);
    await this.documentRepo.remove(doc);
  }

  // ── Internal helpers ────────────────────────────────────────────────────────

  /**
   * Check all documents attached to a prescription are CLEAN.
   * Called by PrescriptionsService.submit() as a pre-flight gate.
   */
  async assertAllDocumentsClean(prescriptionRequestId: string): Promise<void> {
    const docs = await this.findByPrescription(prescriptionRequestId);

    const pending = docs.filter((d) => d.scanStatus === ScanStatus.PENDING);
    if (pending.length > 0) {
      throw new BadRequestException(
        `${pending.length} document(s) are still being scanned for viruses. ` +
          'Please wait a moment and try again.',
      );
    }

    const infected = docs.filter((d) => d.scanStatus === ScanStatus.INFECTED);
    if (infected.length > 0) {
      throw new BadRequestException(
        `${infected.length} document(s) failed virus scanning and must be removed before submission.`,
      );
    }
  }

  toResponseDto(doc: PrescriptionDocument, presignedUrl?: string): DocumentResponseDto {
    return plainToInstance(
      DocumentResponseDto,
      { ...doc, presignedUrl },
      { excludeExtraneousValues: true },
    );
  }
}
