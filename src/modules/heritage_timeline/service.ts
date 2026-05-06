import { Injectable, BadRequestException } from '@nestjs/common';
import { HeritageTimelineRepository } from './repository';
import { CreateTimelineDto } from './dto/create-timeline.dto';
import { UpdateTimelineDto } from './dto/update-timeline.dto';

@Injectable()
export class HeritageTimelineService {
  constructor(private readonly timelineRepo: HeritageTimelineRepository) {}

  async getTimelineById(id: string) {
    const timeline = await this.timelineRepo.findById(id);
    if (!timeline) throw new BadRequestException('Timeline event not found!');
    return timeline;
  }

  async getTimelinesByHeritageId(heritageId: string) {
    return this.timelineRepo.findByHeritageId(heritageId);
  }

  async createTimeline(dto: CreateTimelineDto) {
    return this.timelineRepo.create(dto);
  }

  async updateTimeline(id: string, dto: UpdateTimelineDto) {
    const timeline = await this.timelineRepo.findById(id);
    if (!timeline) throw new BadRequestException('Timeline event not found!');
    await this.timelineRepo.update(id, dto);
    return this.timelineRepo.findById(id);
  }

  async deleteTimeline(id: string) {
    const timeline = await this.timelineRepo.findById(id);
    if (!timeline) throw new BadRequestException('Timeline event not found!');
    await this.timelineRepo.delete(id);
    return { message: 'Timeline event deleted successfully' };
  }
}
