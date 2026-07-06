import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UserService } from './service';
import { UserRepository } from './repository';

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  password: 'hashedPassword',
  displayname: null,
  phone: null,
  gender: null,
  dateOfBirth: null,
  avatar: null,
  role: 'user',
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
  isActiveUser: jest.fn().mockReturnValue(true),
};

const expectedClientUser = (user = mockUser) => ({
  id: user.id,
  _id: user.id,
  email: user.email,
  displayname: user.displayname,
  phone: user.phone,
  gender: user.gender,
  dateOfBirth: user.dateOfBirth,
  avatar: user.avatar,
  role: user.role,
  isActive: user.isActive,
  account: {
    email: user.email,
    isActive: user.isActive,
    isVerified: true,
  },
  createdAt: user.createdAt,
  createAt: user.createdAt,
  updatedAt: user.updatedAt,
});

describe('UserService', () => {
  let service: UserService;
  let userRepo: UserRepository;

  const mockUserRepo = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: UserRepository, useValue: mockUserRepo },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepo = module.get<UserRepository>(UserRepository);
  });

  describe('getUserById', () => {
    const userId = 'user-1';

    it('should return user when found by id', async () => {
      mockUserRepo.findById.mockResolvedValue(mockUser);

      const result = await service.getUserById(userId);

      expect(userRepo.findById).toHaveBeenCalledWith(userId);
      expect(result).toEqual(expectedClientUser());
    });

    it('should throw BadRequestException when user not found', async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      await expect(service.getUserById(userId)).rejects.toThrow(BadRequestException);
      expect(userRepo.findById).toHaveBeenCalledWith(userId);
    });
  });

  describe('updateUser', () => {
    const userId = 'user-1';

    it('should update user email', async () => {
      const dto = { email: 'updated@example.com' };
      const expectedUser = { ...mockUser, email: 'updated@example.com' };
      mockUserRepo.findById.mockResolvedValue({ ...mockUser });
      mockUserRepo.update.mockResolvedValue(undefined);

      const result = await service.updateUser(userId, dto);

      expect(userRepo.findById).toHaveBeenCalledWith(userId);
      expect(userRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'updated@example.com' }),
      );
      expect(result.email).toBe('updated@example.com');
    });

    it('should update both email and display name', async () => {
      const dto = {
        email: 'New@Example.com',
        displayname: 'New Name',
      };
      mockUserRepo.findById.mockResolvedValue({ ...mockUser });
      mockUserRepo.update.mockResolvedValue(undefined);

      const result = await service.updateUser(userId, dto);

      expect(result.email).toBe('new@example.com');
      expect(result.displayname).toBe('New Name');
    });

    it('should update optional profile fields', async () => {
      const dto = {
        displayname: 'Nguyen Van A',
        phone: '0901234567',
        gender: 'other',
        dateOfBirth: '2002-01-31',
        avatar: 'data:image/png;base64,avatar',
      };
      mockUserRepo.findById.mockResolvedValue({ ...mockUser });
      mockUserRepo.update.mockResolvedValue(undefined);

      const result = await service.updateUser(userId, dto);

      expect(userRepo.update).toHaveBeenCalledWith(
        expect.objectContaining(dto),
      );
      expect(result).toEqual(expect.objectContaining(dto));
    });

    it('should throw BadRequestException when user not found', async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      await expect(
        service.updateUser(userId, { email: 'test@example.com' }),
      ).rejects.toThrow(BadRequestException);
      expect(userRepo.findById).toHaveBeenCalledWith(userId);
    });
  });
});
