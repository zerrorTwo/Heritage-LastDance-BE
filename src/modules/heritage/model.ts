import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('heritage_items')
@Index('idx_heritage_items_slug', ['slug'], { unique: true })
@Index('idx_heritage_items_status', ['status'])
export class HeritageItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  slug!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  summary!: string | null;

  @Column({ type: 'text', nullable: true })
  content!: string | null;

  @Column({ type: 'varchar', length: 50 })
  type!: string;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  status!: string;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt!: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  seoTitle!: string | null;

  @Column({ type: 'text', nullable: true })
  seoDescription!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  alternativeNames!: string[] | null;

  @Column({ type: 'text', nullable: true })
  history!: string | null;

  @Column({ type: 'text', nullable: true })
  architecture!: string | null;

  @Column({ type: 'text', nullable: true })
  culturalSignificance!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  constructionPeriod!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  founder!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  recognition!: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  festivals!: Record<string, any> | null;

  @Column({ type: 'text', nullable: true })
  legends!: string | null;

  @Column({ type: 'text', nullable: true })
  sourceUrl!: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @Column({ type: 'tsvector', nullable: true, select: false })
  searchVector!: any;
}
