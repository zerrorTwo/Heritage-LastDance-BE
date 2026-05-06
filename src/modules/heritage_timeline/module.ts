import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HeritageTimeline } from './model';
import { HeritageTimelineRepository } from './repository';
import { HeritageTimelineService } from './service';
import { HeritageTimelineController } from './controller';
import { HeritageModule } from '../heritage/module';

@Module({
  imports: [TypeOrmModule.forFeature([HeritageTimeline]), HeritageModule],
  controllers: [HeritageTimelineController],
  providers: [HeritageTimelineRepository, HeritageTimelineService],
})
export class HeritageTimelineModule {}
