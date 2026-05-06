import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BannerModel } from './model';
import { BannerRepository } from './repository';
import { BannerService } from './service';
import { BannerController } from './controller';

@Module({
  imports: [TypeOrmModule.forFeature([BannerModel])],
  controllers: [BannerController],
  providers: [BannerRepository, BannerService],
  exports: [BannerService],
})
export class BannerModule {}
