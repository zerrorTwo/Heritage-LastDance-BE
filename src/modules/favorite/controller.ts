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
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FavoriteService } from './service';
import { AddFavoriteDto, FavoriteQueryDto } from './dto/favorite.dto';
import { Response } from '../../common/response';

@ApiTags('Favorites')
@Controller('favorites')
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy tất cả favorite với phân trang (admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sort', required: false, type: String })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: 200, description: 'Danh sách tất cả favorites' })
  async getAll(@Query() query: Record<string, any>) {
    const result = await this.favoriteService.getAll(query);
    return Response.OK(result);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy favorite theo ID' })
  @ApiParam({ name: 'id', description: 'Favorite ID' })
  @ApiResponse({ status: 200, description: 'Thông tin favorite' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy' })
  async getFavoriteById(@Param('id') id: string) {
    const result = await this.favoriteService.getFavoriteById(id);
    return Response.OK(result);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Lấy danh sách di tích yêu thích của user với phân trang' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'language', required: false, enum: ['vi', 'en'] })
  @ApiResponse({ status: 200, description: 'Danh sách di tích yêu thích' })
  async getByUserId(
    @Param('userId') userId: string,
    @Query() query: FavoriteQueryDto,
  ) {
    const result = await this.favoriteService.getByUserId(userId, query);
    return Response.OK(result);
  }

  @Post()
  @ApiOperation({ summary: 'Thêm di tích vào danh sách yêu thích' })
  @ApiResponse({ status: 200, description: 'Thêm thành công' })
  @ApiResponse({ status: 400, description: 'Di tích đã có trong danh sách' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy di tích' })
  async addToFavorites(@Body() dto: AddFavoriteDto) {
    const result = await this.favoriteService.addToFavorites(dto.userId, dto.heritageId);
    return Response.OK(result);
  }

  @Delete(':userId/:heritageId')
  @ApiOperation({ summary: 'Xóa di tích khỏi danh sách yêu thích' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'heritageId', description: 'Heritage ID cần xóa' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy' })
  async deleteByHeritageId(
    @Param('userId') userId: string,
    @Param('heritageId') heritageId: string,
  ) {
    const result = await this.favoriteService.deleteByHeritageId(userId, heritageId);
    return Response.OK(result);
  }
}
