import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Expose } from 'class-transformer';
import { AuditAction } from '../audit-action.enum';
import { User } from '../../../users/entities/user.entity';

/**
 * Immutable audit record. Rows are NEVER updated or deleted.
 *
 * Key design decisions:
 *   - actor_id FK uses ON DELETE SET NULL so logs survive user deletion (GDPR purge)
 *   - gphc_number is denormalised here so the clinical record is self-contained
 *     even if the prescriber profile is later modified
 *   - before_state / after_state are JSON snapshots for full diff capability
 *   - metadata is a flexible bag for extra context (e.g. override_reason, ip_country)
 */
@Entity('audit_logs')
export class AuditLog {
  @Expose()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * The user who performed the action.
   * Null for system-initiated events (expiry cron, AV scanner webhook).
   */
  @Expose()
  @Index()
  @Column({ name: 'actor_id', type: 'char', length: 36, nullable: true })
  actorId: string | null;

  /**
   * Denormalised GPhC number — populated when actor is a PRESCRIBER.
   * Critical for regulatory audit trails; must survive prescriber profile edits.
   */
  @Expose()
  @Index()
  @Column({ name: 'gphc_number', type: 'char', length: 7, nullable: true })
  gphcNumber: string | null;

  /** Denormalised actor role at time of action */
  @Expose()
  @Column({ name: 'actor_role', type: 'varchar', length: 20, nullable: true })
  actorRole: string | null;

  @Expose()
  @Index()
  @Column({ type: 'varchar', length: 100 })
  action: AuditAction;

  /** Table name of the affected entity (e.g. "prescription_requests") */
  @Expose()
  @Index()
  @Column({ name: 'entity_type', type: 'varchar', length: 100 })
  entityType: string;

  @Expose()
  @Index()
  @Column({ name: 'entity_id', type: 'char', length: 36 })
  entityId: string;

  /** Full entity state before the action (null for CREATE actions) */
  @Column({ name: 'before_state', type: 'json', nullable: true })
  beforeState: Record<string, unknown> | null;

  /** Full entity state after the action (null for DELETE/READ actions) */
  @Column({ name: 'after_state', type: 'json', nullable: true })
  afterState: Record<string, unknown> | null;

  /**
   * Flexible context bag. Examples:
   *   { rejectionReason, eligibilityOverride, requestedInfoDetail }
   *   { ipCountry, sessionId, userAgent }
   */
  @Expose()
  @Column({ type: 'json', nullable: true })
  metadata: Record<string, unknown> | null;

  /** IPv4 or IPv6 — supports both formats */
  @Expose()
  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 500, nullable: true })
  userAgent: string | null;

  @Expose()
  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // ── Relations ──────────────────────────────────────────────────────────────

  @ManyToOne(() => User, { nullable: true, eager: false })
  @JoinColumn({ name: 'actor_id' })
  actor: User | null;
}
