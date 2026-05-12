import { Column, Entity, Index, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('categories')
@Index('idx_category_slug', ['slug'], { unique: true })
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name!: string | null;

  @Column({ type: 'varchar', length: 255, unique: true })
  slug!: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
