import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { LeaderboardEntryModel, LeaderboardModel } from './model';

@Injectable()
export class LeaderboardRepository {
  constructor(
    @InjectRepository(LeaderboardModel)
    private readonly repo: Repository<LeaderboardModel>,
  ) {}

  async findById(id: string): Promise<LeaderboardModel | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByHeritageId(heritageId: string): Promise<LeaderboardModel | null> {
    return this.repo.findOne({ where: { heritageId } });
  }

  async findAll(opts: {
    page: number;
    limit: number;
    sort: string;
    order: 'asc' | 'desc';
    search?: string;
  }): Promise<{ results: LeaderboardModel[]; total: number }> {
    const { page, limit, sort, order, search } = opts;
    const qb = this.repo.createQueryBuilder('lb');

    if (search) {
      qb.innerJoin(
        LeaderboardEntryModel,
        'e',
        'e.leaderboardId = lb.id AND e.displayName ILIKE :search',
        { search: `%${search}%` },
      ).distinct(true);
    }

    qb.orderBy(`lb.${sort}`, order.toUpperCase() as 'ASC' | 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [results, total] = await qb.getManyAndCount();
    return { results, total };
  }

  async create(data: Partial<LeaderboardModel>): Promise<LeaderboardModel> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async update(
    id: string,
    data: Partial<LeaderboardModel>,
  ): Promise<LeaderboardModel | null> {
    await this.repo.update(id, data);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}

@Injectable()
export class LeaderboardEntryRepository {
  constructor(
    @InjectRepository(LeaderboardEntryModel)
    private readonly repo: Repository<LeaderboardEntryModel>,
    private readonly dataSource: DataSource,
  ) {}

  async findByLeaderboardAndUser(
    leaderboardId: string,
    userId: string,
  ): Promise<LeaderboardEntryModel | null> {
    return this.repo.findOne({ where: { leaderboardId, userId } });
  }

  async findByLeaderboardPaginated(
    leaderboardId: string,
    page: number,
    limit: number,
  ): Promise<{ results: LeaderboardEntryModel[]; total: number }> {
    const [results, total] = await this.repo.findAndCount({
      where: { leaderboardId },
      order: { score: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { results, total };
  }

  async findAllByLeaderboard(
    leaderboardId: string,
  ): Promise<LeaderboardEntryModel[]> {
    return this.repo.find({
      where: { leaderboardId },
      order: { score: 'DESC' },
    });
  }

  async countByLeaderboard(leaderboardId: string): Promise<number> {
    return this.repo.count({ where: { leaderboardId } });
  }

  async getTopN(leaderboardId: string, n: number): Promise<LeaderboardEntryModel[]> {
    return this.repo.find({
      where: { leaderboardId },
      order: { score: 'DESC' },
      take: n,
    });
  }

  async upsertEntry(data: {
    leaderboardId: string;
    userId: string;
    score: number;
    avatar?: string | null;
    displayName?: string | null;
    completedAt?: Date | null;
  }): Promise<LeaderboardEntryModel> {
    const existing = await this.findByLeaderboardAndUser(
      data.leaderboardId,
      data.userId,
    );

    if (existing) {
      // Chỉ cập nhật nếu score mới cao hơn (giữ best score)
      if (data.score > existing.score) {
        await this.repo.update(existing.id, {
          score: data.score,
          avatar: data.avatar ?? existing.avatar,
          displayName: data.displayName ?? existing.displayName,
          completedAt: data.completedAt ?? new Date(),
        });
      }
      return (await this.repo.findOne({ where: { id: existing.id } }))!;
    }

    const entity = this.repo.create({
      leaderboardId: data.leaderboardId,
      userId: data.userId,
      score: data.score,
      avatar: data.avatar ?? null,
      displayName: data.displayName ?? null,
      completedAt: data.completedAt ?? new Date(),
    });
    return this.repo.save(entity);
  }

  /** Recompute rank cho toàn bộ entry của leaderboard theo score giảm dần */
  async recomputeRanks(leaderboardId: string): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(LeaderboardEntryModel);
      const entries = await repo.find({
        where: { leaderboardId },
        order: { score: 'DESC' },
      });

      for (let i = 0; i < entries.length; i++) {
        const newRank = i + 1;
        if (entries[i].rank !== newRank) {
          await repo.update(entries[i].id, { rank: newRank });
        }
      }
    });
  }

  async deleteByLeaderboard(leaderboardId: string): Promise<void> {
    await this.repo.delete({ leaderboardId });
  }
}
