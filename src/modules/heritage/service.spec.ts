import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HeritageService } from './service';
import { HeritageRepository } from './repository';
import { RagService } from '../rag/service';

const mockHeritage = {
  id: '1',
  name: 'Test Heritage',
  slug: 'test-heritage',
  status: 'active',
  type: 'cultural',
  description: 'Test description',
};

const mockHeritages = [mockHeritage];

describe('HeritageService', () => {
  let service: HeritageService;
  let repo: HeritageRepository;

  const mockRepo = {
    findBySlug: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockRagService = {
    syncHeritage: jest.fn(),
    removeHeritage: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HeritageService,
        { provide: HeritageRepository, useValue: mockRepo },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: RagService, useValue: mockRagService },
      ],
    }).compile();

    service = module.get<HeritageService>(HeritageService);
    repo = module.get<HeritageRepository>(HeritageRepository);
  });

  describe('getHeritageBySlug', () => {
    it('should return heritage when found by slug', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockRepo.findBySlug.mockResolvedValue(mockHeritage);

      const result = await service.getHeritageBySlug('test-heritage');

      expect(repo.findBySlug).toHaveBeenCalledWith('test-heritage');
      expect(result).toEqual(mockHeritage);
    });

    it('should return cached heritage when available', async () => {
      mockCacheManager.get.mockResolvedValue(mockHeritage);

      const result = await service.getHeritageBySlug('test-heritage');

      expect(repo.findBySlug).not.toHaveBeenCalled();
      expect(result).toEqual(mockHeritage);
    });

    it('should throw BadRequestException when heritage not found by slug', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockRepo.findBySlug.mockResolvedValue(null);

      await expect(service.getHeritageBySlug('nonexistent')).rejects.toThrow(BadRequestException);
      expect(repo.findBySlug).toHaveBeenCalledWith('nonexistent');
    });
  });

  describe('getHeritageById', () => {
    it('should return heritage when found by id', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockRepo.findById.mockResolvedValue(mockHeritage);

      const result = await service.getHeritageById('1');

      expect(repo.findById).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockHeritage);
    });

    it('should throw BadRequestException when heritage not found by id', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.getHeritageById('999')).rejects.toThrow(BadRequestException);
      expect(repo.findById).toHaveBeenCalledWith('999');
    });
  });

  describe('getAllHeritage', () => {
    it('should return all heritage when no filter provided', async () => {
      mockRepo.findAll.mockResolvedValue({ items: mockHeritages, total: 1 });

      const result = await service.getAllHeritage();

      expect(repo.findAll).toHaveBeenCalledWith(undefined);
      expect(result).toEqual({ items: mockHeritages, total: 1 });
    });

    it('should return filtered heritage when filter provided', async () => {
      mockRepo.findAll.mockResolvedValue({ items: [mockHeritage], total: 1 });

      const result = await service.getAllHeritage({ status: 'active', type: 'cultural' });

      expect(repo.findAll).toHaveBeenCalledWith({ status: 'active', type: 'cultural' });
      expect(result).toEqual({ items: [mockHeritage], total: 1 });
    });

    it('should return empty array when no heritage exist', async () => {
      mockRepo.findAll.mockResolvedValue({ items: [], total: 0 });

      const result = await service.getAllHeritage();

      expect(result).toEqual({ items: [], total: 0 });
    });
  });

  describe('createHeritage', () => {
    it('should create and return new heritage', async () => {
      const dto = { name: 'New Heritage', slug: 'new-heritage', status: 'active', type: 'cultural' };
      mockRepo.create.mockResolvedValue({ id: '2', ...dto });

      const result = await service.createHeritage(dto as any);

      expect(repo.create).toHaveBeenCalledWith(dto);
      expect(mockCacheManager.del).toHaveBeenCalledWith('heritage:list');
      expect(result).toEqual({ id: '2', ...dto });
    });
  });

  describe('updateHeritage', () => {
    it('should update and return updated heritage', async () => {
      const dto = { name: 'Updated Heritage' };
      const updatedHeritage = { ...mockHeritage, ...dto };
      mockRepo.findById.mockResolvedValueOnce(mockHeritage);
      mockRepo.update.mockResolvedValue(undefined);
      mockRepo.findById.mockResolvedValueOnce(updatedHeritage);

      const result = await service.updateHeritage('1', dto as any);

      expect(repo.findById).toHaveBeenCalledWith('1');
      expect(repo.update).toHaveBeenCalledWith('1', dto);
      expect(mockCacheManager.del).toHaveBeenCalledWith('heritage:id:1');
      expect(mockCacheManager.del).toHaveBeenCalledWith('heritage:slug:test-heritage');
      expect(result).toEqual(updatedHeritage);
    });

    it('should throw BadRequestException when updating non-existent heritage', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.updateHeritage('999', {} as any)).rejects.toThrow(BadRequestException);
      expect(repo.findById).toHaveBeenCalledWith('999');
    });
  });

  describe('deleteHeritage', () => {
    it('should delete heritage and return success message', async () => {
      mockRepo.findById.mockResolvedValue(mockHeritage);
      mockRepo.delete.mockResolvedValue(undefined);

      const result = await service.deleteHeritage('1');

      expect(repo.findById).toHaveBeenCalledWith('1');
      expect(repo.delete).toHaveBeenCalledWith('1');
      expect(mockCacheManager.del).toHaveBeenCalledWith('heritage:id:1');
      expect(result).toEqual({ message: 'Heritage item deleted successfully' });
    });

    it('should throw BadRequestException when deleting non-existent heritage', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.deleteHeritage('999')).rejects.toThrow(BadRequestException);
      expect(repo.findById).toHaveBeenCalledWith('999');
    });
  });
});
