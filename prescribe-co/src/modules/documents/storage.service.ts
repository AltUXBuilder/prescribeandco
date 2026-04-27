import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

export interface UploadedFile {
  s3Key: string;
  bucket: string;
  sizeBytes: number;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly presignedUrlTtlSeconds: number;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.get<string>('storage.bucket')!;
    this.presignedUrlTtlSeconds = config.get<number>('storage.presignedTtl') ?? 900; // 15 min

    this.s3 = new S3Client({
      region: config.get<string>('storage.region') ?? 'eu-west-2',
      credentials: {
        accessKeyId: config.get<string>('storage.accessKeyId')!,
        secretAccessKey: config.get<string>('storage.secretAccessKey')!,
      },
    });
  }

  /**
   * Upload a file buffer to S3.
   * Key pattern: prescriptions/<prescriptionId>/documents/<uuid>.<ext>
   * Never expose this key publicly — always serve via pre-signed URLs.
   */
  async upload(
    prescriptionId: string,
    originalFilename: string,
    mimeType: string,
    buffer: Buffer,
  ): Promise<UploadedFile> {
    const ext = originalFilename.split('.').pop() ?? 'bin';
    const s3Key = `prescriptions/${prescriptionId}/documents/${uuidv4()}.${ext}`;

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: s3Key,
          Body: buffer,
          ContentType: mimeType,
          // Server-side encryption
          ServerSideEncryption: 'AES256',
          // Metadata for audit trail
          Metadata: {
            'original-filename': encodeURIComponent(originalFilename),
            'prescription-id': prescriptionId,
          },
        }),
      );

      return { s3Key, bucket: this.bucket, sizeBytes: buffer.byteLength };
    } catch (err) {
      this.logger.error(`S3 upload failed for prescription ${prescriptionId}`, err);
      throw new InternalServerErrorException('Document upload failed. Please try again.');
    }
  }

  /**
   * Generate a time-limited pre-signed GET URL.
   * Default TTL: 15 minutes (configurable via storage.presignedTtl).
   * Never cache these — regenerate on every request.
   */
  async generatePresignedUrl(s3Key: string): Promise<string> {
    try {
      return await getSignedUrl(
        this.s3,
        new GetObjectCommand({ Bucket: this.bucket, Key: s3Key }),
        { expiresIn: this.presignedUrlTtlSeconds },
      );
    } catch (err) {
      this.logger.error(`Failed to generate pre-signed URL for ${s3Key}`, err);
      throw new InternalServerErrorException('Could not generate document URL');
    }
  }

  /**
   * Delete a document from S3.
   * Called when a DRAFT prescription is cancelled before submission.
   */
  async delete(s3Key: string): Promise<void> {
    try {
      await this.s3.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: s3Key }),
      );
    } catch (err) {
      // Log but don't throw — orphaned S3 objects are preferable to blocking UX
      this.logger.warn(`S3 delete failed for key ${s3Key}`, err);
    }
  }
}
