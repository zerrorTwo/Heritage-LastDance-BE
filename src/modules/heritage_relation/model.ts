import { Column, Entity, Index, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { HeritageItem } from '../heritage/model';

@Entity('heritage_relations')
@Index('idx_relations_from', ['fromId'])
@Index('idx_relations_to', ['toId'])
export class HeritageRelation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  fromId!: string;

  @ManyToOne(() => HeritageItem, { onDelete: 'CASCADE' })
  fromHeritage!: HeritageItem;

  @Column({ type: 'uuid' })
  toId!: string;

  @ManyToOne(() => HeritageItem, { onDelete: 'CASCADE' })
  toHeritage!: HeritageItem;

  @Column({ type: 'varchar', length: 50, nullable: true })
  relationType!: string | null;
}
