import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('sessions')
export class SessionModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  userId: string;

  /**
   * MD5(rawRefreshToken) — raw token is sent to client, only hash stored here.
   * Unique index ensures one-to-one token mapping.
   */
  @Column({ unique: true })
  refreshToken: string;

  @Column({ length: 50 })
  ipAddress: string;

  @Column({ type: 'text', nullable: true })
  deviceInfo: string | null;

  /** Absolute expiry — access is forbidden after this regardless of activity. */
  @Column({ type: 'datetime' })
  expiredAt: Date;

  /** Sliding expiry — refreshed on each use, extends session lifetime. */
  @Column({ type: 'datetime' })
  refreshedExpiredAt: Date;

  @Column({ default: false })
  isRevoked: boolean;

  @Column({ type: 'datetime', nullable: true })
  lastUsedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}

export interface CreateSessionData {
  userId: string;
  refreshToken: string;
  ipAddress: string;
  deviceInfo: string | null;
  expiredAt: Date;
  refreshedExpiredAt: Date;
}

export interface ISessionRepository {
  create(data: CreateSessionData): Promise<SessionModel>;
  findByRefreshToken(md5Hash: string): Promise<SessionModel | null>;
  findById(id: string): Promise<SessionModel | null>;
  revoke(id: string): Promise<void>;
  revokeAllByUserId(userId: string): Promise<void>;
  updateLastUsed(id: string): Promise<void>;
}
