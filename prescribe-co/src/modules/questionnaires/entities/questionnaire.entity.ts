import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Expose, Type } from 'class-transformer';
import { QuestionnaireSchema } from '../../../common/types/questionnaire-schema.types';
import { User } from '../../users/entities/user.entity';

@Entity('questionnaires')
export class Questionnaire {
  @Expose()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Expose()
  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Expose()
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Full question schema stored as a single JSON column.
   * Versioned inside the JSON so historic responses remain interpretable
   * even after questions are added or reordered.
   */
  @Expose()
  @Column({ type: 'json' })
  schema: QuestionnaireSchema;

  /**
   * Incremented by the service on every schema change.
   * Stored redundantly at the row level for fast version queries.
   */
  @Expose()
  @Column({ type: 'tinyint', unsigned: true, default: 1 })
  version: number;

  @Expose()
  @Index()
  @Column({ name: 'is_active', type: 'tinyint', default: 1 })
  isActive: boolean;

  @Column({ name: 'created_by', type: 'char', length: 36, nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // ── Relations ──────────────────────────────────────────────────────────────

  @ManyToOne(() => User, { nullable: true, eager: false })
  @JoinColumn({ name: 'created_by' })
  creator: User | null;
}
