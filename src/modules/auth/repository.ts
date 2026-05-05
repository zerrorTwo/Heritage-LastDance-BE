import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthChallengeModel, ChallengeType } from './model';
import type { IAuthChallengeRepository, CreateChallengeData } from './model';

/**
 * MySQL/TypeORM implementation of IAuthChallengeRepository.
 */
@Injectable()
export class AuthChallengeRepository implements IAuthChallengeRepository {
  constructor(
    @InjectRepository(AuthChallengeModel)
    private readonly repo: Repository<AuthChallengeModel>,
  ) {}

  async create(data: CreateChallengeData): Promise<AuthChallengeModel> {
    const challenge = this.repo.create(data);
    return this.repo.save(challenge);
  }

  findLatestPending(
    identifier: string,
    type: ChallengeType,
  ): Promise<AuthChallengeModel | null> {
    return this.repo
      .createQueryBuilder('ac')
      .where('ac.identifier = :identifier', { identifier })
      .andWhere('ac.challengeType = :type', { type })
      .andWhere('ac.verifiedAt IS NULL')
      .andWhere('ac.expiredAt > NOW()')
      .orderBy('ac.createdAt', 'DESC')
      .getOne();
  }

  findLatestPendingWithTempPassword(
    identifier: string,
    type: ChallengeType,
  ): Promise<AuthChallengeModel | null> {
    return this.repo
      .createQueryBuilder('ac')
      .addSelect('ac.tempPassword')
      .where('ac.identifier = :identifier', { identifier })
      .andWhere('ac.challengeType = :type', { type })
      .andWhere('ac.verifiedAt IS NULL')
      .andWhere('ac.expiredAt > NOW()')
      .orderBy('ac.createdAt', 'DESC')
      .getOne();
  }

  async countByIdentifierLastHour(
    identifier: string,
    type: ChallengeType,
  ): Promise<number> {
    return this.repo
      .createQueryBuilder('ac')
      .where('ac.identifier = :identifier', { identifier })
      .andWhere('ac.challengeType = :type', { type })
      .andWhere('ac.createdAt > DATE_SUB(NOW(), INTERVAL 1 HOUR)')
      .getCount();
  }

  async markVerified(id: string): Promise<void> {
    await this.repo.update({ id }, { verifiedAt: new Date() });
  }

  async incrementAttempts(id: string): Promise<void> {
    await this.repo.increment({ id }, 'attempts', 1);
  }
}
