import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HeritageTranslation } from './model';
import { HeritageTranslationRepository } from './repository';
import { HeritageTranslationService } from './service';
import { HeritageTranslationController } from './controller';
import { HeritageModule } from '../heritage/module';

@Module({
  imports: [TypeOrmModule.forFeature([HeritageTranslation]), HeritageModule],
  controllers: [HeritageTranslationController],
  providers: [HeritageTranslationRepository, HeritageTranslationService],
})
export class HeritageTranslationModule {}
