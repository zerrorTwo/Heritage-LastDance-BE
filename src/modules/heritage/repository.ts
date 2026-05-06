import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HeritageItem } from './model';

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

  async findAll(filter?: { status?: string; type?: string }): Promise<HeritageItem[]> {
    const query = this.repo.createQueryBuilder('heritage');
    if (filter?.status) query.andWhere('heritage.status = :status', { status: filter.status });
    if (filter?.type) query.andWhere('heritage.type = :type', { type: filter.type });
    return query.getMany();
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
