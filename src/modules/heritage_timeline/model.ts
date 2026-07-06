import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('heritage_timelines')
@Index('idx_timeline_date', ['eventDate'])
export class HeritageTimeline {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  heritageId!: string;

  @Column({ type: 'date', nullable: true })
  eventDate!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;
}
