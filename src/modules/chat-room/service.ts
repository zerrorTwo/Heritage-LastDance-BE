import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ChatRoomParticipantRepository,
  ChatRoomRepository,
  MessageRepository,
} from './repository';
import { CreateChatRoomDto, JoinRoomDto, SaveMessageDto } from './dto/chat-room.dto';
import { ChatRoomType, MessageStatus, MessageType, ParticipantStatus } from './model';
import { FriendService } from '../friend/service';

@Injectable()
export class ChatRoomService {
  constructor(
    private readonly chatRoomRepo: ChatRoomRepository,
    private readonly participantRepo: ChatRoomParticipantRepository,
    private readonly messageRepo: MessageRepository,
    private readonly friendService: FriendService,
  ) {}

  async getRoomById(roomId: string) {
    const room = await this.chatRoomRepo.findById(roomId);
    if (!room) throw new NotFoundException('Phòng chat không tồn tại');
    return room;
  }

  async createChatRoom(dto: CreateChatRoomDto) {
    if (!dto.name) throw new BadRequestException('Tên phòng chat không được để trống');
    
    return this.chatRoomRepo.create({
      name: dto.name,
      heritageId: dto.heritageId,
      type: dto.type,
      participants: dto.participants ? JSON.stringify(dto.participants) : '[]',
    });
  }

  /**
   * Tìm hoặc TẠO phòng cộng đồng cho một di tích.
   * Quy ước: id phòng cộng đồng === heritageId (gateway dùng heritageId làm room id).
   */
  async ensureHeritageRoom(heritageId: string, name?: string) {
    const room = await this.chatRoomRepo.findById(heritageId);
    if (room) return room;

    // Insert ON CONFLICT DO NOTHING: chống race khi 2 người cùng vào lần đầu,
    // không để DB ném lỗi duplicate key. Luôn trả về phòng (mới tạo hoặc đã có).
    const created = await this.chatRoomRepo.createIfNotExists({
      id: heritageId,
      name: name || 'Phòng cộng đồng di sản',
      heritageId,
      type: ChatRoomType.HERITAGE,
      participants: '[]',
    });
    if (!created) throw new NotFoundException('Không thể khởi tạo phòng chat');
    return created;
  }

  async joinRoom(roomId: string, dto: JoinRoomDto) {
    if (!dto.userId) throw new BadRequestException('Thiếu thông tin người dùng');

    // Tự tạo phòng nếu chưa có (lần đầu có người vào di tích này)
    await this.ensureHeritageRoom(roomId);

    const existingParticipant = await this.participantRepo.findByRoomAndUser(
      roomId,
      dto.userId,
    );

    if (existingParticipant) {
      await this.participantRepo.updateStatusByUserAndRoom(
        dto.userId,
        roomId,
        ParticipantStatus.ONLINE,
      );
      return this.participantRepo.findById(existingParticipant.id);
    } else {
      const participant = await this.participantRepo.create({
        chatRoomId: roomId,
        userId: dto.userId,
        username: dto.username,
        status: ParticipantStatus.ONLINE,
      });

      await this.chatRoomRepo.addParticipant(roomId, dto.userId);
      return participant;
    }
  }

  async leaveRoom(roomId: string, userId: string) {
    if (!userId) throw new BadRequestException('Thiếu thông tin kết nối');

    const room = await this.chatRoomRepo.findById(roomId);
    if (!room) throw new NotFoundException('Phòng chat không tồn tại');

    const participant = await this.participantRepo.findByRoomAndUser(roomId, userId);
    if (!participant) throw new BadRequestException('Người dùng không có trong phòng');

    await this.participantRepo.updateStatusByUserAndRoom(
      userId,
      roomId,
      ParticipantStatus.OFFLINE,
    );

    return { success: true, message: 'Đã rời phòng chat' };
  }

  async saveMessage(dto: SaveMessageDto) {
    if (!dto.roomId) throw new BadRequestException('Thiếu thông tin phòng chat');
    if (!dto.userId) throw new BadRequestException('Thiếu thông tin người gửi');
    if (!dto.content || dto.content.trim() === '')
      throw new BadRequestException('Nội dung tin nhắn không được để trống');

    const room = await this.chatRoomRepo.findById(dto.roomId);
    if (!room) throw new NotFoundException('Phòng chat không tồn tại');

    const sender = await this.participantRepo.findByRoomAndUser(dto.roomId, dto.userId);
    if (!sender) throw new BadRequestException('Bạn chưa tham gia phòng chat này');

    const message = await this.messageRepo.create({
      chatRoomId: dto.roomId,
      userId: dto.userId,
      content: dto.content,
      type: dto.type,
      username: dto.username ?? sender.username,
      avatarUrl: dto.avatarUrl ?? null,
      imageUrl: dto.imageUrl ?? null,
    });

    await this.chatRoomRepo.updateLastMessage(dto.roomId, {
      content: dto.content,
      userId: dto.userId,
      username: dto.username ?? sender.username,
    });

    return message;
  }

