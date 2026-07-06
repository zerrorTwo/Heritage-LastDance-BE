import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum ChallengeType {
  SIGNUP = 'SIGNUP',
  FORGOT_PASSWORD = 'FORGOT_PASSWORD',
}

export enum IdentifierType {
  EMAIL = 'EMAIL',
}

@Entity('auth_challenges')
export class AuthChallengeModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: ChallengeType })
  challengeType!: ChallengeType;

  @Column({ type: 'enum', enum: IdentifierType })
  identifierType!: IdentifierType;

  @Column({ type: 'varchar' })
  identifier!: string;

  @Column({ type: 'text', nullable: true })
  tempPassword!: string | null;

  @Column({ type: 'text' })
  challenge!: string;

  @Column({ type: 'timestamp' })
  expiredAt!: Date;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Column({ type: 'varchar', nullable: true })
  authToken!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt!: Date | null;

  @Column({ type: 'boolean', default: false })
  isUsed!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}

@Entity('password_resets')
export class PasswordResetModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  identifier!: string;

  @Column({ type: 'timestamp' })
  expiredAt!: Date;

  @Column({ type: 'varchar' })
  resetToken!: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}

export interface CreateAuthChallengeData {
  challengeType: ChallengeType;
  identifierType: IdentifierType;
  identifier: string;
  tempPassword: string | null;
  challenge: string;
  expiredAt: Date;
  attempts?: number;
  authToken?: string | null;
}

export interface IAuthChallengeRepository {
  upsert(data: CreateAuthChallengeData): Promise<AuthChallengeModel>;
  getByAuthToken(authToken: string): Promise<AuthChallengeModel | null>;
  getByIdentifier(identifier: string): Promise<AuthChallengeModel | null>;
  countByIdentifierAndChallengeType(
    identifier: string,
    challengeType: string,
  ): Promise<number>;
  deleteExpiredChallenges(): Promise<void>;
  createPasswordReset(data: {
    identifier: string;
    expiredAt: Date;
    resetToken: string;
  }): Promise<PasswordResetModel>;
  getPasswordReset(resetToken: string): Promise<PasswordResetModel | null>;
  deletePasswordResetExpiredChallenges(): Promise<void>;
}
