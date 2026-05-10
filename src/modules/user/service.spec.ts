import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UserService } from './service';
import { UserRepository } from './repository';

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  password: 'hashedPassword',
  walletAddress: null,
  isActive: true,
  createdAt: new Date('2024-01-01'),
  isActiveUser: jest.fn().mockReturnValue(true),
};

describe('UserService', () => {
  let service: UserService;
  let userRepo: UserRepository;

  const mockUserRepo = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    findByWalletAddress: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
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
      expect(result).toEqual(mockUser);
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

    it('should update user walletAddress', async () => {
      const dto = { walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38' };
      mockUserRepo.findById.mockResolvedValue({ ...mockUser });
      mockUserRepo.update.mockResolvedValue(undefined);

      const result = await service.updateUser(userId, dto);

      expect(userRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38',
        }),
      );
      expect(result.walletAddress).toBe('0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38');
    });

    it('should update both email and walletAddress', async () => {
      const dto = {
        email: 'new@example.com',
        walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38',
      };
      mockUserRepo.findById.mockResolvedValue({ ...mockUser });
      mockUserRepo.update.mockResolvedValue(undefined);

      const result = await service.updateUser(userId, dto);

      expect(result.email).toBe('new@example.com');
      expect(result.walletAddress).toBe('0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38');
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
