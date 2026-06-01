import { Injectable } from '@nestjs/common';
import { ClaudeClientService } from './claude-client.service';
import { BattleTimelinePromptBuilder } from './prompt-builder.service';
import { BattleTimelineValidator } from './timeline-validator.service';

@Injectable()
export class BattleDocumentExtractionService {
  constructor(
    private readonly claude: ClaudeClientService,
    private readonly prompts: BattleTimelinePromptBuilder,
    private readonly validator: BattleTimelineValidator,
  ) {}

  async extract(rawText: string, pageCount = 1) {
    const prompt = this.prompts.buildExtractionPrompt(rawText);
    let text = '';
    let usedRawFallback = false;

    try {
      text = (await this.claude.complete({
        ...prompt,
        maxTokens: 4096,
      })).trim();
    } catch {
      text = rawText.trim();
      usedRawFallback = true;
    }

    if (!text) {
      text = rawText.trim();
      usedRawFallback = true;
    }

    const wordCount = this.validator.countWords(text);
    return {
      text,
      wordCount,
      pageCount,
      estimatedCost: this.estimateCost(wordCount),
      extractedTitle: this.extractTitle(text),
      usedRawFallback,
    };
  }

  private estimateCost(wordCount: number): number {
    return Math.max(10, Math.ceil(wordCount / 150) * 10);
  }

  private extractTitle(text: string): string | null {
    const firstSentence = text.split(/[.!?]\s/)[0]?.trim();
    if (!firstSentence) return null;
    return firstSentence.slice(0, 120);
  }
}
