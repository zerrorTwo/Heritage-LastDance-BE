import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ChatRoomService } from './service';
import {
  CreateChatRoomDto,
  FindOrCreateDirectRoomDto,
  JoinRoomDto,
  SaveMessageDto,
  SendDirectMessageDto,
} from './dto/chat-room.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Response } from '../../common/response';

@ApiTags('Chat Rooms')
@Controller('chat-rooms')
export class ChatRoomController {
  constructor(private readonly chatRoomService: ChatRoomService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Tạo phòng chat mới' })
  @ApiResponse({ status: 201, description: 'Phòng chat được tạo thành công' })
  async createChatRoom(@Body() dto: CreateChatRoomDto) {
    const result = await this.chatRoomService.createChatRoom(dto);
    return Response.Created(result);
  }

  @Post(':roomId/join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Tham gia phòng chat (cho cả chatroom và DM)' })
  @ApiResponse({ status: 200, description: 'Tham gia thành công' })
  async joinRoom(
    @Param('roomId') roomId: string,
    @Body() dto: JoinRoomDto,
    @Req() req: any,
  ) {
    // Đảm bảo userId là của người đang request
    dto.userId = req.user.userId;
    const result = await this.chatRoomService.joinRoom(roomId, dto);
    return Response.OK(result);
  }

  @Post(':roomId/leave')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Rời phòng chat' })
  @ApiResponse({ status: 200, description: 'Rời phòng chat thành công' })
  async leaveRoom(@Param('roomId') roomId: string, @Req() req: any) {
    const result = await this.chatRoomService.leaveRoom(roomId, req.user.userId);
    return Response.OK(result);
  }

  @Post('messages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Gửi tin nhắn mới' })
  @ApiResponse({ status: 201, description: 'Gửi tin nhắn thành công' })
  async saveMessage(@Body() dto: SaveMessageDto, @Req() req: any) {
    dto.userId = req.user.userId;
    const result = await this.chatRoomService.saveMessage(dto);
    return Response.Created(result);
  }

  @Get(':roomId/messages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Lấy danh sách tin nhắn của phòng' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Danh sách tin nhắn' })
  async getRoomMessages(
    @Param('roomId') roomId: string,
    @Query('limit') limit?: number,
  ) {
    const parsedLimit = limit ? Number(limit) : 50;
    const result = await this.chatRoomService.getRoomMessages(roomId, parsedLimit);
    return Response.OK(result);
  }

  @Get(':roomId/users')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Lấy danh sách người dùng trong phòng' })
  @ApiResponse({ status: 200, description: 'Danh sách người dùng (online)' })
  async getRoomUsers(@Param('roomId') roomId: string) {
    const result = await this.chatRoomService.getRoomUsers(roomId);
    return Response.OK(result);
  }

  // =================== Direct Message ===================

  @Post('direct')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Tìm hoặc tạo phòng DM với 1 user khác' })
  async findOrCreateDirectRoom(
    @Body() dto: FindOrCreateDirectRoomDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const room = await this.chatRoomService.findOrCreateDirectRoom(
      user.sub,
      dto.otherUserId,
      dto.username,
    );
    return Response.OK(room);
  }

  @Post('direct/messages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Gửi tin nhắn DM (tự tạo room nếu chưa có)' })
  async sendDirectMessage(
    @Body() dto: SendDirectMessageDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.chatRoomService.saveDirectMessage(
      user.sub,
      dto.otherUserId,
      dto.content,
      dto.type,
      dto.username,
    );
    return Response.Created(result);
  }

  @Get('direct/:otherUserId/messages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Lấy history DM với 1 user (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getDirectMessages(
    @Param('otherUserId') otherUserId: string,
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.chatRoomService.getDirectMessages(
      user.sub,
      otherUserId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
    return Response.OK(result);
  }

  @Patch('messages/:msgId/read')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Đánh dấu tin nhắn đã đọc' })
  async markRead(
    @Param('msgId') msgId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.chatRoomService.markMessageAsRead(msgId, user.sub);
    return Response.OK(result);
  }

  @Delete('messages/:msgId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Xóa mềm tin nhắn (chỉ owner)' })
  async deleteMessage(
    @Param('msgId') msgId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.chatRoomService.softDeleteMessage(msgId, user.sub);
    return Response.OK(result);
  }
}
