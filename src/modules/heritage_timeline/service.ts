import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateTimelineDto } from './dto/create-timeline.dto';
import { UpdateTimelineDto } from './dto/update-timeline.dto';
import { HeritageTimelineRepository } from './repository';

@Injectable()
export class HeritageTimelineService {
  constructor(private readonly timelineRepo: HeritageTimelineRepository) {}

  async getTimelineById(id: string) {
    const timeline = await this.timelineRepo.findById(id);
    if (!timeline) throw new BadRequestException('Timeline event not found!');
    return timeline;
  }

  getTimelinesByHeritageId(heritageId: string) {
    return this.timelineRepo.findByHeritageId(heritageId);
  }

  createTimeline(dto: CreateTimelineDto) {
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
