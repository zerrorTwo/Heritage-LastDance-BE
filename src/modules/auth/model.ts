import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export type ChallengeType = 'signup' | 'forgot_password';

@Entity('auth_challenges')
export class AuthChallengeModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 20 })
  challengeType!: ChallengeType;

  @Column({ type: 'varchar', length: 255 })
  identifier!: string; // email address

  /**
   * bcrypt hash of the plain password (for signup flow).
   * Excluded from default selects — must be explicitly selected.
   */
  @Column({ type: 'text', nullable: true, select: false })
  tempPassword!: string;

  /**
   * bcrypt hash of the OTP code.
   * Never store plain OTP.
   */
  @Column({ type: 'varchar', length: 255 })
  challenge!: string;

  @Column({ type: 'datetime' })
  expiredAt!: Date;

  @Column({ type: 'datetime', nullable: true })
  verifiedAt!: Date | null;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @CreateDateColumn()
  createdAt!: Date;
}

export interface CreateChallengeData {
  challengeType: ChallengeType;
  identifier: string;
  tempPassword?: string;
  challenge: string;
  expiredAt: Date;
}

export interface IAuthChallengeRepository {
  create(data: CreateChallengeData): Promise<AuthChallengeModel>;
  findLatestPending(
    identifier: string,
    type: ChallengeType,
  ): Promise<AuthChallengeModel | null>;
  findLatestPendingWithTempPassword(
    identifier: string,
    type: ChallengeType,
  ): Promise<AuthChallengeModel | null>;
  countByIdentifierLastHour(
    identifier: string,
    type: ChallengeType,
  ): Promise<number>;
  markVerified(id: string): Promise<void>;
  incrementAttempts(id: string): Promise<void>;
}
