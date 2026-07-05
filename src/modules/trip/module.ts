import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripModel, TripMomentModel } from './model';
import { TripRepository, TripMomentRepository } from './repository';
import { TripService } from './service';
import { TripController } from './controller';
import { GamificationModule } from '../gamification/module';
import { HeritageLocation } from '../heritage_location/model';
import { HeritageItem } from '../heritage/model';
import { CheckInModel } from '../gamification/check-in.model';
import { GraphModule } from '../graph/module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TripModel,
      TripMomentModel,
      HeritageLocation,
      HeritageItem,
      CheckInModel,
    ]),
    GamificationModule,
    GraphModule,
  ],
  controllers: [TripController],
  providers: [TripRepository, TripMomentRepository, TripService],
  exports: [TripService],
})
export class TripModule {}
