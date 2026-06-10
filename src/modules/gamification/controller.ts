import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { GamificationService } from './service';
import { CheckInDto } from './dto/check-in.dto';
import { Response } from '../../common/response';

@ApiTags('Gamification')
@Controller('gamification')
export class GamificationController {
  constructor(private readonly service: GamificationService) {}

  @Post('check-in')
  @ApiOperation({ summary: 'Điểm danh GPS tại di tích (XP chỉ cấp khi ở trong bán kính / demo)' })
  async checkIn(@Body() dto: CheckInDto) {
    const result = await this.service.checkIn(dto.userId, dto.heritageId, {
      heritageTitle: dto.heritageTitle,
      lat: dto.lat,
      lng: dto.lng,
      accuracy: dto.accuracy,
      photoUrl: dto.photoUrl,
      visibility: dto.visibility,
      demo: dto.demo,
      displayName: dto.displayName,
      avatarUrl: dto.avatarUrl,
    });
    return Response.OK(result);
  }

  @Post('moderate/:checkInId')
  @ApiOperation({ summary: 'Admin: ẩn/khôi phục một check-in không hợp lệ' })
  async moderate(
    @Param('checkInId') checkInId: string,
    @Body() body: { action: 'hide' | 'restore' },
  ) {
    return Response.OK(await this.service.moderate(checkInId, body?.action || 'hide'));
  }

  @Get('progress/:userId')
  @ApiOperation({ summary: 'Tiến trình gamification của user (XP/level/streak)' })
  @ApiParam({ name: 'userId' })
  async getProgress(@Param('userId') userId: string) {
    return Response.OK(await this.service.getProgress(userId));
  }

  @Get('passport/:userId')
  @ApiOperation({ summary: 'Hộ chiếu di sản — danh sách di tích đã điểm danh' })
  @ApiParam({ name: 'userId' })
  async getPassport(@Param('userId') userId: string) {
    return Response.OK({ items: await this.service.getPassport(userId) });
  }

  @Get('community')
  @ApiOperation({ summary: 'Feed cộng đồng: check-in công khai mới nhất (lọc theo heritageId nếu có)' })
  async getCommunity(
    @Query('heritageId') heritageId?: string,
    @Query('limit') limit?: string,
  ) {
    const items = await this.service.getCommunity(heritageId, limit ? Number(limit) : 24);
    return Response.OK({ items });
  }

  @Get('visited/:userId')
  @ApiOperation({ summary: 'Danh sách heritageId user đã ghé thăm (cho badge)' })
  @ApiParam({ name: 'userId' })
  async getVisited(@Param('userId') userId: string) {
    return Response.OK({ heritageIds: await this.service.getVisited(userId) });
  }
}
