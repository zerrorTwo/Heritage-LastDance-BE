import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { HeritageItem } from './model';
import { HeritageLocation } from '../heritage_location/model';
import { HeritageMedia } from '../heritage_media/model';
import { HeritageTimeline } from '../heritage_timeline/model';
import { HeritageTranslation } from '../heritage_translation/model';

export interface HeritageFilter {
  status?: string;
  type?: string;
  page?: number;
  limit?: number;
  name?: string;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

type HeritageWithEmbeddedData = HeritageItem & {
  media?: HeritageMedia[];
  locations?: HeritageLocation[];
  timelines?: HeritageTimeline[];
  translations?: HeritageTranslation[];
};

@Injectable()
export class HeritageRepository {
  constructor(
    @InjectRepository(HeritageItem)
    private readonly repo: Repository<HeritageItem>,
  ) {}

  private async attachEmbeddedData(
    items: HeritageItem[],
    options: { includeDetail?: boolean } = {},
  ): Promise<HeritageWithEmbeddedData[]> {
    if (!items.length) return [];

    const ids = items.map((item) => item.id);
    const mediaRepo = this.repo.manager.getRepository(HeritageMedia);
    const locationRepo = this.repo.manager.getRepository(HeritageLocation);

    const [media, locations, timelines, translations] = await Promise.all([
      mediaRepo.find({
        where: { heritageId: In(ids) },
        order: { sortOrder: 'ASC' },
      }),
      locationRepo.find({ where: { heritageId: In(ids) } }),
      options.includeDetail
        ? this.repo.manager.getRepository(HeritageTimeline).find({
            where: { heritageId: In(ids) },
            order: { eventDate: 'ASC' },
          })
        : Promise.resolve([] as HeritageTimeline[]),
      this.repo.manager.getRepository(HeritageTranslation).find({
        where: { heritageId: In(ids) },
      }),
    ]);

    const groupByHeritageId = <T extends { heritageId: string }>(rows: T[]) =>
      rows.reduce<Record<string, T[]>>((grouped, row) => {
        grouped[row.heritageId] = grouped[row.heritageId] || [];
        grouped[row.heritageId].push(row);
        return grouped;
      }, {});

    const mediaByHeritage = groupByHeritageId(media);
    const locationsByHeritage = groupByHeritageId(locations);
    const timelinesByHeritage = groupByHeritageId(timelines);
    const translationsByHeritage = groupByHeritageId(translations);

    return items.map((item) => ({
      ...item,
      media: mediaByHeritage[item.id] || [],
      locations: locationsByHeritage[item.id] || [],
      ...(options.includeDetail
        ? {
            timelines: timelinesByHeritage[item.id] || [],
          }
        : {}),
      translations: translationsByHeritage[item.id] || [],
    }));
  }

  async findBySlug(slug: string): Promise<HeritageWithEmbeddedData | null> {
    const heritage = await this.repo.findOne({ where: { slug } });
    if (!heritage) return null;
    const [item] = await this.attachEmbeddedData([heritage], { includeDetail: true });
    return item;
  }

  async findById(id: string): Promise<HeritageWithEmbeddedData | null> {
    const heritage = await this.repo.findOne({ where: { id } });
    if (!heritage) return null;
    const [item] = await this.attachEmbeddedData([heritage], { includeDetail: true });
    return item;
  }

  async findByIds(ids: string[]): Promise<HeritageWithEmbeddedData[]> {
    if (!ids.length) return [];
    const items = await this.repo.createQueryBuilder('heritage')
      .where('heritage.id IN (:...ids)', { ids })
      .getMany();
    return this.attachEmbeddedData(items);
  }

  async findAll(filter?: HeritageFilter): Promise<{ items: HeritageWithEmbeddedData[]; total: number }> {
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
    return {
      items: await this.attachEmbeddedData(items),
      total,
    };
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
