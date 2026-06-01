import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BattleTimelineAliasController, BattleTimelineController } from './controller';
import { ClaudeClientService } from './claude-client.service';
import { BattleDocumentExtractionService } from './document-extraction.service';
import {
  BattleTimelineBattleModel,
  BattleTimelineQuizModel,
  BattleTimelineVoiceScriptModel,
} from './model';
import { BattleTimelinePromptBuilder } from './prompt-builder.service';
import {
  BattleTimelineBattleRepository,
  BattleTimelineQuizRepository,
  BattleTimelineVoiceScriptRepository,
} from './repository';
import { BattleQuizService } from './quiz.service';
import { BattleTimelineSeedService } from './seed.service';
import { BattleTimelineService } from './service';
import { BattleSummaryService } from './summary.service';
import { BattleTimelineValidator } from './timeline-validator.service';
import { BattleVoiceScriptService } from './voice-script.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BattleTimelineBattleModel,
      BattleTimelineQuizModel,
      BattleTimelineVoiceScriptModel,
    ]),
  ],
  controllers: [BattleTimelineController, BattleTimelineAliasController],
  providers: [
    ClaudeClientService,
    BattleTimelinePromptBuilder,
    BattleTimelineValidator,
    BattleTimelineBattleRepository,
    BattleTimelineQuizRepository,
    BattleTimelineVoiceScriptRepository,
    BattleTimelineService,
    BattleDocumentExtractionService,
    BattleVoiceScriptService,
    BattleQuizService,
    BattleSummaryService,
    BattleTimelineSeedService,
  ],
  exports: [
    BattleTimelineService,
    BattleDocumentExtractionService,
    BattleVoiceScriptService,
    BattleQuizService,
    BattleSummaryService,
  ],
})
export class BattleTimelineModule {}
