import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LeaderboardEntryRepository,
  LeaderboardRepository,
} from './repository';
import {
  CreateLeaderboardDto,
  GetAllLeaderboardQueryDto,
  GetByHeritageQueryDto,
  RankingDto,
  UpdateLeaderboardDto,
} from './dto/leaderboard.dto';
import { LeaderboardEntryModel } from './model';

@Injectable()
export class LeaderboardService {
  constructor(
    private readonly leaderboardRepo: LeaderboardRepository,
    private readonly entryRepo: LeaderboardEntryRepository,
  ) {}

  async getAll(query: GetAllLeaderboardQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sort = query.sort ?? 'createdAt';
    const order = query.order ?? 'desc';

    const { results, total } = await this.leaderboardRepo.findAll({
      page,
      limit,
      sort,
      order,
      search: query.search,
    });

    return {
      leaderBoards: results.map(lb => ({
        ...lb,
        _id: lb.id,
      })),
      pagination: {
        totalItems: total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        itemsPerPage: limit,
      },
    };
  }

  async createNew(dto: CreateLeaderboardDto) {
    if (!dto.rankings?.length) {
      throw new BadRequestException('rankings phải có ít nhất 1 phần tử');
    }

    let leaderboard = await this.leaderboardRepo.findByHeritageId(dto.heritageId);
    if (!leaderboard) {
      leaderboard = await this.leaderboardRepo.create({
        heritageId: dto.heritageId,
        totalParticipants: 0,
        highestScore: 0,
        averageScore: 0,
      });
    }

    // Express cũ chỉ dùng rankings[0]. Giữ logic tương đương.
    const first = dto.rankings[0];
    await this.entryRepo.upsertEntry({
      leaderboardId: leaderboard.id,
      userId: first.userId,
      score: first.score,
      avatar: first.avatar,
      displayName: first.displayName,
      completedAt: first.completedAt ? new Date(first.completedAt) : new Date(),
    });

    await this.entryRepo.recomputeRanks(leaderboard.id);
    await this.recomputeStats(leaderboard.id);

    return this.getDetail(leaderboard.id);
  }

  async getLeaderBoardById(id: string) {
    const lb = await this.leaderboardRepo.findById(id);
    if (!lb) throw new NotFoundException('Leader Board not found!');
    return this.getDetail(lb.id);
  }

  async updateLeaderBoard(id: string, dto: UpdateLeaderboardDto) {
    const lb = await this.leaderboardRepo.findById(id);
    if (!lb) throw new NotFoundException('Leader Board not found!');

    if (dto.rankings) {
      for (const r of dto.rankings) {
        await this.entryRepo.upsertEntry({
          leaderboardId: lb.id,
          userId: r.userId,
          score: r.score,
          avatar: r.avatar,
          displayName: r.displayName,
          completedAt: r.completedAt ? new Date(r.completedAt) : new Date(),
        });
      }
      await this.entryRepo.recomputeRanks(lb.id);
      await this.recomputeStats(lb.id);
    }

    return this.getDetail(lb.id);
  }

  async deleteLeaderBoard(id: string) {
    const lb = await this.leaderboardRepo.findById(id);
    if (!lb) throw new NotFoundException('LeaderBoard not found');

    await this.entryRepo.deleteByLeaderboard(id);
    await this.leaderboardRepo.delete(id);

    return { message: 'Leaderboard deleted successfully' };
  }

  async getByHeritageId(heritageId: string, query: GetByHeritageQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const lb = await this.leaderboardRepo.findByHeritageId(heritageId);
    if (!lb) throw new NotFoundException('Leaderboard not found!');

    const { results: rankings, total: totalItems } =
      await this.entryRepo.findByLeaderboardPaginated(lb.id, page, limit);

    return {
      rankings: rankings.map((r) => ({
        ...r,
        _id: r.id,
        completeDate: r.completedAt,
        avatarUrl: r.avatar,
      })),
      stats: {
        totalParticipants: lb.totalParticipants,
        highestScore: lb.highestScore,
        averageScore: Number(lb.averageScore),
      },
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
      },
    };
  }

  /**
   * Public method để KnowledgeTestService gọi khi submit attempt.
   * Tự tạo leaderboard nếu chưa có cho heritageId, sau đó upsert entry.
   */
  async addOrUpdateEntry(
    heritageId: string,
    ranking: RankingDto & { completedAt?: string | Date },
  ) {
    let lb = await this.leaderboardRepo.findByHeritageId(heritageId);
    if (!lb) {
      lb = await this.leaderboardRepo.create({
        heritageId,
        totalParticipants: 0,
        highestScore: 0,
        averageScore: 0,
      });
    }

    await this.entryRepo.upsertEntry({
      leaderboardId: lb.id,
      userId: ranking.userId,
      score: ranking.score,
      avatar: ranking.avatar,
      displayName: ranking.displayName,
      completedAt: this.toDate(ranking.completedAt),
    });

    await this.entryRepo.recomputeRanks(lb.id);
    await this.recomputeStats(lb.id);

    return this.getDetail(lb.id);
  }

  /** Trả về leaderboard kèm rankings + stats (giống response Express cũ) */
  private async getDetail(leaderboardId: string) {
    const lb = await this.leaderboardRepo.findById(leaderboardId);
    if (!lb) return null;
    const rankings = await this.entryRepo.findAllByLeaderboard(leaderboardId);
    return {
      ...lb,
      _id: lb.id,
      averageScore: Number(lb.averageScore),
      rankings: rankings.map((r) => ({
        ...r,
        _id: r.id,
        completeDate: r.completedAt,
        avatarUrl: r.avatar,
      })),
    };
  }

  private toDate(value: string | Date | undefined | null): Date {
    if (!value) return new Date();
    if (value instanceof Date) return value;
    return new Date(value);
  }

  private async recomputeStats(leaderboardId: string) {
    const entries = await this.entryRepo.findAllByLeaderboard(leaderboardId);
    const totalParticipants = entries.length;
    const highestScore =
      entries.length > 0 ? Math.max(...entries.map((e) => e.score)) : 0;
    const averageScore =
      entries.length > 0
        ? entries.reduce((sum: number, e: LeaderboardEntryModel) => sum + e.score, 0) /
          totalParticipants
        : 0;

    await this.leaderboardRepo.update(leaderboardId, {
      totalParticipants,
      highestScore,
      averageScore: parseFloat(averageScore.toFixed(2)),
    });
  }
}
