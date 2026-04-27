import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrescriptionDocument } from './entities/prescription-document.entity';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { StorageService } from './storage.service';
import { PrescriptionsModule } from '../prescriptions/prescriptions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PrescriptionDocument]),
    // Circular ref: DocumentsController needs PrescriptionsService for ownership checks;
    // PrescriptionsService needs DocumentsService for scan gate.
    forwardRef(() => PrescriptionsModule),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, StorageService],
  exports: [DocumentsService, StorageService],
})
export class DocumentsModule {}
