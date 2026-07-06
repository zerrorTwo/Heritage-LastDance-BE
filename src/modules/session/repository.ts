import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionModel, ISessionRepository, CreateSessionData } from './model';

@Injectable()
export class SessionRepository implements ISessionRepository {
  constructor(
    @InjectRepository(SessionModel)
    private readonly repo: Repository<SessionModel>,
  ) {}

  async create(data: CreateSessionData): Promise<SessionModel> {
    return this.repo.save(data);
  }

  async getById(id: string): Promise<SessionModel | null> {
    return this.repo.findOneBy({ id });
  }

  async getByRefreshToken(hash: string): Promise<SessionModel | null> {
    return this.repo.findOneBy({ refreshTokenHash: hash });
  }

  async update(session: Partial<SessionModel>): Promise<void> {
    await this.repo.update(session.id!, session);
  }

  async deleteById(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async revokeAllByUserId(userId: string, excludeSessionIds?: string[]): Promise<void> {
    const query = this.repo
      .createQueryBuilder()
      .update()
      .set({ isRevoked: true })
      .where('userId = :userId', { userId });

    if (excludeSessionIds?.length) {
      query.andWhere('id NOT IN (:...excludeSessionIds)', { excludeSessionIds });
    }

    await query.execute();
  }
}