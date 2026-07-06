import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BannerModel } from './model';
import { BannerRepository } from './repository';
import { BannerService } from './service';
import { BannerController } from './controller';
import { UserModule } from '../user/module';
import { AdminGuard } from '../../common/guards/admin.guard';

@Module({
  imports: [TypeOrmModule.forFeature([BannerModel]), UserModule],
  controllers: [BannerController],
  providers: [BannerRepository, BannerService, AdminGuard],
  exports: [BannerService],
})
export class BannerModule {}
