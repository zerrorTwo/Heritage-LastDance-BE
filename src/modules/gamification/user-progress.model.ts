import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Tiến trình gamification của mỗi user (B1): XP, cấp độ, chuỗi ngày (streak).
 */
@Entity('user_progress')
@Index('idx_user_progress_user_id', ['userId'], { unique: true })
export class UserProgressModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  userId!: string;

  @Column({ type: 'int', default: 0 })
  xp!: number;

  @Column({ type: 'int', default: 1 })
  level!: number;

  @Column({ type: 'int', default: 0 })
  streakCount!: number;

  @Column({ type: 'int', default: 0 })
  longestStreak!: number;

  // 'YYYY-MM-DD' để tránh rắc rối múi giờ
  @Column({ type: 'varchar', length: 10, nullable: true })
  lastCheckInDate!: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
