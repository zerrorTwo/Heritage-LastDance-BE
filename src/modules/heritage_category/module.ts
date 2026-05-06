import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './model';
import { HeritageCategoryRepository } from './repository';
import { HeritageCategoryService } from './service';
import { HeritageCategoryController } from './controller';

@Module({
  imports: [TypeOrmModule.forFeature([Category])],
  controllers: [HeritageCategoryController],
  providers: [HeritageCategoryRepository, HeritageCategoryService],
  exports: [HeritageCategoryRepository],
})
export class HeritageCategoryModule {}
