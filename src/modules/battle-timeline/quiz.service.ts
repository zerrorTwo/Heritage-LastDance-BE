import { Injectable } from '@nestjs/common';
import { ClaudeClientService } from './claude-client.service';
import { BattleTimelinePromptBuilder } from './prompt-builder.service';
import { BattleTimelineQuizRepository } from './repository';
import { BattleTimelineValidator } from './timeline-validator.service';
import { BattleQuizQuestion, BattleTimeline } from './types';

@Injectable()
export class BattleQuizService {
  constructor(
    private readonly claude: ClaudeClientService,
    private readonly prompts: BattleTimelinePromptBuilder,
    private readonly validator: BattleTimelineValidator,
    private readonly quizRepo: BattleTimelineQuizRepository,
  ) {}

  async generateQuiz(timeline: BattleTimeline): Promise<BattleQuizQuestion[]> {
    const prompt = this.prompts.buildQuizPrompt(timeline);
    let raw = await this.claude.complete({ ...prompt, maxTokens: 4096 });
    let validation = this.validator.parseAndValidateQuiz(raw);

    if (!validation.valid) {
      raw = await this.claude.complete({
        system: prompt.system,
        user: [
          prompt.user,
          '',
          'Your previous quiz response was invalid.',
          `Errors: ${validation.errors.join('; ')}`,
          'Return a corrected JSON array of exactly 10 questions only.',
        ].join('\n'),
        maxTokens: 4096,
      });
      validation = this.validator.parseAndValidateQuiz(raw);
    }

    if (!validation.valid) {
      throw new Error(`Quiz validation failed: ${validation.errors.join('; ')}`);
    }

    return validation.data;
  }

  async generateAndStore(battleId: string, timeline: BattleTimeline) {
    const questions = await this.generateQuiz(timeline);
    return this.quizRepo.upsertForBattle(battleId, questions);
  }
}
