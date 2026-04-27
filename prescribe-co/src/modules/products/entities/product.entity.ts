import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Expose } from 'class-transformer';
import { MedicineType, ProductStatus } from '../../../common/enums/medicine-type.enum';
import { Category } from './category.entity';
import { Questionnaire } from '../../questionnaires/entities/questionnaire.entity';

@Entity('products')
export class Product {
  @Expose()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Expose()
  @Column({ name: 'category_id', type: 'char', length: 36, nullable: true })
  categoryId: string | null;

  @Expose()
  @Column({ name: 'questionnaire_id', type: 'char', length: 36, nullable: true })
  questionnaireId: string | null;

  @Expose()
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Expose()
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 220 })
  slug: string;

  @Expose()
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** BNF chapter/section code — used for clinical reference */
  @Expose()
  @Column({ name: 'bnf_code', type: 'varchar', length: 20, nullable: true })
  bnfCode: string | null;

  /**
   * UK medicine classification.
   * POM → requiresPrescription is always true.
   * P   → may require a questionnaire but not a prescription.
   * GSL → typically no gating.
   */
  @Expose()
  @Index()
  @Column({
    name: 'medicine_type',
    type: 'enum',
    enum: MedicineType,
    default: MedicineType.GSL,
  })
  medicineType: MedicineType;

  /**
   * When true, a prescription request must be approved before fulfillment.
   * Always set to true for POM products by the service layer.
   */
  @Expose()
  @Index()
  @Column({ name: 'requires_prescription', type: 'tinyint', default: 0 })
  requiresPrescription: boolean;

  /**
   * When true, the customer must complete the linked questionnaire
   * before a prescription request can be submitted.
   */
  @Expose()
  @Column({ name: 'requires_questionnaire', type: 'tinyint', default: 0 })
  requiresQuestionnaire: boolean;

  /** Price in pence to avoid floating-point errors */
  @Expose()
  @Column({ name: 'price_pence', type: 'int', unsigned: true })
  pricePence: number;

  /** S3 object key — never expose publicly; generate pre-signed URL on demand */
  @Column({ name: 's3_image_key', type: 'varchar', length: 500, nullable: true })
  s3ImageKey: string | null;

  @Expose()
  @Index()
  @Column({
    type: 'enum',
    enum: ProductStatus,
    default: ProductStatus.ACTIVE,
  })
  status: ProductStatus;

  /** null = unlimited stock */
  @Expose()
  @Column({ name: 'stock_count', type: 'int', nullable: true })
  stockCount: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // ── Relations ──────────────────────────────────────────────────────────────

  @ManyToOne(() => Category, { nullable: true, eager: false })
  @JoinColumn({ name: 'category_id' })
  category: Category | null;

  @ManyToOne(() => Questionnaire, { nullable: true, eager: false })
  @JoinColumn({ name: 'questionnaire_id' })
  questionnaire: Questionnaire | null;

  // ── Computed helpers ───────────────────────────────────────────────────────

  /** Formatted price string for display: 1999 → "£19.99" */
  get formattedPrice(): string {
    return `£${(this.pricePence / 100).toFixed(2)}`;
  }

  get isAvailable(): boolean {
    return (
      this.status === ProductStatus.ACTIVE &&
      (this.stockCount === null || this.stockCount > 0)
    );
  }
}
