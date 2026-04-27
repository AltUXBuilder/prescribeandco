import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AuditService } from './audit.service';
import { AuditHelper } from './audit.helper';
import { AuditInterceptor } from './interceptors/audit.interceptor';
import { AuditController } from './audit.controller';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AuditController],
  providers: [AuditService, AuditHelper, AuditInterceptor],
  exports: [AuditService, AuditHelper, AuditInterceptor],
})
export class AuditModule {}
