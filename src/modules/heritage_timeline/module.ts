import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HeritageTimelineController } from './controller';
import { HeritageTimeline } from './model';
import { HeritageTimelineRepository } from './repository';
import { HeritageTimelineService } from './service';

@Module({
  imports: [TypeOrmModule.forFeature([HeritageTimeline])],
  controllers: [HeritageTimelineController],
  providers: [HeritageTimelineRepository, HeritageTimelineService],
  exports: [HeritageTimelineRepository, HeritageTimelineService],
})
export class HeritageTimelineModule {}
