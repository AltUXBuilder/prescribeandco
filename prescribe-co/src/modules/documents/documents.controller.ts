import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { DocumentsService } from './documents.service';
import { FileValidationPipe } from './pipes/file-validation.pipe';
import { DocumentResponseDto, ScanWebhookDto, UploadDocumentDto } from './dto/documents.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { User } from '../users/entities/user.entity';
import { PrescriptionsService } from '../prescriptions/prescriptions.service';

@UseInterceptors(ClassSerializerInterceptor)
@Controller('prescriptions/:prescriptionId/documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly prescriptionsService: PrescriptionsService,
  ) {}

  /**
   * POST /prescriptions/:prescriptionId/documents
   * CUSTOMER — upload a document to a DRAFT prescription request.
   *
   * Multipart form-data:
   *   - file: binary
   *   - documentType: DocumentType enum value
   *
   * Uses memoryStorage so we can pass the buffer directly to S3.
   * Max file size and MIME type are enforced by FileValidationPipe.
   */
  @Post()
  @Roles(Role.CUSTOMER)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB Multer-level limit
    }),
  )
  async upload(
    @Param('prescriptionId', ParseUUIDPipe) prescriptionId: string,
    @UploadedFile(new FileValidationPipe()) file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
    @CurrentUser() user: User,
  ): Promise<DocumentResponseDto> {
    // Fetch the prescription to validate ownership and status
    const prescription = await this.prescriptionsService.findMyPrescriptionById(
      prescriptionId,
      user.id,
    );

    const doc = await this.documentsService.upload(
      prescriptionId,
      user.id,
      prescription.status,
      prescription.customerId,
      file,
      dto.documentType,
    );

    return this.documentsService.toResponseDto(doc);
  }

  /**
   * GET /prescriptions/:prescriptionId/documents
   * CUSTOMER — list all documents attached to a prescription request.
   * Includes pre-signed S3 URLs for CLEAN documents.
   */
  @Get()
  @Roles(Role.CUSTOMER)
  async findAll(
    @Param('prescriptionId', ParseUUIDPipe) prescriptionId: string,
    @CurrentUser('id') userId: string,
  ): Promise<DocumentResponseDto[]> {
    // Ownership check via prescriptions service
    await this.prescriptionsService.findMyPrescriptionById(prescriptionId, userId);

    const docs = await this.documentsService.findByPrescription(prescriptionId);
    const enriched = await this.documentsService.enrichWithPresignedUrls(docs);

    return enriched.map((d) => this.documentsService.toResponseDto(d, d.presignedUrl));
  }

  /**
   * DELETE /prescriptions/:prescriptionId/documents/:documentId
   * CUSTOMER — remove a document from a DRAFT prescription request.
   * Also deletes the file from S3.
   */
  @Delete(':documentId')
  @Roles(Role.CUSTOMER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('prescriptionId', ParseUUIDPipe) prescriptionId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    const prescription = await this.prescriptionsService.findMyPrescriptionById(
      prescriptionId,
      userId,
    );
    await this.documentsService.remove(documentId, userId, prescription.status);
  }

  /**
   * POST /prescriptions/:prescriptionId/documents/:documentId/scan-result
   * ADMIN only — internal webhook endpoint called by the AV scanner service.
   * In production, this route should additionally verify a shared secret header.
   */
  @Post(':documentId/scan-result')
  @Roles(Role.ADMIN)
  async updateScanResult(
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() dto: ScanWebhookDto,
  ): Promise<DocumentResponseDto> {
    const doc = await this.documentsService.updateScanStatus(documentId, dto);
    return this.documentsService.toResponseDto(doc);
  }
}
