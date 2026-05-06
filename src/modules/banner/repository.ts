import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BannerModel, IBannerRepository, CreateBannerData } from './model';

@Injectable()
export class BannerRepository implements IBannerRepository {
  constructor(
    @InjectRepository(BannerModel)
    private readonly repo: Repository<BannerModel>,
  ) {}

  async findAll(activeOnly: boolean = false): Promise<BannerModel[]> {
    const query = this.repo.createQueryBuilder('banner');

    if (activeOnly) {
      query.where('banner.isActive = :isActive', { isActive: true });
      query.andWhere(
        '(banner.startAt IS NULL OR banner.startAt <= :now)',
        { now: new Date() },
      );
      query.andWhere(
        '(banner.endAt IS NULL OR banner.endAt >= :now)',
        { now: new Date() },
      );
    }

    query.orderBy('banner.priority', 'DESC');
    query.addOrderBy('banner.createdAt', 'DESC');

    return query.getMany();
  }

  async findById(id: string): Promise<BannerModel | null> {
    return this.repo.findOneBy({ id });
  }

  async findByType(type: string, activeOnly: boolean = false): Promise<BannerModel[]> {
    const query = this.repo.createQueryBuilder('banner');

    query.where('banner.type = :type', { type });

    if (activeOnly) {
      query.andWhere('banner.isActive = :isActive', { isActive: true });
      query.andWhere(
        '(banner.startAt IS NULL OR banner.startAt <= :now)',
        { now: new Date() },
      );
      query.andWhere(
        '(banner.endAt IS NULL OR banner.endAt >= :now)',
        { now: new Date() },
      );
    }

    query.orderBy('banner.priority', 'DESC');
    query.addOrderBy('banner.createdAt', 'DESC');

    return query.getMany();
  }

  async create(data: CreateBannerData): Promise<BannerModel> {
    const banner = this.repo.create(data);
    return this.repo.save(banner);
  }

  async update(banner: Partial<BannerModel>): Promise<void> {
    await this.repo.update(banner.id!, banner);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
