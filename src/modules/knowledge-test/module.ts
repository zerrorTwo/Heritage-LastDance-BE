import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  KnowledgeTestAttemptModel,
  KnowledgeTestModel,
  KnowledgeTestOptionModel,
  KnowledgeTestQuestionModel,
} from './model';
import {
  KnowledgeTestAttemptRepository,
  KnowledgeTestOptionRepository,
  KnowledgeTestQuestionRepository,
  KnowledgeTestRepository,
} from './repository';
import { KnowledgeTestService } from './service';
import { KnowledgeTestController } from './controller';
import { LeaderboardModule } from '../leaderboard/module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      KnowledgeTestModel,
      KnowledgeTestQuestionModel,
      KnowledgeTestOptionModel,
      KnowledgeTestAttemptModel,
    ]),
    LeaderboardModule,
  ],
  controllers: [KnowledgeTestController],
  providers: [
    KnowledgeTestRepository,
    KnowledgeTestQuestionRepository,
    KnowledgeTestOptionRepository,
    KnowledgeTestAttemptRepository,
    KnowledgeTestService,
  ],
  exports: [KnowledgeTestService],
})
export class KnowledgeTestModule {}
