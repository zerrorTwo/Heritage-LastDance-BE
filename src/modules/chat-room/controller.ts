import {
  Body,
  Controller,
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
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ChatRoomService } from './service';
import {
  CreateChatRoomDto,
  JoinRoomDto,
  SaveMessageDto,
} from './dto/chat-room.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
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
}
