import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FavoriteModel } from './model';
import { FavoriteRepository } from './repository';
import { FavoriteService } from './service';
import { FavoriteController } from './controller';
import { HeritageModule } from '../heritage/module';

@Module({
  imports: [TypeOrmModule.forFeature([FavoriteModel]), HeritageModule],
  controllers: [FavoriteController],
  providers: [FavoriteRepository, FavoriteService],
  exports: [FavoriteRepository, FavoriteService],
})
export class FavoriteModule {}
