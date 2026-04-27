import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Expose } from 'class-transformer';

@Entity('categories')
export class Category {
  @Expose()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Expose()
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Expose()
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 110 })
  slug: string;

  @Expose()
  @Column({ name: 'sort_order', type: 'smallint', unsigned: true, default: 0 })
  sortOrder: number;

  @Column({ name: 'parent_id', type: 'char', length: 36, nullable: true })
  parentId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // ── Self-referential tree ───────────────────────────────────────────────

  @ManyToOne(() => Category, (cat) => cat.children, { nullable: true })
  parent: Category | null;

  @OneToMany(() => Category, (cat) => cat.parent)
  children: Category[];
}