  async getRoomMessages(roomId: string, limit = 50) {
    const room = await this.chatRoomRepo.findById(roomId);
    if (!room) return []; // phòng chưa tạo -> chưa có tin nhắn

    return this.messageRepo.findByChatRoomId(roomId, limit);
  }

  async getRoomUsers(roomId: string) {
    const room = await this.chatRoomRepo.findById(roomId);
    if (!room) return []; // phòng chưa tạo -> chưa có ai

    return this.participantRepo.findOnlineByRoomId(roomId);
  }

  // =================== Direct Message ===================

  /** Tìm hoặc tạo DIRECT room cho 2 user; tự động thêm cả 2 vào participants */
  async findOrCreateDirectRoom(
    userId1: string,
    userId2: string,
    username1?: string,
    username2?: string,
  ) {
    if (!userId1 || !userId2) {
      throw new BadRequestException('Thiếu thông tin người dùng');
    }
    if (userId1 === userId2) {
      throw new BadRequestException('Không thể tạo DM với chính mình');
    }

    // Chỉ cho phép nhắn riêng giữa 2 người đã là bạn bè
    const friends = await this.friendService.areFriends(userId1, userId2);
    if (!friends) {
      throw new ForbiddenException('Hai bạn cần là bạn bè để nhắn tin riêng');
    }

    let room = await this.chatRoomRepo.findDirectRoom([userId1, userId2]);

    if (!room) {
      const sorted = [userId1, userId2].sort();
      room = await this.chatRoomRepo.create({
        name: `dm-${sorted[0]}-${sorted[1]}`,
        type: ChatRoomType.DIRECT,
        heritageId: null,
        participants: JSON.stringify(sorted),
      });
    }

    // Đảm bảo cả 2 user đều có participant record
    for (const [uid, uname] of [
      [userId1, username1],
      [userId2, username2],
    ] as const) {
      const existing = await this.participantRepo.findByRoomAndUser(room.id, uid);
      if (!existing) {
        await this.participantRepo.create({
          chatRoomId: room.id,
          userId: uid,
          username: uname ?? 'Khách',
          status: ParticipantStatus.OFFLINE,
        });
      }
    }

    return room;
  }

  /**
   * Gửi DM: nếu room chưa có thì tự tạo. Khác saveMessage thường là không
   * yêu cầu user đã join trước qua API riêng.
   */
  async saveDirectMessage(
    fromUserId: string,
    otherUserId: string,
    content: string,
    type: MessageType = MessageType.TEXT,
    username?: string,
    avatarUrl?: string,
    imageUrl?: string,
  ) {
    if (!content || content.trim() === '') {
      throw new BadRequestException('Nội dung tin nhắn không được để trống');
    }

    const room = await this.findOrCreateDirectRoom(
      fromUserId,
      otherUserId,
      username,
    );

    const message = await this.messageRepo.create({
      chatRoomId: room.id,
      userId: fromUserId,
      content,
      type,
      status: MessageStatus.SENT,
      username: username ?? null,
      avatarUrl: avatarUrl ?? null,
      imageUrl: imageUrl ?? null,
    });

    await this.chatRoomRepo.updateLastMessage(room.id, {
      content,
      userId: fromUserId,
      username: username ?? 'Khách',
    });

    return { room, message };
  }

  /** Lấy history DM giữa 2 user (paginated) */
  async getDirectMessages(
    userId1: string,
    userId2: string,
    page = 1,
    limit = 20,
  ) {
    const room = await this.chatRoomRepo.findDirectRoom([userId1, userId2]);
    if (!room) {
      return { results: [], total: 0, page, limit };
    }
    return this.messageRepo.findByChatRoomIdPaginated(room.id, page, limit);
  }

  async markMessageAsRead(messageId: string, userId: string) {
    const msg = await this.messageRepo.findById(messageId);
    if (!msg) throw new NotFoundException('Tin nhắn không tồn tại');

    const participant = await this.participantRepo.findByRoomAndUser(
      msg.chatRoomId,
      userId,
    );
    if (!participant) {
      throw new ForbiddenException('Bạn không có trong phòng này');
    }

    return this.messageRepo.updateStatus(messageId, MessageStatus.READ);
  }

  async softDeleteMessage(messageId: string, userId: string) {
    const msg = await this.messageRepo.findById(messageId);
    if (!msg) throw new NotFoundException('Tin nhắn không tồn tại');
    if (msg.userId !== userId) {
      throw new ForbiddenException('Chỉ người gửi mới được xóa tin nhắn');
    }
    return this.messageRepo.softDelete(messageId);
  }
}
