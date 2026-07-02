import { Test, TestingModule } from '@nestjs/testing';
import { FavoriteController } from './controller';
import { FavoriteService } from './service';

describe('FavoriteController', () => {
  let controller: FavoriteController;
  let favoriteService: jest.Mocked<FavoriteService>;

  const mockFavoriteResult = {
    id: 'fav-1',
    userId: 'user-1',
    items: [{ heritageId: 'heritage-1', addedAt: new Date('2024-01-01') }],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockPaginatedResult = {
    items: [mockFavoriteResult],
    pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 1 },
  };

  const mockUserPaginatedResult = {
    userId: 'user-1',
    items: [
      { id: 'heritage-1', title: 'Test Heritage', slug: 'test-heritage', status: 'PUBLISHED' },
    ],
    pagination: { page: 1, limit: 10, totalItems: 1, totalPages: 1 },
  };

  beforeEach(async () => {
    const mockFavoriteService = {
      getAll: jest.fn(),
      getFavoriteById: jest.fn(),
      getByUserId: jest.fn(),
      addToFavorites: jest.fn(),
      deleteByHeritageId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FavoriteController],
      providers: [
        { provide: FavoriteService, useValue: mockFavoriteService },
      ],
    }).compile();

    controller = module.get<FavoriteController>(FavoriteController);
    favoriteService = module.get(FavoriteService);

    jest.clearAllMocks();
  });

  describe('GET /', () => {
    it('should call service.getAll with query and return Response.OK', async () => {
      const query = { page: 1, limit: 10 };
      favoriteService.getAll.mockResolvedValue(mockPaginatedResult);

      const result = await controller.getAll(query);

      expect(favoriteService.getAll).toHaveBeenCalledWith(query);
      expect(result).toEqual({ data: mockPaginatedResult });
    });

    it('should pass sort and order in query', async () => {
      const query = { page: 2, limit: 5, sort: 'updatedAt', order: 'asc' };
      favoriteService.getAll.mockResolvedValue(mockPaginatedResult);

      await controller.getAll(query);

      expect(favoriteService.getAll).toHaveBeenCalledWith(query);
    });
  });

  describe('GET :id', () => {
    it('should call service.getFavoriteById and return Response.OK', async () => {
      favoriteService.getFavoriteById.mockResolvedValue(mockFavoriteResult);

      const result = await controller.getFavoriteById('fav-1');

      expect(favoriteService.getFavoriteById).toHaveBeenCalledWith('fav-1');
      expect(result).toEqual({ data: mockFavoriteResult });
    });

    it('should propagate NotFoundException from service', async () => {
      favoriteService.getFavoriteById.mockRejectedValue(new Error('Favorite not found'));

      await expect(
        controller.getFavoriteById('nonexistent'),
      ).rejects.toThrow('Favorite not found');
    });
  });

  describe('GET user/:userId', () => {
    it('should call service.getByUserId with userId and queryDto', async () => {
      const queryDto = { page: 1, limit: 5, language: 'vi' } as any;
      favoriteService.getByUserId.mockResolvedValue(mockUserPaginatedResult);

      const result = await controller.getByUserId('user-1', queryDto);

      expect(favoriteService.getByUserId).toHaveBeenCalledWith('user-1', queryDto);
      expect(result).toEqual({ data: mockUserPaginatedResult });
    });

    it('should handle empty query params', async () => {
      favoriteService.getByUserId.mockResolvedValue({
        userId: 'user-1',
        items: [],
        pagination: { page: 1, limit: 10, totalItems: 0, totalPages: 0 },
      });

      const result = await controller.getByUserId('user-1', {} as any);

      expect(result).toEqual({
        data: {
          userId: 'user-1',
          items: [],
          pagination: { page: 1, limit: 10, totalItems: 0, totalPages: 0 },
        },
      });
    });

    it('should propagate errors from service', async () => {
      favoriteService.getByUserId.mockRejectedValue(new Error('User not found'));

      await expect(
        controller.getByUserId('nonexistent', {} as any),
      ).rejects.toThrow('User not found');
    });
  });

  describe('POST /', () => {
    it('should call service.addToFavorites with userId and heritageId from dto', async () => {
      const dto = { userId: 'user-1', heritageId: 'heritage-1' };
      favoriteService.addToFavorites.mockResolvedValue(mockFavoriteResult);

      const result = await controller.addToFavorites(dto);

      expect(favoriteService.addToFavorites).toHaveBeenCalledWith('user-1', 'heritage-1');
      expect(result).toEqual({ data: mockFavoriteResult });
    });

    it('should propagate BadRequestException from service', async () => {
      favoriteService.addToFavorites.mockRejectedValue(
        new Error('Heritage already exists in favorites'),
      );

      await expect(
        controller.addToFavorites({ userId: 'user-1', heritageId: 'heritage-1' }),
      ).rejects.toThrow('Heritage already exists in favorites');
    });

    it('should propagate NotFoundException from service', async () => {
      favoriteService.addToFavorites.mockRejectedValue(new Error('Heritage not found'));

      await expect(
        controller.addToFavorites({ userId: 'user-1', heritageId: 'nonexistent' }),
      ).rejects.toThrow('Heritage not found');
    });
  });

  describe('DELETE :userId/:heritageId', () => {
    it('should call service.deleteByHeritageId with userId and heritageId', async () => {
      const deleteResult = { message: 'Removed from favorites successfully' };
      favoriteService.deleteByHeritageId.mockResolvedValue(deleteResult);

      const result = await controller.deleteByHeritageId('user-1', 'heritage-1');

      expect(favoriteService.deleteByHeritageId).toHaveBeenCalledWith('user-1', 'heritage-1');
      expect(result).toEqual({ data: deleteResult });
    });

    it('should propagate NotFoundException from service', async () => {
      favoriteService.deleteByHeritageId.mockRejectedValue(new Error('Favorite list not found'));

      await expect(
        controller.deleteByHeritageId('user-1', 'nonexistent'),
      ).rejects.toThrow('Favorite list not found');
    });
  });
});
