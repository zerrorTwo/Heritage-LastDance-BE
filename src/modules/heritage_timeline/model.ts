import { Column, Entity, Index, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { HeritageItem } from '../heritage/model';

@Entity('heritage_timelines')
@Index('idx_timeline_date', ['eventDate'])
export class HeritageTimeline {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  heritageId!: string;

  @ManyToOne(() => HeritageItem, { onDelete: 'CASCADE' })
  heritage!: HeritageItem;

  @Column({ type: 'date', nullable: true })
  eventDate!: Date | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;
}
