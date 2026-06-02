import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ChatRoomModel,
  ChatRoomParticipantModel,
  ChatRoomStatus,
  ChatRoomType,
  MessageModel,
  MessageStatus,
  ParticipantStatus,
} from './model';

// =================== ChatRoomRepository ===================

@Injectable()
export class ChatRoomRepository {
  constructor(
    @InjectRepository(ChatRoomModel)
    private readonly repo: Repository<ChatRoomModel>,
  ) {}

  async findById(id: string): Promise<ChatRoomModel | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByHeritageId(heritageId: string): Promise<ChatRoomModel | null> {
    return this.repo.findOne({
      where: { heritageId, type: ChatRoomType.HERITAGE },
    });
  }

  async findDirectRoom(userIds: [string, string]): Promise<ChatRoomModel | null> {
    // Direct room chứa cả 2 userId trong participants JSON
    const rooms = await this.repo.find({ where: { type: ChatRoomType.DIRECT } });
    return (
      rooms.find((room) => {
        const participants: string[] = this.parseParticipants(room.participants);
        return (
          participants.includes(userIds[0]) && participants.includes(userIds[1])
        );
      }) ?? null
    );
  }

  async findAll(opts: {
    page: number;
    limit: number;
    sort: string;
    order: 'ASC' | 'DESC';
  }): Promise<{ results: ChatRoomModel[]; total: number }> {
    const { page, limit, sort, order } = opts;
    const skip = (page - 1) * limit;
    const [results, total] = await this.repo.findAndCount({
      order: { [sort]: order } as Record<string, 'ASC' | 'DESC'>,
      skip,
      take: limit,
    });
    return { results, total };
  }

  async create(data: Partial<ChatRoomModel>): Promise<ChatRoomModel> {
    // Giới hạn 2 participants cho phòng DIRECT
    if (data.type === ChatRoomType.DIRECT && data.participants) {
      const parts = this.parseParticipants(data.participants);
      if (parts.length > 2) data.participants = JSON.stringify(parts.slice(0, 2));
    }
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async update(id: string, data: Partial<ChatRoomModel>): Promise<ChatRoomModel | null> {
    await this.repo.update(id, data);
    return this.findById(id);
  }

  async addParticipant(roomId: string, userId: string): Promise<void> {
    const room = await this.findById(roomId);
    if (!room) return;
    const participants = this.parseParticipants(room.participants);
    if (!participants.includes(userId)) {
      participants.push(userId);
      await this.repo.update(roomId, { participants: JSON.stringify(participants) });
    }
  }

  async removeParticipant(roomId: string, userId: string): Promise<void> {
    const room = await this.findById(roomId);
    if (!room) return;
    const participants = this.parseParticipants(room.participants).filter(
      (id) => id !== userId,
    );
    await this.repo.update(roomId, { participants: JSON.stringify(participants) });
  }

  async updateLastMessage(
    roomId: string,
    msg: { content: string; userId: string; username: string },
  ): Promise<void> {
    await this.repo.update(roomId, {
      lastMessage: JSON.stringify({ ...msg, sentAt: new Date() }),
    });
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  parseParticipants(raw: string): string[] {
    try {
      return JSON.parse(raw ?? '[]') as string[];
    } catch {
      return [];
    }
  }
}

// =================== ChatRoomParticipantRepository ===================

@Injectable()
export class ChatRoomParticipantRepository {
  constructor(
    @InjectRepository(ChatRoomParticipantModel)
    private readonly repo: Repository<ChatRoomParticipantModel>,
  ) {}

  async findById(id: string): Promise<ChatRoomParticipantModel | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByRoomAndUser(
    chatRoomId: string,
    userId: string,
  ): Promise<ChatRoomParticipantModel | null> {
    return this.repo.findOne({ where: { chatRoomId, userId } });
  }

  async findByUserId(userId: string): Promise<ChatRoomParticipantModel | null> {
    return this.repo.findOne({ where: { userId } });
  }

  async findByRoomId(chatRoomId: string): Promise<ChatRoomParticipantModel[]> {
    return this.repo.find({ where: { chatRoomId } });
  }

  async findOnlineByRoomId(chatRoomId: string): Promise<ChatRoomParticipantModel[]> {
    return this.repo.find({
      where: { chatRoomId, status: ParticipantStatus.ONLINE },
    });
  }

  async create(data: Partial<ChatRoomParticipantModel>): Promise<ChatRoomParticipantModel> {
    const entity = this.repo.create({
      ...data,
      joinedAt: new Date(),
      lastActive: new Date(),
    });
    return this.repo.save(entity);
  }

  async update(
    id: string,
    data: Partial<ChatRoomParticipantModel>,
  ): Promise<ChatRoomParticipantModel | null> {
    await this.repo.update(id, data);
    return this.findById(id);
  }

  async updateStatusByUserAndRoom(
    userId: string,
    chatRoomId: string,
    status: ParticipantStatus,
  ): Promise<void> {
    await this.repo.update({ userId, chatRoomId }, { status, lastActive: new Date() });
  }

  async removeFromRoom(chatRoomId: string, userId: string): Promise<void> {
    await this.repo.delete({ chatRoomId, userId });
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}

// =================== MessageRepository ===================

@Injectable()
export class MessageRepository {
  constructor(
    @InjectRepository(MessageModel)
    private readonly repo: Repository<MessageModel>,
  ) {}

  async findById(id: string): Promise<MessageModel | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByChatRoomId(chatRoomId: string, limit = 50): Promise<MessageModel[]> {
    return this.repo.find({
      where: { chatRoomId },
      order: { createdAt: 'ASC' },
      take: limit,
    });
  }

  async findByChatRoomIdPaginated(
    chatRoomId: string,
    page = 1,
    limit = 20,
  ): Promise<{ results: MessageModel[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    const [results, total] = await this.repo.findAndCount({
      where: { chatRoomId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });
    return { results, total, page, limit };
  }

  async create(data: Partial<MessageModel>): Promise<MessageModel> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async updateStatus(id: string, status: MessageStatus): Promise<MessageModel | null> {
    await this.repo.update(id, { status });
    return this.findById(id);
  }

  /** Soft delete: đặt status = DELETED, content = 'Tin nhắn đã bị xóa' */
  async softDelete(id: string): Promise<MessageModel | null> {
    await this.repo.update(id, {
      status: MessageStatus.DELETED,
      content: 'Tin nhắn đã bị xóa',
    });
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
