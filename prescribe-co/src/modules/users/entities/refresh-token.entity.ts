import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * Persisted refresh tokens.
 * The raw token is NEVER stored — only its bcrypt hash.
 * On refresh: hash the incoming token and compare against stored hashes.
 * On logout: delete this row (single-device) or all rows for a user (all-devices).
 */
@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'char', length: 36 })
  userId: string;

  /** bcrypt hash of the raw refresh token */
  @Column({ name: 'token_hash', type: 'varchar', length: 255 })
  tokenHash: string;

  /** JWT ID claim — used for O(1) blacklist lookup */
  @Index({ unique: true })
  @Column({ type: 'char', length: 36 })
  jti: string;

  @Column({ name: 'user_agent', type: 'varchar', length: 500, nullable: true })
  userAgent: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({ name: 'revoked_at', type: 'timestamp', nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // ── Relations ──────────────────────────────────────────────────────────────

  @ManyToOne(() => User, (user) => user.refreshTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // ── Computed ───────────────────────────────────────────────────────────────

  get isExpired(): boolean {
    return this.expiresAt < new Date();
  }

  get isRevoked(): boolean {
    return this.revokedAt !== null;
  }

  get isValid(): boolean {
    return !this.isExpired && !this.isRevoked;
  }
}
