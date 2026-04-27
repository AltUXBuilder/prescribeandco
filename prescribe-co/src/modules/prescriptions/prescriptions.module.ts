import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrescriptionRequest } from './entities/prescription-request.entity';
import { PrescriptionsService } from './prescriptions.service';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionStateMachine } from './services/prescription-state-machine.service';
import { EligibilityCalculator } from './services/eligibility-calculator.service';
import { ProductsModule } from '../products/products.module';
import { QuestionnairesModule } from '../questionnaires/questionnaires.module';
import { DocumentsModule } from '../documents/documents.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PrescriptionRequest]),
    ProductsModule,
    QuestionnairesModule,
    forwardRef(() => DocumentsModule),
    forwardRef(() => PaymentsModule),
  ],
  controllers: [PrescriptionsController],
  providers: [
    PrescriptionsService,
    PrescriptionStateMachine,
    EligibilityCalculator,
  ],
  exports: [PrescriptionsService, PrescriptionStateMachine],
})
export class PrescriptionsModule {}
