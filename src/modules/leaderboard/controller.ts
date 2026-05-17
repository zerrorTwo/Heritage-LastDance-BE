import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { LeaderboardService } from './service';
import {
  CreateLeaderboardDto,
  GetAllLeaderboardQueryDto,
  GetByHeritageQueryDto,
  UpdateLeaderboardDto,
} from './dto/leaderboard.dto';
import { GeneralResponse, Response } from '../../common/response';
import {
  DeleteLeaderboardResponseDto,
  LeaderboardByHeritageResponseDto,
  LeaderboardListResponseDto,
  LeaderboardResponseDto,
} from './dto/response';

@ApiExtraModels(
  GeneralResponse,
  LeaderboardResponseDto,
  LeaderboardListResponseDto,
  LeaderboardByHeritageResponseDto,
  DeleteLeaderboardResponseDto,
)
@ApiTags('Leaderboards')
@Controller('leaderBoards')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  @ApiOperation({ summary: 'List leaderboard (search/sort/pagination)' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of leaderboards',
    schema: {
      allOf: [
        { $ref: getSchemaPath(GeneralResponse) },
        { properties: { data: { $ref: getSchemaPath(LeaderboardListResponseDto) } } },
      ],
    },
  })
  async getAll(@Query() query: GetAllLeaderboardQueryDto) {
    const result = await this.leaderboardService.getAll(query);
    return Response.OK(result);
  }

  @Post()
  @ApiOperation({ summary: 'Create / update leaderboard for heritage' })
  @ApiBody({ type: CreateLeaderboardDto })
  @ApiResponse({
    status: 201,
    description: 'Leaderboard created with first ranking entry',
    schema: {
      allOf: [
        { $ref: getSchemaPath(GeneralResponse) },
        { properties: { data: { $ref: getSchemaPath(LeaderboardResponseDto) } } },
      ],
    },
  })
  async createNew(@Body() dto: CreateLeaderboardDto) {
    const result = await this.leaderboardService.createNew(dto);
    return Response.Created(result);
  }

  @Get('heritage/:heritageId')
  @ApiOperation({ summary: 'Get leaderboard by heritageId (paginate rankings)' })
  @ApiParam({ name: 'heritageId' })
  @ApiResponse({
    status: 200,
    description: 'Leaderboard with paginated rankings + stats',
    schema: {
      allOf: [
        { $ref: getSchemaPath(GeneralResponse) },
        { properties: { data: { $ref: getSchemaPath(LeaderboardByHeritageResponseDto) } } },
      ],
    },
  })
  async getByHeritage(
    @Param('heritageId') heritageId: string,
    @Query() query: GetByHeritageQueryDto,
  ) {
    const result = await this.leaderboardService.getByHeritageId(heritageId, query);
    return Response.OK(result);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get leaderboard detail' })
  @ApiParam({ name: 'id' })
  @ApiResponse({
    status: 200,
    description: 'Leaderboard detail with all rankings',
    schema: {
      allOf: [
        { $ref: getSchemaPath(GeneralResponse) },
        { properties: { data: { $ref: getSchemaPath(LeaderboardResponseDto) } } },
      ],
    },
  })
  async getById(@Param('id') id: string) {
    const result = await this.leaderboardService.getLeaderBoardById(id);
    return Response.OK(result);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update leaderboard' })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: UpdateLeaderboardDto })
  @ApiResponse({
    status: 200,
    description: 'Updated leaderboard',
    schema: {
      allOf: [
        { $ref: getSchemaPath(GeneralResponse) },
        { properties: { data: { $ref: getSchemaPath(LeaderboardResponseDto) } } },
      ],
    },
  })
  async update(@Param('id') id: string, @Body() dto: UpdateLeaderboardDto) {
    const result = await this.leaderboardService.updateLeaderBoard(id, dto);
    return Response.OK(result);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete leaderboard' })
  @ApiParam({ name: 'id' })
  @ApiResponse({
    status: 200,
    description: 'Leaderboard deleted',
    schema: {
      allOf: [
        { $ref: getSchemaPath(GeneralResponse) },
        { properties: { data: { $ref: getSchemaPath(DeleteLeaderboardResponseDto) } } },
      ],
    },
  })
  async delete(@Param('id') id: string) {
    const result = await this.leaderboardService.deleteLeaderBoard(id);
    return Response.OK(result);
  }
}
