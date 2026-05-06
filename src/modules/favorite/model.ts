import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Mỗi user có 1 favorite document.
 * items là JSON array chứa { heritageId, addedAt }.
 */
@Entity('favorites')
@Index('idx_favorites_user_id', ['userId'], { unique: true })
export class FavoriteModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36, unique: true })
  userId!: string;

  /**
   * JSON string: [{ heritageId: string, addedAt: string }]
   */
  @Column({ type: 'text' })
  items!: string;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}

// ---- Types ----
export interface FavoriteItem {
  heritageId: string;
  addedAt: Date;
}
