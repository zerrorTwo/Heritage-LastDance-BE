import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ChatRoomParticipantRepository,
  ChatRoomRepository,
  MessageRepository,
} from './repository';
import { CreateChatRoomDto, JoinRoomDto, SaveMessageDto } from './dto/chat-room.dto';
import { ParticipantStatus } from './model';

@Injectable()
export class ChatRoomService {
  constructor(
    private readonly chatRoomRepo: ChatRoomRepository,
    private readonly participantRepo: ChatRoomParticipantRepository,
    private readonly messageRepo: MessageRepository,
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

  async joinRoom(roomId: string, dto: JoinRoomDto) {
    if (!dto.userId) throw new BadRequestException('Thiếu thông tin người dùng');

    const room = await this.chatRoomRepo.findById(roomId);
    if (!room) throw new NotFoundException('Phòng chat không tồn tại');

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
    });

    await this.chatRoomRepo.updateLastMessage(dto.roomId, {
      content: dto.content,
      userId: dto.userId,
      username: sender.username,
    });

    return message;
  }

  async getRoomMessages(roomId: string, limit = 50) {
    const room = await this.chatRoomRepo.findById(roomId);
    if (!room) throw new NotFoundException('Phòng chat không tồn tại');

    return this.messageRepo.findByChatRoomId(roomId, limit);
  }

  async getRoomUsers(roomId: string) {
    const room = await this.chatRoomRepo.findById(roomId);
    if (!room) throw new NotFoundException('Phòng chat không tồn tại');

    return this.participantRepo.findOnlineByRoomId(roomId);
  }
}
