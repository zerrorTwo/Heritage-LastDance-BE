import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HeritageMedia } from './model';
import { HeritageMediaRepository } from './repository';
import { HeritageMediaService } from './service';
import { HeritageMediaController } from './controller';
import { HeritageModule } from '../heritage/module';

@Module({
  imports: [TypeOrmModule.forFeature([HeritageMedia]), HeritageModule],
  controllers: [HeritageMediaController],
  providers: [HeritageMediaRepository, HeritageMediaService],
})
export class HeritageMediaModule {}
