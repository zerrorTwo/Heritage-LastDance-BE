import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FriendService } from './service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Response } from '../../common/response';
import {
  RespondFriendRequestDto,
  SearchFriendQueryDto,
  SendFriendRequestDto,
} from './dto/friend.dto';

@Controller('friends')
@UseGuards(JwtAuthGuard)
@ApiTags('Friends')
@ApiBearerAuth('access-token')
export class FriendController {
  constructor(private readonly friendService: FriendService) {}

  @Get('search')
  @ApiOperation({ summary: 'Tìm user để kết bạn (theo tên/email)' })
  async search(@Query() query: SearchFriendQueryDto, @Req() req: any) {
    const data = await this.friendService.searchUsers(req.user.userId, query.q);
    return Response.OK(data);
  }

  @Get()
  @ApiOperation({ summary: 'Tổng quan: bạn bè + lời mời đến/đi' })
  async overview(@Req() req: any) {
    const data = await this.friendService.getOverview(req.user.userId);
    return Response.OK(data);
  }

  @Get('list')
  @ApiOperation({ summary: 'Danh sách bạn bè (đã chấp nhận)' })
  async friends(@Req() req: any) {
    return Response.OK(await this.friendService.listFriends(req.user.userId));
  }

  @Get('requests')
  @ApiOperation({ summary: 'Lời mời đến (chờ mình xử lý)' })
  async requests(@Req() req: any) {
    return Response.OK(
      await this.friendService.listIncomingRequests(req.user.userId),
    );
  }

  @Get('requests/sent')
  @ApiOperation({ summary: 'Lời mời đã gửi (chờ đối phương)' })
  async sentRequests(@Req() req: any) {
    return Response.OK(
      await this.friendService.listOutgoingRequests(req.user.userId),
    );
  }

  @Post('request')
  @ApiOperation({ summary: 'Gửi lời mời kết bạn' })
  async sendRequest(@Body() dto: SendFriendRequestDto, @Req() req: any) {
    const data = await this.friendService.sendRequest(
      req.user.userId,
      dto.addresseeId,
    );
    return Response.OK(data);
  }

  @Post(':friendshipId/respond')
  @ApiOperation({ summary: 'Chấp nhận / từ chối lời mời' })
  async respond(
    @Param('friendshipId') friendshipId: string,
    @Body() dto: RespondFriendRequestDto,
    @Req() req: any,
  ) {
    const data = await this.friendService.respondRequest(
      req.user.userId,
      friendshipId,
      dto.accept,
    );
    return Response.OK(data);
  }

  @Delete(':friendshipId')
  @ApiOperation({ summary: 'Huỷ kết bạn / thu hồi lời mời theo id quan hệ' })
  async remove(@Param('friendshipId') friendshipId: string, @Req() req: any) {
    return Response.OK(
      await this.friendService.removeFriendship(req.user.userId, friendshipId),
    );
  }

  @Delete('user/:userId')
  @ApiOperation({ summary: 'Huỷ kết bạn theo userId đối phương' })
  async removeByUser(@Param('userId') userId: string, @Req() req: any) {
    return Response.OK(
      await this.friendService.removeByUser(req.user.userId, userId),
    );
  }
}
