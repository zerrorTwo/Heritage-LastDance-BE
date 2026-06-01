import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { GenerateBattleTimelineDto } from './dto/battle-timeline.dto';
import { BattleTimelineVoiceStatus } from './model';
import { BattleTimelineBattleRepository } from './repository';
import { ClaudeClientService } from './claude-client.service';
import { BattleTimelinePromptBuilder } from './prompt-builder.service';
import { BattleTimelineValidator } from './timeline-validator.service';
import { BattleQuizService } from './quiz.service';
import { BattleSummaryService } from './summary.service';
import { BattleVoiceScriptService } from './voice-script.service';
import { BattleTimeline } from './types';

@Injectable()
export class BattleTimelineService {
  constructor(
    private readonly battleRepo: BattleTimelineBattleRepository,
    private readonly claude: ClaudeClientService,
    private readonly prompts: BattleTimelinePromptBuilder,
    private readonly validator: BattleTimelineValidator,
    private readonly quizService: BattleQuizService,
    private readonly summaryService: BattleSummaryService,
    private readonly voiceService: BattleVoiceScriptService,
  ) {}

  async generate(dto: GenerateBattleTimelineDto, userId?: string | null) {
    const text = dto.text.trim();
    const wordCount = this.validator.countWords(text);
    if (wordCount < 30 || wordCount > 5000) {
      throw new BadRequestException('Battle description must be between 30 and 5000 words');
    }

    const input = {
      text,
      mapWidth: dto.mapWidth ?? 900,
      mapHeight: dto.mapHeight ?? 600,
      language: dto.language ?? 'vi',
    };
    const pointsDeducted = this.estimateGenerationCost(wordCount, Boolean(dto.includeVoice));

    const timeline = await this.generateTimelineWithRetry(input);
    const battle = await this.battleRepo.create({
      slug: timeline.battle.id,
      name: timeline.battle.name,
      battleDate: timeline.battle.date,
      outcome: timeline.battle.outcome,
      summary: timeline.battle.summary,
      timeline,
      userId: userId ?? null,
      pointsDeducted,
      voiceStatus: dto.includeVoice ? BattleTimelineVoiceStatus.PENDING : BattleTimelineVoiceStatus.NONE,
    });

    this.enqueueNonBlockingJobs(battle.id, timeline, dto.language ?? 'vi', Boolean(dto.includeVoice));

    return {
      battleId: battle.id,
      timeline,
      pointsDeducted,
      pointsRemaining: null,
      voiceStatus: battle.voiceStatus,
    };
  }

  async getBattle(id: string) {
    const battle = await this.battleRepo.findById(id);
    if (!battle) throw new NotFoundException('Battle timeline not found');
    return battle;
  }

  async listBattles() {
    const battles = await this.battleRepo.findAll();
    return battles.map((battle) => ({
      id: battle.id,
      slug: battle.slug,
      name: battle.name,
      battleDate: battle.battleDate,
      outcome: battle.outcome,
      summary: battle.summary,
      stepsCount: battle.timeline?.steps?.length ?? 0,
      factions: battle.timeline?.factions ?? [],
      map: battle.timeline?.map
        ? {
            width: battle.timeline.map.width,
            height: battle.timeline.map.height,
            terrainCount: battle.timeline.map.terrain?.length ?? 0,
          }
        : null,
      voiceStatus: battle.voiceStatus,
      pointsDeducted: battle.pointsDeducted,
      createdAt: battle.createdAt,
      updatedAt: battle.updatedAt,
    }));
  }

  async validateTimelineOrThrow(input: unknown): Promise<BattleTimeline> {
    const validation = this.validator.validateTimeline(input);
    if (!validation.valid) {
      throw new BadRequestException(validation.errors.join('; '));
    }
    return validation.data;
  }

  private async generateTimelineWithRetry(input: {
    text: string;
    mapWidth: number;
    mapHeight: number;
    language: string;
  }): Promise<BattleTimeline> {
    const prompt = this.prompts.buildGenerationPrompt(input);
    let raw = await this.claude.complete({ ...prompt, maxTokens: 4096 });
    let validation = this.validator.parseAndValidate(raw);

    for (let attempt = 0; !validation.valid && attempt < 2; attempt++) {
      const retryPrompt = this.prompts.buildGenerationRetryPrompt(
        validation.errorType,
        validation.errors.join('; '),
      );
      raw = await this.claude.complete({
        system: prompt.system,
        user: retryPrompt,
        messages: [
          { role: 'user', content: prompt.user },
          { role: 'assistant', content: raw },
          { role: 'user', content: retryPrompt },
        ],
        maxTokens: 4096,
      });
      validation = this.validator.parseAndValidate(raw);
    }

    if (!validation.valid) {
      throw new ServiceUnavailableException(
        `Claude failed to produce a valid BattleTimeline: ${validation.errors.join('; ')}`,
      );
    }

    return validation.data;
  }

  private enqueueNonBlockingJobs(
    battleId: string,
    timeline: BattleTimeline,
    language: string,
    includeVoice: boolean,
  ) {
    this.summaryService.generateAndStore(battleId, timeline).catch(() => undefined);
    this.quizService.generateAndStore(battleId, timeline).catch(() => undefined);

    if (includeVoice) {
      this.voiceService
        .prepareAndStore(battleId, timeline, language)
        .then(() => this.battleRepo.update(battleId, { voiceStatus: BattleTimelineVoiceStatus.READY }))
        .catch(() => this.battleRepo.update(battleId, { voiceStatus: BattleTimelineVoiceStatus.FAILED }));
    }

    // Thumbnail generation is intentionally a no-op until an image renderer/queue exists.
  }

  private estimateGenerationCost(wordCount: number, includeVoice: boolean): number {
    return Math.max(20, Math.ceil(wordCount / 150) * 10) + (includeVoice ? 20 : 0);
  }
}
