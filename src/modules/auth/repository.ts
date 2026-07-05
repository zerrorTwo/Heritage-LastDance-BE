import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import {
  AuthChallengeModel,
  PasswordResetModel,
  IAuthChallengeRepository,
  CreateAuthChallengeData,
} from './model';

@Injectable()
export class AuthRepository implements IAuthChallengeRepository {
  constructor(
    @InjectRepository(AuthChallengeModel)
    private readonly challengeRepo: Repository<AuthChallengeModel>,
    @InjectRepository(PasswordResetModel)
    private readonly passwordResetRepo: Repository<PasswordResetModel>,
  ) {}

  async upsert(data: CreateAuthChallengeData): Promise<AuthChallengeModel> {
    if (data.authToken) {
      const existing = await this.challengeRepo.findOne({
        where: { authToken: data.authToken },
      });
      if (existing) {
        Object.assign(existing, data);
        return this.challengeRepo.save(existing);
      }
    }
    return this.challengeRepo.save(data);
  }

  async getByAuthToken(authToken: string): Promise<AuthChallengeModel | null> {
    return this.challengeRepo.findOneBy({ authToken });
  }

  async getByIdentifier(identifier: string): Promise<AuthChallengeModel | null> {
    return this.challengeRepo.findOne({
      where: { identifier },
      order: { createdAt: 'DESC' },
    });
  }

  async countByIdentifierAndChallengeType(
    identifier: string,
    challengeType: string,
  ): Promise<number> {
    return this.challengeRepo.count({
      where: { identifier, challengeType: challengeType as any },
    });
  }

  async deleteExpiredChallenges(): Promise<void> {
    await this.challengeRepo.delete({ expiredAt: LessThan(new Date()) });
  }

  async createPasswordReset(data: {
    identifier: string;
    expiredAt: Date;
    resetToken: string;
  }): Promise<PasswordResetModel> {
    return this.passwordResetRepo.save(data);
  }

  async getPasswordReset(resetToken: string): Promise<PasswordResetModel | null> {
    return this.passwordResetRepo.findOneBy({ resetToken });
  }

  async deletePasswordResetExpiredChallenges(): Promise<void> {
    await this.passwordResetRepo.delete({ expiredAt: LessThan(new Date()) });
  }
}