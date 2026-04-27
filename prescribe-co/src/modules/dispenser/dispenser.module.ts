import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DispenserService } from './dispenser.service';
import { DispenserController } from './dispenser.controller';
import { PrescriptionRequest } from '../prescriptions/entities/prescription-request.entity';
import { PrescriptionsModule } from '../prescriptions/prescriptions.module';
// AuditService is globally provided by AuditModule (@Global) — no import needed

@Module({
  imports: [
    TypeOrmModule.forFeature([PrescriptionRequest]),
    PrescriptionsModule, // provides PrescriptionStateMachine
  ],
  controllers: [DispenserController],
  providers: [DispenserService],
  exports: [DispenserService],
})
export class DispenserModule {}
