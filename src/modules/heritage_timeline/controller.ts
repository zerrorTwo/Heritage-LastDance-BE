import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateTimelineDto } from './dto/create-timeline.dto';
import { UpdateTimelineDto } from './dto/update-timeline.dto';
import { HeritageTimelineService } from './service';

@ApiTags('Heritage Timeline')
@Controller('timeline')
export class HeritageTimelineController {
  constructor(private readonly timelineService: HeritageTimelineService) {}

  @Get('heritage/:heritageId')
  @ApiOperation({ summary: 'Get timeline events by heritage ID' })
  getTimelinesByHeritage(@Param('heritageId') heritageId: string) {
    return this.timelineService.getTimelinesByHeritageId(heritageId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get timeline event by ID' })
  getTimeline(@Param('id') id: string) {
    return this.timelineService.getTimelineById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create timeline event' })
  createTimeline(@Body() dto: CreateTimelineDto) {
    return this.timelineService.createTimeline(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update timeline event' })
  updateTimeline(@Param('id') id: string, @Body() dto: UpdateTimelineDto) {
    return this.timelineService.updateTimeline(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete timeline event' })
  deleteTimeline(@Param('id') id: string) {
    return this.timelineService.deleteTimeline(id);
  }
}
