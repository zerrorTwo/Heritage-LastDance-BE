import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { CommentService } from './service';
import { CreateCommentDto, UpdateCommentDto } from './dto/comment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GeneralResponse, Response } from '../../common/response';

@ApiExtraModels(GeneralResponse)
@ApiTags('Comments')
@Controller('comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách bình luận với phân trang' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sort', required: false, type: String })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'heritageId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Danh sách bình luận' })
  async getAll(@Query() query: Record<string, any>) {
    const result = await this.commentService.getAll(query);
    return Response.OK(result);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy bình luận theo ID' })
  @ApiResponse({ status: 200, description: 'Thông tin bình luận' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bình luận' })
  async getCommentById(@Param('id') id: string) {
    const result = await this.commentService.getCommentById(id);
    return Response.OK(result);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Tạo bình luận mới' })
  @ApiResponse({ status: 201, description: 'Bình luận được tạo thành công' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createNew(@Body() dto: CreateCommentDto, @Req() req: any) {
    const result = await this.commentService.createNew(dto, req.user.userId);
    return Response.Created(result);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Cập nhật bình luận (chỉ người tạo)' })
  @ApiResponse({ status: 200, description: 'Bình luận đã được cập nhật' })
  @ApiResponse({ status: 403, description: 'Không có quyền chỉnh sửa' })
  async updateComment(
    @Param('id') id: string,
    @Body() dto: UpdateCommentDto,
    @Req() req: any,
  ) {
    const result = await this.commentService.updateComment(id, dto, req.user.userId);
    return Response.OK(result);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Xóa bình luận (chỉ người tạo)' })
  @ApiResponse({ status: 200, description: 'Bình luận đã được xóa' })
  @ApiResponse({ status: 403, description: 'Không có quyền xóa' })
  async deleteComment(@Param('id') id: string, @Req() req: any) {
    const result = await this.commentService.deleteComment(id, req.user.userId);
    return Response.OK(result);
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Toggle like bình luận' })
  @ApiResponse({ status: 200, description: 'Kết quả like/unlike' })
  async likeComment(@Param('id') id: string, @Req() req: any) {
    const result = await this.commentService.likeComment(id, req.user.userId);
    return Response.OK(result);
  }
}
