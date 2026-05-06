import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HeritageItem } from './model';
import { HeritageRepository } from './repository';
import { HeritageService } from './service';
import { HeritageController } from './controller';

@Module({
  imports: [TypeOrmModule.forFeature([HeritageItem])],
  controllers: [HeritageController],
  providers: [HeritageRepository, HeritageService],
  exports: [HeritageRepository],
})
export class HeritageModule {}
