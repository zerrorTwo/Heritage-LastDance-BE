import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTimelineDto } from './dto/create-timeline.dto';
import { UpdateTimelineDto } from './dto/update-timeline.dto';
import { HeritageTimeline } from './model';

@Injectable()
export class HeritageTimelineRepository {
  constructor(
    @InjectRepository(HeritageTimeline)
    private readonly repo: Repository<HeritageTimeline>,
  ) {}

  findById(id: string): Promise<HeritageTimeline | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByHeritageId(heritageId: string): Promise<HeritageTimeline[]> {
    return this.repo.find({ where: { heritageId }, order: { eventDate: 'ASC' } });
  }

  create(data: CreateTimelineDto): Promise<HeritageTimeline> {
    return this.repo.save(data);
  }

  async update(id: string, data: UpdateTimelineDto): Promise<void> {
    await this.repo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
