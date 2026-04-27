import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

/** 10 MB */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Validates a Multer Express.Multer.File before it is passed to the service.
 * Checks:
 *   - File is present
 *   - MIME type is in the allowed list (JPEG, PNG, WebP, PDF)
 *   - File size does not exceed 10 MB
 *
 * Usage: @UploadedFile(new FileValidationPipe()) file: Express.Multer.File
 */
@Injectable()
export class FileValidationPipe implements PipeTransform {
  transform(file: Express.Multer.File, _metadata: ArgumentMetadata): Express.Multer.File {
    if (!file) {
      throw new BadRequestException('A file must be attached to this request');
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        `File type "${file.mimetype}" is not accepted. ` +
          `Allowed types: JPEG, PNG, WebP, PDF`,
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `File size ${(file.size / 1024 / 1024).toFixed(1)} MB exceeds the 10 MB limit`,
      );
    }

    return file;
  }
}
