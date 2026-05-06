import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HeritageTimeline } from './model';

@Injectable()
export class HeritageTimelineRepository {
  constructor(
    @InjectRepository(HeritageTimeline)
    private readonly repo: Repository<HeritageTimeline>,
  ) {}

  async findById(id: string): Promise<HeritageTimeline | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByHeritageId(heritageId: string): Promise<HeritageTimeline[]> {
    return this.repo.find({ where: { heritageId } });
  }

  async create(data: Partial<HeritageTimeline>): Promise<HeritageTimeline> {
    return this.repo.save(data);
  }

  async update(id: string, data: Partial<HeritageTimeline>): Promise<void> {
    await this.repo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
