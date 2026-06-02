import { BadRequestException, Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from '../../common/response';
import { AuthenticatedRequest } from '../../common/decorators/current-user.decorator';
import {
  ExtractBattleDocumentDto,
  GenerateBattleTimelineDto,
  GenerateQuizDto,
  GenerateSummaryDto,
  PrepareVoiceScriptDto,
} from './dto/battle-timeline.dto';
import { BattleDocumentExtractionService } from './document-extraction.service';
import { BattleQuizService } from './quiz.service';
import { BattleSummaryService } from './summary.service';
import { BattleTimelineService } from './service';
import { BattleTimelineValidator } from './timeline-validator.service';
import { BattleVoiceScriptService } from './voice-script.service';

@Controller('battle-timeline')
@ApiTags('Battle Timeline')
export class BattleTimelineController {
  constructor(
    private readonly battleTimelineService: BattleTimelineService,
    private readonly extractionService: BattleDocumentExtractionService,
    private readonly voiceService: BattleVoiceScriptService,
    private readonly quizService: BattleQuizService,
    private readonly summaryService: BattleSummaryService,
    private readonly validator: BattleTimelineValidator,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List saved battle timelines for the library screen' })
  async listBattles() {
    return Response.OK(await this.battleTimelineService.listBattles());
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate and save a BattleTimeline JSON from battle text' })
  @ApiResponse({ status: 201, description: 'Battle timeline generated successfully' })
  async generate(@Body() dto: GenerateBattleTimelineDto, @Req() req: AuthenticatedRequest) {
    const userId = req.user?.userId ?? req.user?.sub ?? null;
    return Response.Created(await this.battleTimelineService.generate(dto, userId));
  }

  @Post('extract')
  @ApiOperation({ summary: 'Clean raw PDF/DOCX extracted text into a battle narrative' })
  async extract(@Body() dto: ExtractBattleDocumentDto) {
    return Response.OK(await this.extractionService.extract(dto.rawText, dto.pageCount ?? 1));
  }

  @Post('voice-script')
  @ApiOperation({ summary: 'Prepare TTS-ready narration scripts for every battle step' })
  async voiceScript(@Body() dto: PrepareVoiceScriptDto) {
    const timeline = await this.battleTimelineService.validateTimelineOrThrow(dto.timeline);
    return Response.OK(await this.voiceService.prepareScripts(timeline, dto.language ?? 'vi'));
  }

  @Post('quiz')
  @ApiOperation({ summary: 'Generate 10 multiple-choice questions from a BattleTimeline' })
  async quiz(@Body() dto: GenerateQuizDto) {
    const validation = this.validator.validateTimeline(dto.timeline);
    if (!validation.valid) {
      throw new BadRequestException(validation.errors.join('; '));
    }
    return Response.OK(await this.quizService.generateQuiz(validation.data));
  }

  @Post('summary')
  @ApiOperation({ summary: 'Generate a 2-sentence battle library-card summary' })
  async summary(@Body() dto: GenerateSummaryDto) {
    const validation = this.validator.validateTimeline(dto.timeline);
    if (!validation.valid) {
      throw new BadRequestException(validation.errors.join('; '));
    }
    return Response.OK({ summary: await this.summaryService.generateSummary(validation.data) });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a saved generated battle timeline by id' })
  async getBattle(@Param('id') id: string) {
    return Response.OK(await this.battleTimelineService.getBattle(id));
  }
}

@Controller('battle-timeline-alias')
@ApiTags('Battle Timeline')
export class BattleTimelineAliasController {
  constructor(
    private readonly battleTimelineService: BattleTimelineService,
    private readonly extractionService: BattleDocumentExtractionService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Alias for listing saved battle timelines from fe_battle_timeline.md',
  })
  async listBattles() {
    return Response.OK(await this.battleTimelineService.listBattles());
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Alias for getting a saved battle timeline from fe_battle_timeline.md',
  })
  async getBattle(@Param('id') id: string) {
    return Response.OK(await this.battleTimelineService.getBattle(id));
  }

  @Post('generate')
  @ApiOperation({
    summary: 'Alias for P1 battle generation from be_battle_timeline.md',
  })
  async generate(@Body() dto: GenerateBattleTimelineDto, @Req() req: AuthenticatedRequest) {
    const userId = req.user?.userId ?? req.user?.sub ?? null;
    return Response.Created(await this.battleTimelineService.generate(dto, userId));
  }

  @Post('extract')
  @ApiOperation({
    summary: 'Alias for P2 document extraction from be_battle_timeline.md',
  })
  async extract(@Body() dto: ExtractBattleDocumentDto) {
    return Response.OK(await this.extractionService.extract(dto.rawText, dto.pageCount ?? 1));
  }
}
