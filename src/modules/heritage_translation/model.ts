import { Column, Entity, Index, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { HeritageItem } from '../heritage/model';

@Entity('heritage_translations')
@Index('idx_heritage_translations_lang', ['languageCode'])
export class HeritageTranslation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  heritageId!: string;

  @ManyToOne(() => HeritageItem, { onDelete: 'CASCADE' })
  heritage!: HeritageItem;

  @Column({ type: 'varchar', length: 10 })
  languageCode!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title!: string | null;

  @Column({ type: 'text', nullable: true })
  summary!: string | null;

  @Column({ type: 'text', nullable: true })
  content!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  seoTitle!: string | null;

  @Column({ type: 'text', nullable: true })
  seoDescription!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  additionalInfo!: Record<string, any> | null;
}
