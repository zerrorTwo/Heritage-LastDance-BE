import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionModel } from './model';
import type { ISessionRepository, CreateSessionData } from './model';

/**
 * MySQL/TypeORM implementation of ISessionRepository.
 * Injected via SESSION_REPOSITORY token — never imported directly by services.
 */
@Injectable()
export class SessionRepository implements ISessionRepository {
  constructor(
    @InjectRepository(SessionModel)
    private readonly repo: Repository<SessionModel>,
  ) {}

  async create(data: CreateSessionData): Promise<SessionModel> {
    const session = this.repo.create(data);
    return this.repo.save(session);
  }

  findByRefreshToken(md5Hash: string): Promise<SessionModel | null> {
    return this.repo
      .createQueryBuilder('s')
      .where('s.refreshToken = :md5Hash', { md5Hash })
      .andWhere('s.isRevoked = false')
      .andWhere('s.refreshedExpiredAt > NOW()')
      .getOne();
  }

  findById(id: string): Promise<SessionModel | null> {
    return this.repo.findOne({ where: { id } });
  }

  async revoke(id: string): Promise<void> {
    await this.repo.update({ id }, { isRevoked: true });
  }

  async revokeAllByUserId(userId: string): Promise<void> {
    await this.repo.update({ userId, isRevoked: false }, { isRevoked: true });
  }

  async updateLastUsed(id: string): Promise<void> {
    await this.repo.update({ id }, { lastUsedAt: new Date() });
  }
}
