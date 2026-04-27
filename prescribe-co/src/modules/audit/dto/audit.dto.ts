import { Expose, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { AuditAction } from '../audit-action.enum';

/**
 * Internal DTO used by AuditService.log().
 * All fields except action, entityType, and entityId are optional —
 * the service layer enriches missing fields from the active request context.
 */
export interface CreateAuditLogDto {
  actorId: string | null;
  gphcNumber?: string | null;
  actorRole?: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

// ── Admin query ────────────────────────────────────────────────────────────────

export class AuditQueryDto {
  @IsOptional()
  @IsUUID('4')
  actorId?: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsUUID('4')
  entityId?: string;

  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @IsOptional()
  @IsString()
  gphcNumber?: string;

  /** ISO date string — lower bound on created_at */
  @IsOptional()
  @IsString()
  from?: string;

  /** ISO date string — upper bound on created_at */
  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 50;
}

// ── Response ──────────────────────────────────────────────────────────────────

export class AuditLogResponseDto {
  @Expose() id: string;
  @Expose() actorId: string | null;
  @Expose() gphcNumber: string | null;
  @Expose() actorRole: string | null;
  @Expose() action: AuditAction;
  @Expose() entityType: string;
  @Expose() entityId: string;
  @Expose() metadata: Record<string, unknown> | null;
  @Expose() ipAddress: string | null;
  @Expose() createdAt: Date;
}

export class PaginatedAuditLogsDto {
  @Expose() data: AuditLogResponseDto[];
  @Expose() total: number;
  @Expose() page: number;
  @Expose() limit: number;
  @Expose() totalPages: number;
}
