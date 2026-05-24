import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HeritageMedia } from './model';
import { HeritageMediaRepository } from './repository';
import { HeritageMediaService } from './service';
import { HeritageMediaController } from './controller';
import { HeritageModule } from '../heritage/module';
import { CloudinaryProvider } from '../../providers/cloudinary.provider';

@Module({
  imports: [TypeOrmModule.forFeature([HeritageMedia]), HeritageModule],
  controllers: [HeritageMediaController],
  providers: [HeritageMediaRepository, HeritageMediaService, CloudinaryProvider],
})
export class HeritageMediaModule {}
