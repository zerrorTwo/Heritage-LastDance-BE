import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { HeritageTimelineService } from './service';
import { CreateTimelineDto } from './dto/create-timeline.dto';
import { UpdateTimelineDto } from './dto/update-timeline.dto';

@Controller('timeline')
export class HeritageTimelineController {
  constructor(private readonly timelineService: HeritageTimelineService) {}

  @Get(':id')
  async getTimeline(@Param('id') id: string) {
    return this.timelineService.getTimelineById(id);
  }

  @Get('heritage/:heritageId')
  async getTimelinesByHeritage(@Param('heritageId') heritageId: string) {
    return this.timelineService.getTimelinesByHeritageId(heritageId);
  }

  @Post()
  async createTimeline(@Body() dto: CreateTimelineDto) {
    return this.timelineService.createTimeline(dto);
  }

  @Put(':id')
  async updateTimeline(@Param('id') id: string, @Body() dto: UpdateTimelineDto) {
    return this.timelineService.updateTimeline(id, dto);
  }

  @Delete(':id')
  async deleteTimeline(@Param('id') id: string) {
    return this.timelineService.deleteTimeline(id);
  }
}
