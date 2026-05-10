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
});
