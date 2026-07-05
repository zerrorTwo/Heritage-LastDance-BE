import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { KnowledgeTestService } from './service';
import {
  AddOptionDto,
  AddQuestionDto,
  CreateKnowledgeTestDto,
  GetTestsQueryDto,
  SubmitAttemptDto,
  UpdateKnowledgeTestBasicDto,
  UpdateOptionDto,
  UpdateQuestionDto,
} from './dto/knowledge-test.dto';
import { GeneralResponse, Response } from '../../common/response';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import {
  KnowledgeTestLeaderboardResponseDto,
  KnowledgeTestListResponseDto,
  KnowledgeTestOptionResponseDto,
  KnowledgeTestOptionsResponseDto,
  KnowledgeTestQuestionDetailResponseDto,
  KnowledgeTestQuestionResponseDto,
  KnowledgeTestQuestionsResponseDto,
  KnowledgeTestResponseDto,
  SubmitAttemptResponseDto,
  SuccessMessageResponseDto,
} from './dto/response';

@ApiExtraModels(
  GeneralResponse,
  KnowledgeTestResponseDto,
  KnowledgeTestListResponseDto,
  KnowledgeTestLeaderboardResponseDto,
  KnowledgeTestQuestionsResponseDto,
  KnowledgeTestQuestionDetailResponseDto,
  KnowledgeTestQuestionResponseDto,
  KnowledgeTestOptionsResponseDto,
  KnowledgeTestOptionResponseDto,
  SubmitAttemptResponseDto,
  SuccessMessageResponseDto,
)
@ApiTags('KnowledgeTests')
@Controller('knowledge-tests')
export class KnowledgeTestController {
  constructor(private readonly testService: KnowledgeTestService) {}

  // =================== Test ===================

  @Post()
  @ApiOperation({ summary: 'Create new knowledge test' })
  @ApiBody({ type: CreateKnowledgeTestDto })
  @ApiResponse({
    status: 201,
    description: 'Created test (with questions + options)',
    schema: {
      allOf: [
        { $ref: getSchemaPath(GeneralResponse) },
        { properties: { data: { $ref: getSchemaPath(KnowledgeTestResponseDto) } } },
      ],
    },
  })
  async createTest(@Body() dto: CreateKnowledgeTestDto) {
    const result = await this.testService.createTest(dto);
    return Response.Created(result);
  }

  @Get()
  @ApiOperation({ summary: 'List tests (status filter + pagination)' })
  @ApiResponse({
    status: 200,
    description: 'Paginated test list',
    schema: {
      allOf: [
        { $ref: getSchemaPath(GeneralResponse) },
        { properties: { data: { $ref: getSchemaPath(KnowledgeTestListResponseDto) } } },
      ],
    },
  })
  async getTests(@Query() query: GetTestsQueryDto) {
    const result = await this.testService.getTests(query);
    return Response.OK(result);
  }

