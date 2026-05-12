import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FavoriteService } from './service';
import { FavoriteRepository } from './repository';
import { HeritageRepository } from '../heritage/repository';

describe('FavoriteService', () => {
  let service: FavoriteService;
  let favoriteRepo: jest.Mocked<FavoriteRepository>;
  let heritageRepo: jest.Mocked<HeritageRepository>;

  const mockHeritage = {
    id: 'heritage-1',
    title: 'Test Heritage',
    slug: 'test-heritage',
    status: 'PUBLISHED',
  };

  const mockFavorite = {
    id: 'fav-1',
    userId: 'user-1',
    items: JSON.stringify([
      { heritageId: 'heritage-1', addedAt: new Date('2024-01-01') },
      { heritageId: 'heritage-2', addedAt: new Date('2024-01-02') },
    ]),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const mockFavoriteRepo = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      parseItems: jest.fn().mockImplementation((raw: string) => {
        try {
          return JSON.parse(raw ?? '[]');
        } catch {
          return [];
        }
      }),
    };

    const mockHeritageRepo = {
      findById: jest.fn(),
      findByIds: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoriteService,
        { provide: FavoriteRepository, useValue: mockFavoriteRepo },
        { provide: HeritageRepository, useValue: mockHeritageRepo },
      ],
    }).compile();

    service = module.get<FavoriteService>(FavoriteService);
    favoriteRepo = module.get(FavoriteRepository);
    heritageRepo = module.get(HeritageRepository);

    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return paginated favorites with parsed items (default params)', async () => {
      favoriteRepo.findAll.mockResolvedValue({
        results: [mockFavorite],
        total: 1,
      });

      const result = await service.getAll({});

      expect(favoriteRepo.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        sort: 'createdAt',
        order: 'DESC',
      });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].items).toEqual([
        { heritageId: 'heritage-1', addedAt: expect.any(String) },
        { heritageId: 'heritage-2', addedAt: expect.any(String) },
      ]);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        totalPages: 1,
        totalItems: 1,
      });
    });

    it('should apply custom page, limit, sort, order', async () => {
      favoriteRepo.findAll.mockResolvedValue({ results: [], total: 0 });

      await favoriteRepo.findAll.mockResolvedValue({ results: [mockFavorite], total: 20 });
      await service.getAll({ page: 2, limit: 5, sort: 'updatedAt', order: 'asc' });

      expect(favoriteRepo.findAll).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
        sort: 'updatedAt',
        order: 'ASC',
      });
    });

    it('should calculate totalPages correctly', async () => {
      favoriteRepo.findAll.mockResolvedValue({ results: [], total: 25 });

      const result = await service.getAll({});

      expect(result.pagination.totalPages).toBe(3);
    });
  });

  describe('getFavoriteById', () => {
    it('should return favorite with parsed items', async () => {
      favoriteRepo.findById.mockResolvedValue(mockFavorite);

      const result = await service.getFavoriteById('fav-1');

      expect(favoriteRepo.findById).toHaveBeenCalledWith('fav-1');
      expect(result.items).toEqual([
        { heritageId: 'heritage-1', addedAt: expect.any(String) },
        { heritageId: 'heritage-2', addedAt: expect.any(String) },
      ]);
    });

    it('should throw NotFoundException when favorite not found', async () => {
      favoriteRepo.findById.mockResolvedValue(null);

      await expect(service.getFavoriteById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getByUserId', () => {
    it('should return paginated heritage details for user', async () => {
      favoriteRepo.findByUserId.mockResolvedValue(mockFavorite);
      heritageRepo.findByIds.mockResolvedValue([
        mockHeritage as any,
        { ...mockHeritage, id: 'heritage-2', title: 'Heritage 2' } as any,
      ]);

      const result = await service.getByUserId('user-1', {} as any);

      expect(favoriteRepo.findByUserId).toHaveBeenCalledWith('user-1');
      expect(heritageRepo.findByIds).toHaveBeenCalledWith(['heritage-1', 'heritage-2']);
      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toEqual({
        id: 'heritage-1',
        title: 'Test Heritage',
        slug: 'test-heritage',
        status: 'PUBLISHED',
      });
      expect(result.pagination.totalItems).toBe(2);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('should return empty result when user has no favorites', async () => {
      favoriteRepo.findByUserId.mockResolvedValue(null);

      const result = await service.getByUserId('user-1', {} as any);

      expect(result.items).toEqual([]);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        totalItems: 0,
        totalPages: 0,
      });
    });

    it('should paginate items correctly', async () => {
      const manyItems = Array.from({ length: 15 }, (_, i) => ({
        heritageId: `heritage-${i}`,
        addedAt: new Date(),
      }));
      const favWithMany = { ...mockFavorite, items: JSON.stringify(manyItems) };
      favoriteRepo.findByUserId.mockResolvedValue(favWithMany);
      favoriteRepo.parseItems.mockReturnValue(manyItems);
      heritageRepo.findByIds.mockResolvedValue(
        manyItems.slice(5, 10).map((item) => ({
          ...mockHeritage,
          id: item.heritageId,
          title: `Heritage ${item.heritageId}`,
        })) as any,
      );

      const result = await service.getByUserId('user-1', {
        page: 2,
        limit: 5,
      } as any);

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.totalPages).toBe(3);
      expect(result.items).toHaveLength(5);
    });

    it('should return null for heritage that throws error during fetch', async () => {
      favoriteRepo.findByUserId.mockResolvedValue(mockFavorite);
      heritageRepo.findByIds.mockResolvedValue([
        mockHeritage as any,
        { ...mockHeritage, id: 'heritage-2', title: 'Heritage 2' } as any,
      ]);

      const result = await service.getByUserId('user-1', {} as any);

      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toEqual({
        id: 'heritage-1',
        title: 'Test Heritage',
        slug: 'test-heritage',
        status: 'PUBLISHED',
      });
    });

    it('should filter out null heritage results', async () => {
      favoriteRepo.findByUserId.mockResolvedValue({
        ...mockFavorite,
        items: JSON.stringify([{ heritageId: 'heritage-1', addedAt: new Date() }]),
      });
      heritageRepo.findByIds.mockResolvedValue([]);

      const result = await service.getByUserId('user-1', {} as any);

      expect(result.items).toEqual([]);
    });
  });

  describe('addToFavorites', () => {
    it('should throw NotFoundException when heritage does not exist', async () => {
      heritageRepo.findById.mockResolvedValue(null);

      await expect(
        service.addToFavorites('user-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);

      expect(favoriteRepo.findByUserId).not.toHaveBeenCalled();
    });

    it('should create new favorite when user has none', async () => {
      heritageRepo.findById.mockResolvedValue(mockHeritage as any);
      favoriteRepo.findByUserId.mockResolvedValue(null);
      const newFav = {
        id: 'new-fav',
        userId: 'user-1',
        items: JSON.stringify([{ heritageId: 'heritage-1', addedAt: new Date() }]),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      favoriteRepo.create.mockResolvedValue(newFav);

      const result = await service.addToFavorites('user-1', 'heritage-1');

      expect(favoriteRepo.create).toHaveBeenCalledWith('user-1', [
        { heritageId: 'heritage-1', addedAt: expect.any(Date) },
      ]);
      expect(result.id).toBe('new-fav');
    });

    it('should throw BadRequestException when heritage already in favorites', async () => {
      heritageRepo.findById.mockResolvedValue(mockHeritage as any);
      favoriteRepo.findByUserId.mockResolvedValue(mockFavorite);

      await expect(
        service.addToFavorites('user-1', 'heritage-1'),
      ).rejects.toThrow(BadRequestException);

      expect(favoriteRepo.update).not.toHaveBeenCalled();
    });

    it('should add new heritage to existing favorites', async () => {
      heritageRepo.findById.mockResolvedValue(mockHeritage as any);
      favoriteRepo.findByUserId.mockResolvedValue(mockFavorite);

      const updatedFav = {
        ...mockFavorite,
        items: JSON.stringify([
          { heritageId: 'heritage-1', addedAt: new Date() },
          { heritageId: 'heritage-2', addedAt: new Date() },
          { heritageId: 'heritage-3', addedAt: new Date() },
        ]),
      };
      favoriteRepo.update.mockResolvedValue(updatedFav);

      const result = await service.addToFavorites('user-1', 'heritage-3');

      expect(favoriteRepo.update).toHaveBeenCalledWith(
        'fav-1',
        expect.arrayContaining([{ heritageId: 'heritage-3', addedAt: expect.any(Date) }]),
      );
      expect(result.id).toBe('fav-1');
    });
  });

  describe('deleteByHeritageId', () => {
    it('should throw NotFoundException when heritage does not exist', async () => {
      heritageRepo.findById.mockResolvedValue(null);

      await expect(
        service.deleteByHeritageId('user-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when favorite list not found', async () => {
      heritageRepo.findById.mockResolvedValue(mockHeritage as any);
      favoriteRepo.findByUserId.mockResolvedValue(null);

      await expect(
        service.deleteByHeritageId('user-1', 'heritage-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should delete the entire favorite document when removing the last item', async () => {
      heritageRepo.findById.mockResolvedValue(mockHeritage as any);
      const singleItemFav = {
        ...mockFavorite,
        items: JSON.stringify([{ heritageId: 'heritage-1', addedAt: new Date() }]),
      };
      favoriteRepo.findByUserId.mockResolvedValue(singleItemFav);

      const result = await service.deleteByHeritageId('user-1', 'heritage-1');

      expect(favoriteRepo.delete).toHaveBeenCalledWith('fav-1');
      expect(favoriteRepo.update).not.toHaveBeenCalled();
      expect(result).toEqual({ message: 'Removed from favorites successfully' });
    });

    it('should update items when removing one of many items', async () => {
      heritageRepo.findById.mockResolvedValue(mockHeritage as any);
      favoriteRepo.findByUserId.mockResolvedValue(mockFavorite);
      favoriteRepo.update.mockResolvedValue(mockFavorite);

      const result = await service.deleteByHeritageId('user-1', 'heritage-1');

      expect(favoriteRepo.update).toHaveBeenCalledWith('fav-1', [
        { heritageId: 'heritage-2', addedAt: expect.any(String) },
      ]);
      expect(favoriteRepo.delete).not.toHaveBeenCalled();
      expect(result).toEqual({ message: 'Removed from favorites successfully' });
    });

    it('should handle missing items in parseItems gracefully', async () => {
      heritageRepo.findById.mockResolvedValue(mockHeritage as any);
      favoriteRepo.findByUserId.mockResolvedValue(mockFavorite);
      (favoriteRepo.parseItems as jest.Mock).mockReturnValueOnce([]);

      const result = await service.deleteByHeritageId('user-1', 'heritage-1');

      expect(favoriteRepo.delete).toHaveBeenCalledWith('fav-1');
      expect(result).toEqual({ message: 'Removed from favorites successfully' });
    });
  });
});
