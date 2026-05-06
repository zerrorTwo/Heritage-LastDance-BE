import { Column, Entity, Index, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { HeritageItem } from '../heritage/model';

@Entity('heritage_locations')
@Index('idx_heritage_locations_geo', ['latitude', 'longitude'])
export class HeritageLocation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  heritageId!: string;

  @ManyToOne(() => HeritageItem, { onDelete: 'CASCADE' })
  heritage!: HeritageItem;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name!: string | null;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  latitude!: number | null;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  longitude!: number | null;

  @Column({ type: 'text', nullable: true })
  address!: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  countryCode!: string | null;
}
