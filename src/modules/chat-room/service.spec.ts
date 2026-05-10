import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ChatRoomService } from './service';
import {
  ChatRoomRepository,
  ChatRoomParticipantRepository,
  MessageRepository,
} from './repository';
import { ParticipantStatus } from './model';

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
  status: ParticipantStatus.ONLINE,
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

describe('ChatRoomService', () => {
  let service: ChatRoomService;
  let chatRoomRepo: ChatRoomRepository;
  let participantRepo: ChatRoomParticipantRepository;
  let messageRepo: MessageRepository;

  const mockChatRoomRepo = {
    findById: jest.fn(),
    create: jest.fn(),
    addParticipant: jest.fn(),
    updateLastMessage: jest.fn(),
  };

  const mockParticipantRepo = {
    findByRoomAndUser: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateStatusByUserAndRoom: jest.fn(),
    findOnlineByRoomId: jest.fn(),
  };

  const mockMessageRepo = {
    create: jest.fn(),
    findByChatRoomId: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatRoomService,
        { provide: ChatRoomRepository, useValue: mockChatRoomRepo },
        { provide: ChatRoomParticipantRepository, useValue: mockParticipantRepo },
        { provide: MessageRepository, useValue: mockMessageRepo },
      ],
    }).compile();

    service = module.get<ChatRoomService>(ChatRoomService);
    chatRoomRepo = module.get<ChatRoomRepository>(ChatRoomRepository);
    participantRepo = module.get<ChatRoomParticipantRepository>(
      ChatRoomParticipantRepository,
    );
    messageRepo = module.get<MessageRepository>(MessageRepository);
  });

  describe('getRoomById', () => {
    it('should return room when found', async () => {
      const room = mockRoom();
      mockChatRoomRepo.findById.mockResolvedValue(room);

      const result = await service.getRoomById('room-1');

      expect(chatRoomRepo.findById).toHaveBeenCalledWith('room-1');
      expect(result).toEqual(room);
    });

    it('should throw NotFoundException when room not found', async () => {
      mockChatRoomRepo.findById.mockResolvedValue(null);

      await expect(service.getRoomById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createChatRoom', () => {
    it('should create a chat room with participants stringified', async () => {
      const dto = {
        name: 'New Room',
        heritageId: 'heritage-1',
        type: 'HERITAGE' as any,
        participants: ['user-1', 'user-2'],
      };
      const createdRoom = mockRoom({
        name: 'New Room',
        participants: JSON.stringify(['user-1', 'user-2']),
      });
      mockChatRoomRepo.create.mockResolvedValue(createdRoom);

      const result = await service.createChatRoom(dto);

      expect(chatRoomRepo.create).toHaveBeenCalledWith({
        name: 'New Room',
        heritageId: 'heritage-1',
        type: 'HERITAGE',
        participants: JSON.stringify(['user-1', 'user-2']),
      });
      expect(result).toEqual(createdRoom);
    });

    it('should default participants to "[]" when not provided', async () => {
      const dto = { name: 'Solo Room' };
      const createdRoom = mockRoom({ name: 'Solo Room', participants: '[]' });
      mockChatRoomRepo.create.mockResolvedValue(createdRoom);

      const result = await service.createChatRoom(dto);

      expect(chatRoomRepo.create).toHaveBeenCalledWith({
        name: 'Solo Room',
        heritageId: undefined,
        type: undefined,
        participants: '[]',
      });
      expect(result).toEqual(createdRoom);
    });

    it('should throw BadRequestException when name is empty', async () => {
      const dto = { name: '' };

      await expect(service.createChatRoom(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('joinRoom', () => {
    it('should create new participant and add to room', async () => {
      const room = mockRoom();
      const dto = { userId: 'user-2', username: 'New User' };
      const newParticipant = mockParticipant({
        id: 'participant-2',
        userId: 'user-2',
        username: 'New User',
      });

      mockChatRoomRepo.findById.mockResolvedValue(room);
      mockParticipantRepo.findByRoomAndUser.mockResolvedValue(null);
      mockParticipantRepo.create.mockResolvedValue(newParticipant);
      mockChatRoomRepo.addParticipant.mockResolvedValue(undefined);

      const result = await service.joinRoom('room-1', dto);

      expect(participantRepo.create).toHaveBeenCalledWith({
        chatRoomId: 'room-1',
        userId: 'user-2',
        username: 'New User',
        status: ParticipantStatus.ONLINE,
      });
      expect(chatRoomRepo.addParticipant).toHaveBeenCalledWith('room-1', 'user-2');
      expect(result).toEqual(newParticipant);
    });

    it('should update existing participant status to ONLINE', async () => {
      const room = mockRoom();
      const dto = { userId: 'user-1', username: 'Existing User' };
      const existingParticipant = mockParticipant({
        userId: 'user-1',
        status: ParticipantStatus.OFFLINE,
      });

      mockChatRoomRepo.findById.mockResolvedValue(room);
      mockParticipantRepo.findByRoomAndUser.mockResolvedValue(existingParticipant);
      mockParticipantRepo.updateStatusByUserAndRoom.mockResolvedValue(undefined);
      mockParticipantRepo.findById.mockResolvedValue(existingParticipant);

      const result = await service.joinRoom('room-1', dto);

      expect(
        participantRepo.updateStatusByUserAndRoom,
      ).toHaveBeenCalledWith('user-1', 'room-1', ParticipantStatus.ONLINE);
      expect(participantRepo.findById).toHaveBeenCalledWith('participant-1');
      expect(result).toEqual(existingParticipant);
    });

    it('should throw BadRequestException when userId is missing', async () => {
      const dto = { userId: '', username: 'Test' };

      await expect(service.joinRoom('room-1', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when room not found', async () => {
      const dto = { userId: 'user-1', username: 'Test' };
      mockChatRoomRepo.findById.mockResolvedValue(null);

      await expect(service.joinRoom('non-existent', dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('leaveRoom', () => {
    it('should update participant status to OFFLINE', async () => {
      const room = mockRoom();
      const participant = mockParticipant();

      mockChatRoomRepo.findById.mockResolvedValue(room);
      mockParticipantRepo.findByRoomAndUser.mockResolvedValue(participant);
      mockParticipantRepo.updateStatusByUserAndRoom.mockResolvedValue(undefined);

      const result = await service.leaveRoom('room-1', 'user-1');

      expect(
        participantRepo.updateStatusByUserAndRoom,
      ).toHaveBeenCalledWith('user-1', 'room-1', ParticipantStatus.OFFLINE);
      expect(result).toEqual({ success: true, message: 'Đã rời phòng chat' });
    });

    it('should throw BadRequestException when userId is missing', async () => {
      await expect(service.leaveRoom('room-1', '')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when room not found', async () => {
      mockChatRoomRepo.findById.mockResolvedValue(null);

      await expect(service.leaveRoom('non-existent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when participant not in room', async () => {
      const room = mockRoom();
      mockChatRoomRepo.findById.mockResolvedValue(room);
      mockParticipantRepo.findByRoomAndUser.mockResolvedValue(null);

      await expect(service.leaveRoom('room-1', 'user-99')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('saveMessage', () => {
    it('should save message and update lastMessage on room', async () => {
      const room = mockRoom();
      const sender = mockParticipant({ userId: 'user-1', username: 'Test User' });
      const dto = {
        roomId: 'room-1',
        userId: 'user-1',
        content: 'Hello everyone!',
        type: 'TEXT' as any,
      };
      const savedMessage = mockMessage({
        content: 'Hello everyone!',
        chatRoomId: 'room-1',
        userId: 'user-1',
      });

      mockChatRoomRepo.findById.mockResolvedValue(room);
      mockParticipantRepo.findByRoomAndUser.mockResolvedValue(sender);
      mockMessageRepo.create.mockResolvedValue(savedMessage);
      mockChatRoomRepo.updateLastMessage.mockResolvedValue(undefined);

      const result = await service.saveMessage(dto);

      expect(messageRepo.create).toHaveBeenCalledWith({
        chatRoomId: 'room-1',
        userId: 'user-1',
        content: 'Hello everyone!',
        type: 'TEXT',
      });
      expect(chatRoomRepo.updateLastMessage).toHaveBeenCalledWith('room-1', {
        content: 'Hello everyone!',
        userId: 'user-1',
        username: 'Test User',
      });
      expect(result).toEqual(savedMessage);
    });

    it('should throw BadRequestException when roomId is missing', async () => {
      const dto = { roomId: '', userId: 'user-1', content: 'Hi' };

      await expect(service.saveMessage(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when userId is missing', async () => {
      const dto = { roomId: 'room-1', userId: '', content: 'Hi' };

      await expect(service.saveMessage(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when content is empty', async () => {
      const dto = { roomId: 'room-1', userId: 'user-1', content: '' };

      await expect(service.saveMessage(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when content is whitespace only', async () => {
      const dto = { roomId: 'room-1', userId: 'user-1', content: '   ' };

      await expect(service.saveMessage(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when room not found', async () => {
      const dto = { roomId: 'non-existent', userId: 'user-1', content: 'Hi' };
      mockChatRoomRepo.findById.mockResolvedValue(null);

      await expect(service.saveMessage(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when sender is not a participant', async () => {
      const room = mockRoom();
      const dto = { roomId: 'room-1', userId: 'user-99', content: 'Hi' };

      mockChatRoomRepo.findById.mockResolvedValue(room);
      mockParticipantRepo.findByRoomAndUser.mockResolvedValue(null);

      await expect(service.saveMessage(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getRoomMessages', () => {
    it('should return messages with default limit 50', async () => {
      const room = mockRoom();
      const messages = [mockMessage(), mockMessage({ id: 'msg-2' })];

      mockChatRoomRepo.findById.mockResolvedValue(room);
      mockMessageRepo.findByChatRoomId.mockResolvedValue(messages);

      const result = await service.getRoomMessages('room-1', 50);

      expect(messageRepo.findByChatRoomId).toHaveBeenCalledWith('room-1', 50);
      expect(result).toEqual(messages);
    });

    it('should pass custom limit', async () => {
      const room = mockRoom();
      const messages = [mockMessage()];

      mockChatRoomRepo.findById.mockResolvedValue(room);
      mockMessageRepo.findByChatRoomId.mockResolvedValue(messages);

      const result = await service.getRoomMessages('room-1', 10);

      expect(messageRepo.findByChatRoomId).toHaveBeenCalledWith('room-1', 10);
      expect(result).toEqual(messages);
    });

    it('should throw NotFoundException when room not found', async () => {
      mockChatRoomRepo.findById.mockResolvedValue(null);

      await expect(service.getRoomMessages('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getRoomUsers', () => {
    it('should return online users', async () => {
      const room = mockRoom();
      const participants = [
        mockParticipant({ userId: 'user-1', status: ParticipantStatus.ONLINE }),
        mockParticipant({ userId: 'user-2', status: ParticipantStatus.ONLINE }),
      ];

      mockChatRoomRepo.findById.mockResolvedValue(room);
      mockParticipantRepo.findOnlineByRoomId.mockResolvedValue(participants);

      const result = await service.getRoomUsers('room-1');

      expect(participantRepo.findOnlineByRoomId).toHaveBeenCalledWith('room-1');
      expect(result).toEqual(participants);
    });

    it('should throw NotFoundException when room not found', async () => {
      mockChatRoomRepo.findById.mockResolvedValue(null);

      await expect(service.getRoomUsers('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
