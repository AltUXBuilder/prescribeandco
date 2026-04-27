import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrescriberService } from './prescriber.service';
import { PrescriberController } from './prescriber.controller';
import { PrescriberGuard } from './prescriber.guard';
import { PrescriptionRequest } from '../prescriptions/entities/prescription-request.entity';
import { PrescriberProfile } from '../users/entities/prescriber-profile.entity';
import { PrescriptionsModule } from '../prescriptions/prescriptions.module';
import { DocumentsModule } from '../documents/documents.module';
import { PaymentsModule } from '../payments/payments.module';
// AuditService is globally provided by AuditModule (@Global) — no import needed

@Module({
  imports: [
    TypeOrmModule.forFeature([PrescriptionRequest, PrescriberProfile]),
    PrescriptionsModule,
    DocumentsModule,
    forwardRef(() => PaymentsModule),
  ],
  controllers: [PrescriberController],
  providers: [PrescriberService, PrescriberGuard],
  exports: [PrescriberService],
})
export class PrescriberModule {}
