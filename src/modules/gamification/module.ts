import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserProgressModel } from './user-progress.model';
import { CheckInModel } from './check-in.model';
import { HeritageLocation } from '../heritage_location/model';
import { GamificationService } from './service';
import { GamificationController } from './controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserProgressModel, CheckInModel, HeritageLocation])],
  controllers: [GamificationController],
  providers: [GamificationService],
  exports: [GamificationService],
})
export class GamificationModule {}
