import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscussModel } from './model';
import { DiscussRepository } from './repository';
import { DiscussService } from './service';
import { DiscussController } from './controller';

@Module({
  imports: [TypeOrmModule.forFeature([DiscussModel])],
  controllers: [DiscussController],
  providers: [DiscussRepository, DiscussService],
  exports: [DiscussRepository, DiscussService],
})
export class DiscussModule {}
