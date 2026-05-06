import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('sessions')
export class SessionModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar' })
  refreshTokenHash!: string;

  @Column({ type: 'varchar' })
  ipAddress!: string;

  @Column({ type: 'varchar', nullable: true })
  deviceInfo!: string | null;

  @Column({ type: 'boolean', default: false })
  isRevoked!: boolean;

  @Column({ type: 'datetime', nullable: true })
  lastUsedAt!: Date | null;

  @Column({ type: 'datetime' })
  expiredAt!: Date;

  @Column({ type: 'datetime' })
  refreshedExpiredAt!: Date;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}

export interface CreateSessionData {
  userId: string;
  refreshTokenHash: string;
  ipAddress: string;
  deviceInfo?: string | null;
  expiredAt: Date;
  refreshedExpiredAt: Date;
}

export interface ISessionRepository {
  create(data: CreateSessionData): Promise<SessionModel>;
  getById(id: string): Promise<SessionModel | null>;
  getByRefreshToken(hash: string): Promise<SessionModel | null>;
  update(session: Partial<SessionModel>): Promise<void>;
  deleteById(id: string): Promise<void>;
  revokeAllByUserId(userId: string, excludeSessionIds?: string[]): Promise<void>;
}