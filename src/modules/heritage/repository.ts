import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HeritageItem } from './model';

export interface HeritageFilter {
  status?: string;
  type?: string;
  page?: number;
  limit?: number;
  name?: string;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

@Injectable()
export class HeritageRepository {
  constructor(
    @InjectRepository(HeritageItem)
    private readonly repo: Repository<HeritageItem>,
  ) {}

  async findBySlug(slug: string): Promise<HeritageItem | null> {
    return this.repo.findOne({ where: { slug } });
  }

  async findById(id: string): Promise<HeritageItem | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByIds(ids: string[]): Promise<HeritageItem[]> {
    if (!ids.length) return [];
    return this.repo.createQueryBuilder('heritage')
      .where('heritage.id IN (:...ids)', { ids })
      .getMany();
  }

  async findAll(filter?: HeritageFilter): Promise<{ items: HeritageItem[]; total: number }> {
    const query = this.repo.createQueryBuilder('heritage');

    if (filter?.status) {
      query.andWhere('heritage.status = :status', { status: filter.status });
    }
    if (filter?.type) {
      query.andWhere('heritage.type = :type', { type: filter.type });
    }
    if (filter?.name) {
      query.andWhere('heritage.title ILIKE :name', { name: `%${filter.name}%` });
    }

    if (filter?.sort) {
      const order = filter.order || 'ASC';
      query.orderBy(`heritage.${filter.sort}`, order);
    } else {
      query.orderBy('heritage.createdAt', 'DESC');
    }

    const total = await query.getCount();

    const page = filter?.page || 1;
    const limit = filter?.limit || 10;
    query.skip((page - 1) * limit).take(limit);

    const items = await query.getMany();
    return { items, total };
  }

  async create(data: Partial<HeritageItem>): Promise<HeritageItem> {
    return this.repo.save(data);
  }

  async update(id: string, data: Partial<HeritageItem>): Promise<void> {
    await this.repo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
