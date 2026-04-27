import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditQueryDto, AuditLogResponseDto, PaginatedAuditLogsDto } from './dto/audit.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@UseInterceptors(ClassSerializerInterceptor)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * GET /audit
   * ADMIN only — query audit logs with flexible filters.
   *
   * Filter examples:
   *   ?action=PRESCRIPTION_APPROVED
   *   ?gphcNumber=1234567&from=2024-01-01
   *   ?entityType=prescription_requests&entityId=<uuid>
   */
  @Get()
  @Roles(Role.ADMIN)
  async query(@Query() dto: AuditQueryDto): Promise<PaginatedAuditLogsDto> {
    return this.auditService.query(dto);
  }

  /**
   * GET /audit/prescriptions/:id/history
   * ADMIN + PRESCRIBER — full chronological trail for a single prescription.
   * Used by the prescriber review screen to show what's happened to the request.
   */
  @Get('prescriptions/:id/history')
  @Roles(Role.ADMIN, Role.PRESCRIBER)
  async getPrescriptionHistory(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AuditLogResponseDto[]> {
    return this.auditService.getEntityHistory('prescription_requests', id);
  }

  /**
   * GET /audit/users/:id/history
   * ADMIN only — full activity trail for a user account.
   */
  @Get('users/:id/history')
  @Roles(Role.ADMIN)
  async getUserHistory(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AuditLogResponseDto[]> {
    return this.auditService.getEntityHistory('users', id);
  }
}
