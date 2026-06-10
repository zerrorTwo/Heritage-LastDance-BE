import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripModel, TripMomentModel } from './model';
import { TripRepository, TripMomentRepository } from './repository';
import { TripService } from './service';
import { TripController } from './controller';
import { GamificationModule } from '../gamification/module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TripModel, TripMomentModel]),
    GamificationModule,
  ],
  controllers: [TripController],
  providers: [TripRepository, TripMomentRepository, TripService],
  exports: [TripService],
})
export class TripModule {}
