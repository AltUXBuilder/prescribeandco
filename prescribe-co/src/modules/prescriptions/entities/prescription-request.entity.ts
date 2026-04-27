import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Expose } from 'class-transformer';
import {
  EligibilityStatus,
  PrescriptionStatus,
} from '../../../common/enums/prescription.enums';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';
import { QuestionnaireResponse } from '../../questionnaires/entities/questionnaire-response.entity';
import { PrescriptionDocument } from '../../documents/entities/prescription-document.entity';

@Entity('prescription_requests')
export class PrescriptionRequest {
  @Expose()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ── Ownership ──────────────────────────────────────────────────────────────

  @Expose()
  @Index()
  @Column({ name: 'customer_id', type: 'char', length: 36 })
  customerId: string;

  @Expose()
  @Index()
  @Column({ name: 'product_id', type: 'char', length: 36 })
  productId: string;

  // ── Questionnaire linkage ──────────────────────────────────────────────────

  /**
   * FK to the questionnaire_responses row submitted during this request flow.
   * Nullable for products that don't require a questionnaire.
   */
  @Expose()
  @Column({ name: 'questionnaire_response_id', type: 'char', length: 36, nullable: true })
  questionnaireResponseId: string | null;

  // ── Delivery ───────────────────────────────────────────────────────────────

  @Expose()
  @Column({ name: 'delivery_address_id', type: 'char', length: 36, nullable: true })
  deliveryAddressId: string | null;

  // ── Status state machine ───────────────────────────────────────────────────

  @Expose()
  @Index()
  @Column({
    type: 'enum',
    enum: PrescriptionStatus,
    default: PrescriptionStatus.DRAFT,
  })
  status: PrescriptionStatus;

  /**
   * Computed at submission from the questionnaire response.
   * PASS  → no flags, proceed normally
   * FLAG  → borderline answers, prescriber alerted but can still approve
   * FAIL  → disqualifying answers present, prescriber must review carefully
   * null  → no questionnaire was required for this product
   */
  @Expose()
  @Index()
  @Column({
    name: 'eligibility_status',
    type: 'enum',
    enum: EligibilityStatus,
    nullable: true,
  })
  eligibilityStatus: EligibilityStatus | null;

  /**
   * JSON array of reason strings for FAIL/FLAG eligibility.
   * Sourced from questionnaire validator's ineligibilityReasons output.
   * Shown to the prescriber during clinical review.
   */
  @Expose()
  @Column({ name: 'eligibility_notes', type: 'json', nullable: true })
  eligibilityNotes: string[] | null;

  // ── Clinical fields (populated by prescriber — not set here) ──────────────

  @Expose()
  @Index()
  @Column({ name: 'prescriber_id', type: 'char', length: 36, nullable: true })
  prescriberId: string | null;

  @Expose()
  @Index()
  @Column({ name: 'dispenser_id', type: 'char', length: 36, nullable: true })
  dispenserId: string | null;

  @Column({ name: 'prescribed_date', type: 'date', nullable: true })
  prescribedDate: Date | null;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: Date | null;

  @Column({ name: 'dosage_instructions', type: 'text', nullable: true })
  dosageInstructions: string | null;

  @Column({ name: 'quantity_dispensed', type: 'smallint', unsigned: true, nullable: true })
  quantityDispensed: number | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'prescriber_note', type: 'text', nullable: true })
  prescriberNote: string | null;

  // ── Customer note at submission ────────────────────────────────────────────

  @Expose()
  @Column({ name: 'customer_note', type: 'text', nullable: true })
  customerNote: string | null;

  // ── Lifecycle timestamps ───────────────────────────────────────────────────
  // De-normalised for fast SLA queries without touching audit_logs.

  @Expose()
  @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
  submittedAt: Date | null;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt: Date | null;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'dispensing_started_at', type: 'timestamp', nullable: true })
  dispensingStartedAt: Date | null;

  @Column({ name: 'fulfilled_at', type: 'timestamp', nullable: true })
  fulfilledAt: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt: Date | null;

  // ── Tracking ───────────────────────────────────────────────────────────────

  @Column({ name: 'tracking_number', type: 'varchar', length: 100, nullable: true })
  trackingNumber: string | null;

  @Column({ name: 'courier_name', type: 'varchar', length: 100, nullable: true })
  courierName: string | null;

  // ── Timestamps ─────────────────────────────────────────────────────────────

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // ── Relations ──────────────────────────────────────────────────────────────

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  @ManyToOne(() => Product, { eager: false })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => QuestionnaireResponse, { eager: false, nullable: true })
  @JoinColumn({ name: 'questionnaire_response_id' })
  questionnaireResponse: QuestionnaireResponse | null;

  @OneToMany(() => PrescriptionDocument, (doc) => doc.prescriptionRequest, {
    cascade: ['insert'],
    eager: false,
  })
  documents: PrescriptionDocument[];

  // ── Computed helpers ───────────────────────────────────────────────────────

  get isEditable(): boolean {
    return this.status === PrescriptionStatus.DRAFT;
  }

  get isCancellable(): boolean {
    return [
      PrescriptionStatus.DRAFT,
      PrescriptionStatus.SUBMITTED,
    ].includes(this.status);
  }
}
