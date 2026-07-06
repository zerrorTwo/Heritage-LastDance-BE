import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DiscussService } from './service';
import { CreateDiscussDto } from './dto/discuss.dto';
import { Response } from '../../common/response';

@ApiTags('Discusses')
@Controller('discusses')
export class DiscussController {
  constructor(private readonly discussService: DiscussService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo thảo luận mới' })
  @ApiResponse({ status: 201, description: 'Thảo luận được tạo thành công' })
  async createNew(@Body() dto: CreateDiscussDto) {
    const result = await this.discussService.createNew(dto);
    return Response.Created(result);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách thảo luận theo parentId + heritageId' })
  @ApiQuery({ name: 'parentId', required: false, type: String })
  @ApiQuery({ name: 'heritageId', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Danh sách thảo luận' })
  async getByParentId(
    @Query('parentId') parentId: string,
    @Query('heritageId') heritageId: string,
  ) {
    const result = await this.discussService.getByParentId(parentId, heritageId);
    return Response.OK(result);
  }

  @Delete()
  @ApiOperation({ summary: 'Xóa thảo luận và tất cả con (nested delete)' })
  @ApiQuery({ name: 'heritageId', required: true, type: String })
  @ApiQuery({ name: 'discussId', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  async deleteNested(
    @Query('heritageId') heritageId: string,
    @Query('discussId') discussId: string,
  ) {
    const result = await this.discussService.deleteNestedById(heritageId, discussId);
    return Response.OK(result);
  }
}
