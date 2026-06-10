import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TripService } from './service';
import { CreateTripDto, UpdateTripVisibilityDto } from './dto/trip.dto';
import { Response } from '../../common/response';

@ApiTags('Trips')
@Controller('trips')
export class TripController {
  constructor(private readonly tripService: TripService) {}

  @Post()
  @ApiOperation({ summary: 'Lưu một hành trình đã ghi' })
  async create(@Body() dto: CreateTripDto) {
    return Response.Created(await this.tripService.createTrip(dto));
  }

  @Get('community')
  @ApiOperation({ summary: 'Feed hành trình cộng đồng (public)' })
  async community(@Query('limit') limit?: string) {
    const n = Math.min(Number(limit) || 30, 100);
    return Response.OK(await this.tripService.getCommunity(n));
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Danh sách hành trình của user' })
  async byUser(@Param('userId') userId: string) {
    return Response.OK(await this.tripService.getUserTrips(userId));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết hành trình' })
  async detail(@Param('id') id: string) {
    return Response.OK(await this.tripService.getTripById(id));
  }

  @Patch(':id/visibility')
  @ApiOperation({ summary: 'Đổi quyền riêng tư hành trình' })
  async visibility(
    @Param('id') id: string,
    @Body() dto: UpdateTripVisibilityDto,
  ) {
    return Response.OK(await this.tripService.setVisibility(id, dto));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xoá hành trình' })
  async remove(@Param('id') id: string, @Query('userId') userId: string) {
    return Response.OK(await this.tripService.deleteTrip(id, userId));
  }
}
