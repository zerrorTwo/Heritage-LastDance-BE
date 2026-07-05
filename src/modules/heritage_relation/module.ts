import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HeritageRelation } from './model';
import { HeritageRelationRepository } from './repository';
import { HeritageRelationService } from './service';
import { HeritageRelationController } from './controller';
import { HeritageModule } from '../heritage/module';

@Module({
  imports: [TypeOrmModule.forFeature([HeritageRelation]), HeritageModule],
  controllers: [HeritageRelationController],
  providers: [HeritageRelationRepository, HeritageRelationService],
})
export class HeritageRelationModule {}
