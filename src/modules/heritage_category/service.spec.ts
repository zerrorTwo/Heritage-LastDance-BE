import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { HeritageCategoryService } from './service';
import { HeritageCategoryRepository } from './repository';

const mockCategory = {
  id: '1',
  name: 'Test Category',
  slug: 'test-category',
};

const mockCategories = [mockCategory];

describe('HeritageCategoryService', () => {
  let service: HeritageCategoryService;
  let repo: HeritageCategoryRepository;

  const mockRepo = {
    findBySlug: jest.fn(),
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
        HeritageCategoryService,
        { provide: HeritageCategoryRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<HeritageCategoryService>(HeritageCategoryService);
    repo = module.get<HeritageCategoryRepository>(HeritageCategoryRepository);
  });

  describe('getCategoryBySlug', () => {
    it('should return category when found by slug', async () => {
      mockRepo.findBySlug.mockResolvedValue(mockCategory);

      const result = await service.getCategoryBySlug('test-category');

      expect(repo.findBySlug).toHaveBeenCalledWith('test-category');
      expect(result).toEqual(mockCategory);
    });

    it('should throw BadRequestException when category not found by slug', async () => {
      mockRepo.findBySlug.mockResolvedValue(null);

      await expect(service.getCategoryBySlug('nonexistent')).rejects.toThrow(BadRequestException);
      expect(repo.findBySlug).toHaveBeenCalledWith('nonexistent');
    });
  });

  describe('getCategoryById', () => {
    it('should return category when found by id', async () => {
      mockRepo.findById.mockResolvedValue(mockCategory);

      const result = await service.getCategoryById('1');

      expect(repo.findById).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockCategory);
    });

    it('should throw BadRequestException when category not found by id', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.getCategoryById('999')).rejects.toThrow(BadRequestException);
      expect(repo.findById).toHaveBeenCalledWith('999');
    });
  });

  describe('getAllCategories', () => {
    it('should return all categories', async () => {
      mockRepo.findAll.mockResolvedValue(mockCategories);

      const result = await service.getAllCategories();

      expect(repo.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockCategories);
    });

    it('should return empty array when no categories exist', async () => {
      mockRepo.findAll.mockResolvedValue([]);

      const result = await service.getAllCategories();

      expect(result).toEqual([]);
    });
  });

  describe('createCategory', () => {
    it('should create and return new category', async () => {
      const dto = { name: 'New Category', slug: 'new-category' };
      mockRepo.create.mockResolvedValue({ id: '2', ...dto });

      const result = await service.createCategory(dto as any);

      expect(repo.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: '2', ...dto });
    });
  });

  describe('updateCategory', () => {
    it('should update and return updated category', async () => {
      const dto = { name: 'Updated Category' };
      const updatedCategory = { ...mockCategory, ...dto };
      mockRepo.findById.mockResolvedValueOnce(mockCategory);
      mockRepo.update.mockResolvedValue(undefined);
      mockRepo.findById.mockResolvedValueOnce(updatedCategory);

      const result = await service.updateCategory('1', dto as any);

      expect(repo.findById).toHaveBeenCalledWith('1');
      expect(repo.update).toHaveBeenCalledWith('1', dto);
      expect(result).toEqual(updatedCategory);
    });

    it('should throw BadRequestException when updating non-existent category', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.updateCategory('999', {} as any)).rejects.toThrow(BadRequestException);
      expect(repo.findById).toHaveBeenCalledWith('999');
    });
  });

  describe('deleteCategory', () => {
    it('should delete category and return success message', async () => {
      mockRepo.findById.mockResolvedValue(mockCategory);
      mockRepo.delete.mockResolvedValue(undefined);

      const result = await service.deleteCategory('1');

      expect(repo.findById).toHaveBeenCalledWith('1');
      expect(repo.delete).toHaveBeenCalledWith('1');
      expect(result).toEqual({ message: 'Category deleted successfully' });
    });

    it('should throw BadRequestException when deleting non-existent category', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.deleteCategory('999')).rejects.toThrow(BadRequestException);
      expect(repo.findById).toHaveBeenCalledWith('999');
    });
  });
});
