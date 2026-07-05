import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FavoriteItem, FavoriteModel } from './model';

@Injectable()
export class FavoriteRepository {
  constructor(
    @InjectRepository(FavoriteModel)
    private readonly repo: Repository<FavoriteModel>,
  ) {}

  async findById(id: string): Promise<FavoriteModel | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByUserId(userId: string): Promise<FavoriteModel | null> {
    return this.repo.findOne({ where: { userId } });
  }

  async findAll(opts: {
    page: number;
    limit: number;
    sort: string;
    order: 'ASC' | 'DESC';
  }): Promise<{ results: FavoriteModel[]; total: number }> {
    const { page, limit, sort, order } = opts;
    const skip = (page - 1) * limit;

    const [results, total] = await this.repo.findAndCount({
      order: { [sort]: order } as any,
      skip,
      take: limit,
    });

    return { results, total };
  }

  async create(userId: string, items: FavoriteItem[]): Promise<FavoriteModel> {
    const entity = this.repo.create({
      userId,
      items: JSON.stringify(items),
    });
    return this.repo.save(entity);
  }

  async update(id: string, items: FavoriteItem[]): Promise<FavoriteModel | null> {
    await this.repo.update(id, { items: JSON.stringify(items) });
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  // Helper: parse items từ JSON string
  parseItems(raw: string): FavoriteItem[] {
    try {
      return JSON.parse(raw ?? '[]');
    } catch {
      return [];
    }
  }
}
