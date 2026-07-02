import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HeritageItem } from './model';
import { HeritageRepository } from './repository';
import { HeritageService } from './service';
import { HeritageController } from './controller';
import { HeritageSearchIndexBootstrap } from './search-index.bootstrap';
import { RagModule } from '../rag/module';

@Module({
  imports: [TypeOrmModule.forFeature([HeritageItem]), RagModule],
  controllers: [HeritageController],
  providers: [HeritageRepository, HeritageService, HeritageSearchIndexBootstrap],
  exports: [HeritageRepository],
})
export class HeritageModule {}
