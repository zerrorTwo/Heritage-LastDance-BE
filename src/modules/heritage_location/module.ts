import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HeritageLocation } from './model';
import { HeritageLocationRepository } from './repository';
import { HeritageLocationService } from './service';
import { HeritageLocationController } from './controller';
import { HeritageModule } from '../heritage/module';

@Module({
  imports: [TypeOrmModule.forFeature([HeritageLocation]), HeritageModule],
  controllers: [HeritageLocationController],
  providers: [HeritageLocationRepository, HeritageLocationService],
})
export class HeritageLocationModule {}
