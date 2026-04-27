import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { AuditLog } from './entities/audit-log.entity';
import { AuditAction } from './audit-action.enum';
import {
  AuditLogResponseDto,
  AuditQueryDto,
  CreateAuditLogDto,
  PaginatedAuditLogsDto,
} from './dto/audit.dto';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  /**
   * Append an immutable audit record.
   *
   * Never throws — a logging failure must never block a business operation.
   * Errors are captured and logged to the application logger instead.
   *
   * Called directly from service methods (not via an interceptor) so that
   * the exact before/after state diff is available at the call site.
   */
  async log(dto: CreateAuditLogDto): Promise<void> {
    try {
      const record = this.auditRepo.create({
        actorId: dto.actorId,
        gphcNumber: dto.gphcNumber ?? null,
        actorRole: dto.actorRole ?? null,
        action: dto.action,
        entityType: dto.entityType,
        entityId: dto.entityId,
        beforeState: dto.beforeState ?? null,
        afterState: dto.afterState ?? null,
        metadata: dto.metadata ?? null,
        ipAddress: dto.ipAddress ?? null,
        userAgent: dto.userAgent ?? null,
      });

      await this.auditRepo.save(record);
    } catch (err) {
      // Swallow — audit failure must not block the caller
      this.logger.error(
        `Audit log failed for action=${dto.action} entity=${dto.entityType}:${dto.entityId}`,
        err,
      );
    }
  }

  /**
   * Convenience wrapper for prescriber actions.
   * Automatically populates gphcNumber and actorRole.
   */
  async logPrescriberAction(params: {
    prescriberId: string;
    gphcNumber: string;
    action: AuditAction;
    prescriptionId: string;
    beforeState: Record<string, unknown>;
    afterState: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.log({
      actorId: params.prescriberId,
      gphcNumber: params.gphcNumber,
      actorRole: 'PRESCRIBER',
      action: params.action,
      entityType: 'prescription_requests',
      entityId: params.prescriptionId,
      beforeState: params.beforeState,
      afterState: params.afterState,
      metadata: params.metadata ?? null,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  // ── Read (Admin) ────────────────────────────────────────────────────────────

  async query(dto: AuditQueryDto): Promise<PaginatedAuditLogsDto> {
    const { page = 1, limit = 50, from, to, ...filters } = dto;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<AuditLog> = {};

    if (filters.actorId)    where.actorId    = filters.actorId;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId)   where.entityId   = filters.entityId;
    if (filters.action)     where.action     = filters.action;
    if (filters.gphcNumber) where.gphcNumber = filters.gphcNumber;

    if (from || to) {
      const start = from ? new Date(from) : new Date('2000-01-01');
      const end   = to   ? new Date(to)   : new Date();
      where.createdAt = Between(start, end);
    }

    const [records, total] = await this.auditRepo.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const data = records.map((r) =>
      plainToInstance(AuditLogResponseDto, r, { excludeExtraneousValues: true }),
    );

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** Fetch the complete audit trail for a single entity (e.g. one prescription) */
  async getEntityHistory(
    entityType: string,
    entityId: string,
  ): Promise<AuditLogResponseDto[]> {
    const records = await this.auditRepo.find({
      where: { entityType, entityId },
      order: { createdAt: 'ASC' },
    });

    return records.map((r) =>
      plainToInstance(AuditLogResponseDto, r, { excludeExtraneousValues: true }),
    );
  }
}
