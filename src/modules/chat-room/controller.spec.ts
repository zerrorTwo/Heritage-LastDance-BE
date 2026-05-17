import { Test, TestingModule } from '@nestjs/testing';
import { ChatRoomController } from './controller';
import { ChatRoomService } from './service';

const mockRoom = (overrides: Record<string, unknown> = {}) => ({
  id: 'room-1',
  name: 'Test Room',
  heritageId: 'heritage-1',
  type: 'HERITAGE',
  participants: JSON.stringify(['user-1']),
  status: 'ACTIVE',
  lastMessage: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  ...overrides,
});

const mockParticipant = (overrides: Record<string, unknown> = {}) => ({
  id: 'participant-1',
  chatRoomId: 'room-1',
  userId: 'user-1',
  username: 'Test User',
  status: 'ONLINE',
  lastActive: new Date(),
  joinedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const mockMessage = (overrides: Record<string, unknown> = {}) => ({
  id: 'msg-1',
  chatRoomId: 'room-1',
  userId: 'user-1',
  content: 'Hello!',
  type: 'TEXT',
  status: 'SENT',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const mockRequest = {
  user: {
    userId: 'user-1',
    sessionId: 'session-1',
  },
};

describe('ChatRoomController', () => {
  let controller: ChatRoomController;
  let chatRoomService: ChatRoomService;

  const mockChatRoomService = {
    createChatRoom: jest.fn(),
    joinRoom: jest.fn(),
    leaveRoom: jest.fn(),
    saveMessage: jest.fn(),
    getRoomMessages: jest.fn(),
    getRoomUsers: jest.fn(),
    findOrCreateDirectRoom: jest.fn(),
    saveDirectMessage: jest.fn(),
    getDirectMessages: jest.fn(),
    markMessageAsRead: jest.fn(),
    softDeleteMessage: jest.fn(),
  };

  const mockJwtUser = {
    sub: 'user-1',
    email: 'user1@test.com',
    sessionId: 'session-1',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatRoomController],
      providers: [{ provide: ChatRoomService, useValue: mockChatRoomService }],
    }).compile();

    controller = module.get<ChatRoomController>(ChatRoomController);
    chatRoomService = module.get<ChatRoomService>(ChatRoomService);
  });

  describe('createChatRoom', () => {
    it('should create chat room and return Created response', async () => {
      const dto = {
        name: 'New Room',
        heritageId: 'heritage-1',
        type: 'HERITAGE' as any,
      };
      const createdRoom = mockRoom(dto);
      mockChatRoomService.createChatRoom.mockResolvedValue(createdRoom);

      const result = await controller.createChatRoom(dto);

      expect(chatRoomService.createChatRoom).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ data: createdRoom });
    });
  });

  describe('joinRoom', () => {
    it('should set userId from request and join room', async () => {
      const dto = { userId: '', username: 'Test User', socketId: 'socket-1' };
      const participant = mockParticipant({ userId: 'user-1' });
      mockChatRoomService.joinRoom.mockResolvedValue(participant);

      const result = await controller.joinRoom('room-1', dto, mockRequest);

      expect(dto.userId).toBe('user-1');
      expect(chatRoomService.joinRoom).toHaveBeenCalledWith('room-1', dto);
      expect(result).toEqual({ data: participant });
    });
  });

  describe('leaveRoom', () => {
    it('should leave room with userId from request', async () => {
      const leaveResult = { success: true, message: 'Đã rời phòng chat' };
      mockChatRoomService.leaveRoom.mockResolvedValue(leaveResult);

      const result = await controller.leaveRoom('room-1', mockRequest);

      expect(chatRoomService.leaveRoom).toHaveBeenCalledWith('room-1', 'user-1');
      expect(result).toEqual({ data: leaveResult });
    });
  });

  describe('saveMessage', () => {
    it('should set userId from request and save message', async () => {
      const dto = { roomId: 'room-1', userId: '', content: 'Hi', type: 'TEXT' as any };
      const savedMsg = mockMessage({ content: 'Hi' });
      mockChatRoomService.saveMessage.mockResolvedValue(savedMsg);

      const result = await controller.saveMessage(dto, mockRequest);

      expect(dto.userId).toBe('user-1');
      expect(chatRoomService.saveMessage).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ data: savedMsg });
    });
  });

  describe('getRoomMessages', () => {
    it('should return messages with default limit 50', async () => {
      const messages = [mockMessage()];
      mockChatRoomService.getRoomMessages.mockResolvedValue(messages);

      const result = await controller.getRoomMessages('room-1', undefined);

      expect(chatRoomService.getRoomMessages).toHaveBeenCalledWith('room-1', 50);
      expect(result).toEqual({ data: messages });
    });

    it('should parse and pass custom limit', async () => {
      const messages = [mockMessage()];
      mockChatRoomService.getRoomMessages.mockResolvedValue(messages);

      const result = await controller.getRoomMessages('room-1', 10);

      expect(chatRoomService.getRoomMessages).toHaveBeenCalledWith('room-1', 10);
      expect(result).toEqual({ data: messages });
    });
  });

  describe('getRoomUsers', () => {
    it('should return online users', async () => {
      const participants = [mockParticipant()];
      mockChatRoomService.getRoomUsers.mockResolvedValue(participants);

      const result = await controller.getRoomUsers('room-1');

      expect(chatRoomService.getRoomUsers).toHaveBeenCalledWith('room-1');
      expect(result).toEqual({ data: participants });
    });
  });

  // =================== Direct Message (AAA pattern) ===================

  describe('POST /direct (findOrCreateDirectRoom)', () => {
    it('should call service.findOrCreateDirectRoom with current user sub and dto', async () => {
      // Arrange
      const dto: any = { otherUserId: 'user-2', username: 'Alice' };
      const directRoom = mockRoom({ id: 'dm-1', type: 'DIRECT', heritageId: null });
      mockChatRoomService.findOrCreateDirectRoom.mockResolvedValue(directRoom);

      // Act
      const result = await controller.findOrCreateDirectRoom(dto, mockJwtUser);

      // Assert
      expect(chatRoomService.findOrCreateDirectRoom).toHaveBeenCalledWith(
        'user-1',
        'user-2',
        'Alice',
      );
      expect(result).toEqual({ data: directRoom });
    });

    it('should propagate BadRequestException when DM to self', async () => {
      // Arrange
      mockChatRoomService.findOrCreateDirectRoom.mockRejectedValue(
        new Error('Không thể tạo DM với chính mình'),
      );

      // Act & Assert
      await expect(
        controller.findOrCreateDirectRoom(
          { otherUserId: 'user-1' } as any,
          mockJwtUser,
        ),
      ).rejects.toThrow('Không thể tạo DM với chính mình');
    });
  });

  describe('POST /direct/messages (sendDirectMessage)', () => {
    it('should call service.saveDirectMessage with all params', async () => {
      // Arrange
      const dto: any = {
        otherUserId: 'user-2',
        content: 'Hello',
        type: 'TEXT',
        username: 'Alice',
      };
      const saved = {
        room: mockRoom({ id: 'dm-1', type: 'DIRECT' }),
        message: mockMessage({ content: 'Hello' }),
      };
      mockChatRoomService.saveDirectMessage.mockResolvedValue(saved);

      // Act
      const result = await controller.sendDirectMessage(dto, mockJwtUser);

      // Assert
      expect(chatRoomService.saveDirectMessage).toHaveBeenCalledWith(
        'user-1',
        'user-2',
        'Hello',
        'TEXT',
        'Alice',
      );
      expect(result).toEqual({ data: saved });
    });

    it('should propagate BadRequestException when content empty', async () => {
      // Arrange
      mockChatRoomService.saveDirectMessage.mockRejectedValue(
        new Error('Nội dung tin nhắn không được để trống'),
      );

      // Act & Assert
      await expect(
        controller.sendDirectMessage(
          { otherUserId: 'user-2', content: '' } as any,
          mockJwtUser,
        ),
      ).rejects.toThrow('Nội dung tin nhắn không được để trống');
    });
  });

  describe('GET /direct/:otherUserId/messages (getDirectMessages)', () => {
    it('should call service.getDirectMessages with pagination defaults', async () => {
      // Arrange
      const serviceResult = { results: [mockMessage()], total: 1, page: 1, limit: 20 };
      mockChatRoomService.getDirectMessages.mockResolvedValue(serviceResult);

      // Act
      const result = await controller.getDirectMessages('user-2', mockJwtUser);

      // Assert
      expect(chatRoomService.getDirectMessages).toHaveBeenCalledWith(
        'user-1',
        'user-2',
        1,
        20,
      );
      expect(result).toEqual({ data: serviceResult });
    });

    it('should parse and pass custom page + limit', async () => {
      // Arrange
      const serviceResult = { results: [], total: 0, page: 2, limit: 10 };
      mockChatRoomService.getDirectMessages.mockResolvedValue(serviceResult);

      // Act
      await controller.getDirectMessages('user-2', mockJwtUser, 2, 10);

      // Assert
      expect(chatRoomService.getDirectMessages).toHaveBeenCalledWith(
        'user-1',
        'user-2',
        2,
        10,
      );
    });

    it('should return empty result when no DM history', async () => {
      // Arrange
      const emptyResult = { results: [], total: 0, page: 1, limit: 20 };
      mockChatRoomService.getDirectMessages.mockResolvedValue(emptyResult);

      // Act
      const result = await controller.getDirectMessages('user-nobody', mockJwtUser);

      // Assert
      expect(result).toEqual({ data: emptyResult });
    });
  });

  describe('PATCH /messages/:msgId/read (markRead)', () => {
    it('should call service.markMessageAsRead with msgId and user sub', async () => {
      // Arrange
      const updated = mockMessage({ status: 'READ' });
      mockChatRoomService.markMessageAsRead.mockResolvedValue(updated);

      // Act
      const result = await controller.markRead('msg-1', mockJwtUser);

      // Assert
      expect(chatRoomService.markMessageAsRead).toHaveBeenCalledWith(
        'msg-1',
        'user-1',
      );
      expect(result).toEqual({ data: updated });
    });

    it('should propagate NotFoundException when message not found', async () => {
      // Arrange
      const { NotFoundException } = await import('@nestjs/common');
      mockChatRoomService.markMessageAsRead.mockRejectedValue(
        new NotFoundException('Tin nhắn không tồn tại'),
      );

      // Act & Assert
      await expect(
        controller.markRead('nonexistent', mockJwtUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate ForbiddenException when user not in room', async () => {
      // Arrange
      const { ForbiddenException } = await import('@nestjs/common');
      mockChatRoomService.markMessageAsRead.mockRejectedValue(
        new ForbiddenException('Bạn không có trong phòng này'),
      );

      // Act & Assert
      await expect(
        controller.markRead('msg-1', mockJwtUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('DELETE /messages/:msgId (deleteMessage)', () => {
    it('should call service.softDeleteMessage with msgId and user sub', async () => {
      // Arrange
      const deleted = mockMessage({ status: 'DELETED', content: 'Tin nhắn đã bị xóa' });
      mockChatRoomService.softDeleteMessage.mockResolvedValue(deleted);

      // Act
      const result = await controller.deleteMessage('msg-1', mockJwtUser);

      // Assert
      expect(chatRoomService.softDeleteMessage).toHaveBeenCalledWith(
        'msg-1',
        'user-1',
      );
      expect(result).toEqual({ data: deleted });
    });

    it('should propagate ForbiddenException when not owner', async () => {
      // Arrange
      const { ForbiddenException } = await import('@nestjs/common');
      mockChatRoomService.softDeleteMessage.mockRejectedValue(
        new ForbiddenException('Chỉ người gửi mới được xóa tin nhắn'),
      );

      // Act & Assert
      await expect(
        controller.deleteMessage('msg-1', mockJwtUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should propagate NotFoundException', async () => {
      // Arrange
      const { NotFoundException } = await import('@nestjs/common');
      mockChatRoomService.softDeleteMessage.mockRejectedValue(
        new NotFoundException('Tin nhắn không tồn tại'),
      );

      // Act & Assert
      await expect(
        controller.deleteMessage('nonexistent', mockJwtUser),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
