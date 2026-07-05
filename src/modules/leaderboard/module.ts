import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaderboardEntryModel, LeaderboardModel } from './model';
import {
  LeaderboardEntryRepository,
  LeaderboardRepository,
} from './repository';
import { LeaderboardService } from './service';
import { LeaderboardController } from './controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([LeaderboardModel, LeaderboardEntryModel]),
  ],
  controllers: [LeaderboardController],
  providers: [
    LeaderboardRepository,
    LeaderboardEntryRepository,
    LeaderboardService,
  ],
  exports: [
    LeaderboardRepository,
    LeaderboardEntryRepository,
    LeaderboardService,
  ],
})
export class LeaderboardModule {}
