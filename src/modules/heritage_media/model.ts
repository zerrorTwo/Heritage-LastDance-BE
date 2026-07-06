import { Column, Entity, Index, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { HeritageItem } from '../heritage/model';

@Entity('heritage_media')
@Index('idx_heritage_media_heritage', ['heritageId'])
export class HeritageMedia {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  heritageId!: string;

  @ManyToOne(() => HeritageItem, { onDelete: 'CASCADE' })
  heritage!: HeritageItem;

  @Column({ type: 'varchar', length: 50 })
  type!: string;

  @Column({ type: 'text' })
  url!: string;

  @Column({ type: 'text', nullable: true })
  thumbnailUrl!: string | null;

  @Column({ type: 'text', nullable: true })
  caption!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  credit!: string | null;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;
}
