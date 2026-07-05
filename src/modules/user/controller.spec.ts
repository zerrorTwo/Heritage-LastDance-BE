import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './controller';
import { UserService } from './service';
import { CloudinaryProvider } from '../../providers/cloudinary.provider';

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  password: 'hashedPassword',
  isActive: true,
  createdAt: new Date('2024-01-01'),
  isActiveUser: () => true,
};

describe('UserController', () => {
  let controller: UserController;
  let userService: UserService;

  const mockUserService = {
    getUserById: jest.fn(),
    updateUser: jest.fn(),
  };

  const mockCloudinaryProvider = {
    uploadStream: jest.fn(),
  };

  const mockRequest = {
    user: {
      userId: 'user-1',
      sessionId: 'session-1',
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: UserService, useValue: mockUserService },
        { provide: CloudinaryProvider, useValue: mockCloudinaryProvider },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get<UserService>(UserService);
  });

  describe('getCurrentUser', () => {
    it('should call userService.getUserById and return OK response', async () => {
      mockUserService.getUserById.mockResolvedValue(mockUser);

      const result = await controller.getCurrentUser(mockRequest);

      expect(userService.getUserById).toHaveBeenCalledWith(mockRequest.user.userId);
      expect(result).toEqual({ data: mockUser });
    });
  });

  describe('updateCurrentUser', () => {
    it('should call userService.updateUser with dto and return OK response', async () => {
      const dto = { email: 'updated@example.com' };
      const updatedUser = { ...mockUser, email: 'updated@example.com' };
      mockUserService.updateUser.mockResolvedValue(updatedUser);

      const result = await controller.updateCurrentUser(dto, mockRequest);

      expect(userService.updateUser).toHaveBeenCalledWith(mockRequest.user.userId, dto);
      expect(result).toEqual({ data: updatedUser });
    });

    it('should call userService.updateUser with display name', async () => {
      const dto = { displayname: 'Updated Name' };
      const updatedUser = { ...mockUser, displayname: dto.displayname };
      mockUserService.updateUser.mockResolvedValue(updatedUser);

      const result = await controller.updateCurrentUser(dto, mockRequest);

      expect(userService.updateUser).toHaveBeenCalledWith(mockRequest.user.userId, dto);
      expect(result).toEqual({ data: updatedUser });
    });

    it('should call userService.updateUser with optional profile fields', async () => {
      const dto = {
        displayname: 'Nguyen Van A',
        phone: '0901234567',
        gender: 'other',
        dateOfBirth: '2002-01-31',
        avatar: 'data:image/png;base64,avatar',
      };
      const updatedUser = { ...mockUser, ...dto };
      mockUserService.updateUser.mockResolvedValue(updatedUser);

      const result = await controller.updateCurrentUser(dto, mockRequest);

      expect(userService.updateUser).toHaveBeenCalledWith(mockRequest.user.userId, dto);
      expect(result).toEqual({ data: updatedUser });
    });
  });

  describe('uploadAvatar', () => {
    it('should upload avatar to cloudinary and return OK response', async () => {
      const file = { buffer: Buffer.from('test'), mimetype: 'image/png' } as Express.Multer.File;
      mockCloudinaryProvider.uploadStream.mockResolvedValue({
        secure_url: 'https://res.cloudinary.com/demo/image/upload/avatar.png',
        public_id: 'avatarHeritage/avatar',
      });

      const result = await controller.uploadAvatar(file);

      expect(mockCloudinaryProvider.uploadStream).toHaveBeenCalledWith(file, 'avatarHeritage');
      expect(result).toEqual({
        data: {
          imageUrl: 'https://res.cloudinary.com/demo/image/upload/avatar.png',
          publicId: 'avatarHeritage/avatar',
        },
      });
    });
  });
});
