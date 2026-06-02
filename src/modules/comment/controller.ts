import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
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
import { AuthenticatedRequest } from '../../common/decorators/current-user.decorator';
import { GeneralResponse, Response } from '../../common/response';
import { CloudinaryProvider } from '../../providers/cloudinary.provider';

@ApiExtraModels(GeneralResponse)
@ApiTags('Comments')
@Controller('comments')
export class CommentController {
  constructor(
    private readonly commentService: CommentService,
    private readonly cloudinaryProvider: CloudinaryProvider,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách bình luận với phân trang' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sort', required: false, type: String })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'heritageId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Danh sách bình luận' })
  async getAll(@Query() query: Record<string, unknown>) {
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
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('images', 5, {
      limits: { fileSize: 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        const allowedMimeTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/bmp',
          'image/tiff',
        ];
        if (!allowedMimeTypes.includes(file.mimetype)) {
          return callback(new BadRequestException('Invalid image type'), false);
        }
        return callback(null, true);
      },
    }),
  )
  @ApiOperation({ summary: 'Tạo bình luận mới' })
  @ApiResponse({ status: 201, description: 'Bình luận được tạo thành công' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createNew(
    @Body() dto: CreateCommentDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: AuthenticatedRequest,
  ) {
    if (files?.length) {
      const uploaded = await Promise.all(
        files.map((file) =>
          this.cloudinaryProvider.uploadStream(file, 'commentHeritage'),
        ),
      );
      dto.images = uploaded.map((u) => u.secure_url);
    }
    const result = await this.commentService.createNew(dto, req.user.userId!);
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
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.commentService.updateComment(id, dto, req.user.userId!);
    return Response.OK(result);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Xóa bình luận (chỉ người tạo)' })
  @ApiResponse({ status: 200, description: 'Bình luận đã được xóa' })
  @ApiResponse({ status: 403, description: 'Không có quyền xóa' })
  async deleteComment(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const result = await this.commentService.deleteComment(id, req.user.userId!);
    return Response.OK(result);
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Toggle like bình luận' })
  @ApiResponse({ status: 200, description: 'Kết quả like/unlike' })
  async likeComment(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const result = await this.commentService.likeComment(id, req.user.userId!);
    return Response.OK(result);
  }
}
