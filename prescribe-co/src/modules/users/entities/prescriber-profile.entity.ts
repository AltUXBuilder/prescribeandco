import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * Role-specific profile for users with role = PRESCRIBER.
 * Kept in a separate table so the base users table stays lean
 * and GPhC constraints are enforced cleanly.
 */
@Entity('prescriber_profiles')
export class PrescriberProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'char', length: 36 })
  userId: string;

  /** 7-digit GPhC registration number — mandatory, globally unique */
  @Index({ unique: true })
  @Column({ name: 'gphc_number', type: 'char', length: 7 })
  gphcNumber: string;

  @Column({ name: 'gphc_verified', type: 'tinyint', default: 0 })
  gphcVerified: boolean;

  @Column({ name: 'gphc_verified_at', type: 'timestamp', nullable: true })
  gphcVerifiedAt: Date | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  specialisation: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  organisation: string | null;

  @Column({ name: 'indemnity_ref', type: 'varchar', length: 100, nullable: true })
  indemnityRef: string | null;

  @Column({ name: 'indemnity_expiry', type: 'date', nullable: true })
  indemnityExpiry: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // ── Relations ──────────────────────────────────────────────────────────────

  @OneToOne(() => User, (user) => user.prescriberProfile)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
