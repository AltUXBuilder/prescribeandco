import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Expose } from 'class-transformer';
import { Questionnaire } from './questionnaire.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Immutable record of a customer's answers to a versioned questionnaire.
 * Never UPDATE rows — if a customer re-submits, INSERT a new row.
 * The prescription flow references the most recent eligible response.
 */
@Entity('questionnaire_responses')
export class QuestionnaireResponse {
  @Expose()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Expose()
  @Index()
  @Column({ name: 'user_id', type: 'char', length: 36 })
  userId: string;

  @Expose()
  @Index()
  @Column({ name: 'questionnaire_id', type: 'char', length: 36 })
  questionnaireId: string;

  /** Snapshot of questionnaire version at submission time */
  @Expose()
  @Column({ name: 'questionnaire_version', type: 'tinyint', unsigned: true })
  questionnaireVersion: number;

  /**
   * Answers keyed by question ID: { "<question_uuid>": <answer_value> }
   * Value type depends on QuestionType:
   *   TEXT          → string
   *   BOOLEAN       → boolean
   *   SINGLE_CHOICE → string (option value)
   *   MULTI_CHOICE  → string[]
   *   SCALE         → number
   *   DATE          → ISO 8601 string
   */
  @Expose()
  @Column({ type: 'json' })
  answers: Record<string, unknown>;

  /**
   * Computed by the server after validating answers.
   * null = not yet evaluated (should never leave the service layer as null)
   */
  @Expose()
  @Column({ name: 'is_eligible', type: 'tinyint', nullable: true })
  isEligible: boolean | null;

  /** Human-readable summary of any disqualifying answers, for clinical review */
  @Expose()
  @Column({ name: 'ineligibility_reasons', type: 'json', nullable: true })
  ineligibilityReasons: string[] | null;

  @Expose()
  @Index()
  @Column({ name: 'submitted_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  submittedAt: Date;

  // ── Relations ──────────────────────────────────────────────────────────────

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Questionnaire, { eager: false })
  @JoinColumn({ name: 'questionnaire_id' })
  questionnaire: Questionnaire;
}
