import { Injectable } from '@nestjs/common';
import { ClaudeClientService } from './claude-client.service';
import { BattleTimelinePromptBuilder } from './prompt-builder.service';
import { BattleTimelineBattleRepository } from './repository';
import { BattleTimeline } from './types';

@Injectable()
export class BattleSummaryService {
  constructor(
    private readonly claude: ClaudeClientService,
    private readonly prompts: BattleTimelinePromptBuilder,
    private readonly battleRepo: BattleTimelineBattleRepository,
  ) {}

  async generateSummary(timeline: BattleTimeline): Promise<string> {
    const prompt = this.prompts.buildSummaryPrompt(timeline);
    const raw = await this.claude.complete({ ...prompt, maxTokens: 300 });
    return this.firstTwoSentences(raw.trim()) || timeline.battle.summary;
  }

  async generateAndStore(battleId: string, timeline: BattleTimeline) {
    const summary = await this.generateSummary(timeline);
    return this.battleRepo.update(battleId, { summary });
  }

  private firstTwoSentences(text: string): string {
    const matches = text.match(/[^.!?]+[.!?]+/g);
    if (!matches?.length) return text;
    return matches.slice(0, 2).join(' ').trim();
  }
}