  @Get('heritage/:heritageId')
  @ApiOperation({ summary: 'Tests by heritage' })
  @ApiParam({ name: 'heritageId' })
  @ApiResponse({
    status: 200,
    description: 'List of tests for given heritage',
    schema: {
      allOf: [
        { $ref: getSchemaPath(GeneralResponse) },
        {
          properties: {
            data: {
              type: 'array',
              items: { $ref: getSchemaPath(KnowledgeTestResponseDto) },
            },
          },
        },
      ],
    },
  })
  async getByHeritage(@Param('heritageId') heritageId: string) {
    const result = await this.testService.getTestsByHeritage(heritageId);
    return Response.OK(result);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get test detail (with questions + options)' })
  @ApiParam({ name: 'id' })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(GeneralResponse) },
        { properties: { data: { $ref: getSchemaPath(KnowledgeTestResponseDto) } } },
      ],
    },
  })
  async getTestById(@Param('id') id: string) {
    const result = await this.testService.getTestById(id);
    return Response.OK(result);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update test (basic info)' })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: UpdateKnowledgeTestBasicDto })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(GeneralResponse) },
        { properties: { data: { $ref: getSchemaPath(KnowledgeTestResponseDto) } } },
      ],
    },
  })
  async updateTest(
    @Param('id') id: string,
    @Body() dto: UpdateKnowledgeTestBasicDto,
  ) {
    const result = await this.testService.updateTest(id, dto);
    return Response.OK(result);
  }

  @Put(':id/basic-info')
  @ApiOperation({ summary: 'Update basic info' })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: UpdateKnowledgeTestBasicDto })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(GeneralResponse) },
        { properties: { data: { $ref: getSchemaPath(KnowledgeTestResponseDto) } } },
      ],
    },
  })
  async updateBasicInfo(
    @Param('id') id: string,
    @Body() dto: UpdateKnowledgeTestBasicDto,
  ) {
    const result = await this.testService.updateBasicInfo(id, dto);
    return Response.OK(result);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete test' })
  @ApiParam({ name: 'id' })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(GeneralResponse) },
        { properties: { data: { $ref: getSchemaPath(SuccessMessageResponseDto) } } },
      ],
    },
  })
  async deleteTest(@Param('id') id: string) {
    const result = await this.testService.deleteTest(id);
    return Response.OK(result);
  }

  // =================== Submit / Leaderboard ===================

  @Post(':id/attempt')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Submit attempt and calculate score' })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: SubmitAttemptDto })
  @ApiResponse({
    status: 200,
    description: 'Score result',
    schema: {
      allOf: [
        { $ref: getSchemaPath(GeneralResponse) },
        { properties: { data: { $ref: getSchemaPath(SubmitAttemptResponseDto) } } },
      ],
    },
  })
  async submitAttempt(
    @Param('id') id: string,
    @Body() dto: SubmitAttemptDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.testService.submitAttempt(
      id,
      user.sub,
      user.email ?? null,
      dto,
    );
    return Response.OK(result);
  }

  @Get(':id/leaderboard')
  @ApiOperation({ summary: 'Top performers leaderboard for test' })
  @ApiParam({ name: 'id' })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(GeneralResponse) },
        { properties: { data: { $ref: getSchemaPath(KnowledgeTestLeaderboardResponseDto) } } },
      ],
    },
  })
  async getLeaderboard(@Param('id') id: string) {
    const result = await this.testService.getLeaderboard(id);
    return Response.OK(result);
  }

  // =================== Questions ===================

  @Get(':testId/questions')
  @ApiOperation({ summary: 'List questions' })
  @ApiParam({ name: 'testId' })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(GeneralResponse) },
        { properties: { data: { $ref: getSchemaPath(KnowledgeTestQuestionsResponseDto) } } },
      ],
    },
  })
  async getQuestions(@Param('testId') testId: string) {
    const result = await this.testService.getQuestions(testId);
    return Response.OK(result);
  }

  @Post(':testId/questions')
  @ApiOperation({ summary: 'Add question' })
  @ApiParam({ name: 'testId' })
  @ApiBody({ type: AddQuestionDto })
  @ApiResponse({
    status: 201,
    schema: {
      allOf: [
        { $ref: getSchemaPath(GeneralResponse) },
        { properties: { data: { $ref: getSchemaPath(KnowledgeTestQuestionResponseDto) } } },
      ],
    },
  })
  async addQuestion(
    @Param('testId') testId: string,
    @Body() dto: AddQuestionDto,
  ) {
    const result = await this.testService.addQuestion(testId, dto);
    return Response.Created(result);
  }

  @Get(':testId/questions/:questionId')
  @ApiOperation({ summary: 'Question detail' })
  @ApiParam({ name: 'testId' })
  @ApiParam({ name: 'questionId' })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(GeneralResponse) },
        { properties: { data: { $ref: getSchemaPath(KnowledgeTestQuestionDetailResponseDto) } } },
      ],
    },
  })
  async getQuestionById(
    @Param('testId') testId: string,
    @Param('questionId') questionId: string,
  ) {
    const result = await this.testService.getQuestionById(testId, questionId);
    return Response.OK(result);
  }

  @Put(':testId/questions/:questionId')
  @ApiOperation({ summary: 'Update question' })
  @ApiParam({ name: 'testId' })
  @ApiParam({ name: 'questionId' })
  @ApiBody({ type: UpdateQuestionDto })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(GeneralResponse) },
        { properties: { data: { $ref: getSchemaPath(KnowledgeTestQuestionResponseDto) } } },
      ],
    },
  })
  async updateQuestion(
    @Param('testId') testId: string,
    @Param('questionId') questionId: string,
    @Body() dto: UpdateQuestionDto,
  ) {
    const result = await this.testService.updateQuestion(testId, questionId, dto);
    return Response.OK(result);
  }

  @Delete(':testId/questions/:questionId')
  @ApiOperation({ summary: 'Delete question' })
  @ApiParam({ name: 'testId' })
  @ApiParam({ name: 'questionId' })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(GeneralResponse) },
        { properties: { data: { $ref: getSchemaPath(SuccessMessageResponseDto) } } },
      ],
    },
  })
  async deleteQuestion(
    @Param('testId') testId: string,
    @Param('questionId') questionId: string,
  ) {
    const result = await this.testService.deleteQuestion(testId, questionId);
    return Response.OK(result);
  }

  // =================== Options ===================

  @Get(':testId/questions/:questionId/options')
  @ApiOperation({ summary: 'List options of a question' })
  @ApiParam({ name: 'testId' })
  @ApiParam({ name: 'questionId' })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(GeneralResponse) },
        { properties: { data: { $ref: getSchemaPath(KnowledgeTestOptionsResponseDto) } } },
      ],
    },
  })
  async getOptions(
    @Param('testId') testId: string,
    @Param('questionId') questionId: string,
  ) {
    const result = await this.testService.getOptions(testId, questionId);
    return Response.OK(result);
  }

  @Post(':testId/questions/:questionId/options')
  @ApiOperation({ summary: 'Add option' })
  @ApiParam({ name: 'testId' })
  @ApiParam({ name: 'questionId' })
  @ApiBody({ type: AddOptionDto })
  @ApiResponse({
    status: 201,
    schema: {
      allOf: [
        { $ref: getSchemaPath(GeneralResponse) },
        { properties: { data: { $ref: getSchemaPath(KnowledgeTestOptionResponseDto) } } },
      ],
    },
  })
  async addOption(
    @Param('testId') testId: string,
    @Param('questionId') questionId: string,
    @Body() dto: AddOptionDto,
  ) {
    const result = await this.testService.addOption(testId, questionId, dto);
    return Response.Created(result);
  }

  @Put(':testId/questions/:questionId/options/:optionId')
  @ApiOperation({ summary: 'Update option' })
  @ApiParam({ name: 'testId' })
  @ApiParam({ name: 'questionId' })
  @ApiParam({ name: 'optionId' })
  @ApiBody({ type: UpdateOptionDto })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(GeneralResponse) },
        { properties: { data: { $ref: getSchemaPath(KnowledgeTestOptionResponseDto) } } },
      ],
    },
  })
  async updateOption(
    @Param('testId') testId: string,
    @Param('questionId') questionId: string,
    @Param('optionId') optionId: string,
    @Body() dto: UpdateOptionDto,
  ) {
    const result = await this.testService.updateOption(
      testId,
      questionId,
      optionId,
      dto,
    );
    return Response.OK(result);
  }

  @Delete(':testId/questions/:questionId/options/:optionId')
  @ApiOperation({ summary: 'Delete option' })
  @ApiParam({ name: 'testId' })
  @ApiParam({ name: 'questionId' })
  @ApiParam({ name: 'optionId' })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(GeneralResponse) },
        { properties: { data: { $ref: getSchemaPath(SuccessMessageResponseDto) } } },
      ],
    },
  })
  async deleteOption(
    @Param('testId') testId: string,
    @Param('questionId') questionId: string,
    @Param('optionId') optionId: string,
  ) {
    const result = await this.testService.deleteOption(
      testId,
      questionId,
      optionId,
    );
    return Response.OK(result);
  }
}
