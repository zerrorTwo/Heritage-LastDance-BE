import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('leaderboards')
@Index('idx_leaderboards_heritage_id', ['heritageId'], { unique: true })
export class LeaderboardModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  heritageId!: string;

  @Column({ type: 'int', default: 0 })
  totalParticipants!: number;

  @Column({ type: 'int', default: 0 })
  highestScore!: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  averageScore!: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}

@Entity('leaderboard_entries')
@Index('idx_leaderboard_entries_lb_user', ['leaderboardId', 'userId'], { unique: true })
@Index('idx_leaderboard_entries_lb_score', ['leaderboardId', 'score'])
export class LeaderboardEntryModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  leaderboardId!: string;

  @Column({ type: 'varchar', length: 36 })
  userId!: string;

  @Column({ type: 'int', default: 0 })
  score!: number;

  @Column({ type: 'int', default: 0 })
  rank!: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar!: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  displayName!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  completedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
