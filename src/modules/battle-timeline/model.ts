import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BattleQuizQuestion, BattleTimeline } from './types';

export enum BattleTimelineVoiceStatus {
  NONE = 'NONE',
  PENDING = 'PENDING',
  READY = 'READY',
  FAILED = 'FAILED',
}

@Entity('battle_timeline_battles')
@Index('idx_battle_timeline_battles_slug', ['slug'])
@Index('idx_battle_timeline_battles_user_id', ['userId'])
export class BattleTimelineBattleModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  slug!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  battleDate!: string | null;

  @Column({ type: 'varchar', length: 40 })
  outcome!: string;

  @Column({ type: 'text', nullable: true })
  summary!: string | null;

  @Column({ type: 'jsonb' })
  timeline!: BattleTimeline;

  @Column({ type: 'varchar', length: 36, nullable: true })
  userId!: string | null;

  @Column({ type: 'int', default: 0 })
  pointsDeducted!: number;

  @Column({
    type: 'enum',
    enum: BattleTimelineVoiceStatus,
    default: BattleTimelineVoiceStatus.NONE,
  })
  voiceStatus!: BattleTimelineVoiceStatus;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}

@Entity('battle_timeline_quizzes')
@Index('idx_battle_timeline_quizzes_battle_id', ['battleId'])
export class BattleTimelineQuizModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  battleId!: string;

  @Column({ type: 'jsonb' })
  questions!: BattleQuizQuestion[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}

@Entity('battle_timeline_voice_scripts')
@Index('idx_battle_timeline_voice_scripts_battle_step', ['battleId', 'step'])
export class BattleTimelineVoiceScriptModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  battleId!: string;

  @Column({ type: 'int' })
  step!: number;

  @Column({ type: 'text' })
  script!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  audioUrl!: string | null;

  @Column({ type: 'boolean', default: true })
  isFallback!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
