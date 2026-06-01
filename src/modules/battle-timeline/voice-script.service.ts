import { Injectable } from '@nestjs/common';
import { ClaudeClientService } from './claude-client.service';
import { BattleTimelinePromptBuilder } from './prompt-builder.service';
import { BattleTimelineVoiceScriptRepository } from './repository';
import { BattleTimeline } from './types';

@Injectable()
export class BattleVoiceScriptService {
  constructor(
    private readonly claude: ClaudeClientService,
    private readonly prompts: BattleTimelinePromptBuilder,
    private readonly voiceRepo: BattleTimelineVoiceScriptRepository,
  ) {}

  async prepareScripts(timeline: BattleTimeline, language = 'vi') {
    return Promise.all(
      timeline.steps.map(async (_step, index) => {
        const prompt = this.prompts.buildVoiceScriptPrompt(timeline, index, language);
        try {
          const script = await this.claude.complete({ ...prompt, maxTokens: 700 });
          return {
            step: timeline.steps[index].step,
            script: script.trim(),
            audioUrl: null,
            isFallback: true,
          };
        } catch {
          return {
            step: timeline.steps[index].step,
            script: timeline.steps[index].narration,
            audioUrl: null,
            isFallback: true,
          };
        }
      }),
    );
  }

  async prepareAndStore(battleId: string, timeline: BattleTimeline, language = 'vi') {
    const scripts = await this.prepareScripts(timeline, language);
    return this.voiceRepo.replaceForBattle(battleId, scripts);
  }
}
