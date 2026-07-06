import { Test, TestingModule } from '@nestjs/testing';
import { HeritageCategoryController } from './controller';
import { HeritageCategoryService } from './service';

const mockCategory = {
  id: '1',
  name: 'Test Category',
  slug: 'test-category',
};

describe('HeritageCategoryController', () => {
  let controller: HeritageCategoryController;
  let service: HeritageCategoryService;

  const mockService = {
    getCategoryBySlug: jest.fn(),
    getCategoryById: jest.fn(),
    getAllCategories: jest.fn(),
    createCategory: jest.fn(),
    updateCategory: jest.fn(),
    deleteCategory: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HeritageCategoryController],
      providers: [
        { provide: HeritageCategoryService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<HeritageCategoryController>(HeritageCategoryController);
    service = module.get<HeritageCategoryService>(HeritageCategoryService);
  });

  describe('getCategoryBySlug', () => {
    it('should call service.getCategoryBySlug with correct slug', async () => {
      mockService.getCategoryBySlug.mockResolvedValue(mockCategory);

      const result = await controller.getCategoryBySlug('test-category');

      expect(service.getCategoryBySlug).toHaveBeenCalledWith('test-category');
      expect(result).toEqual(mockCategory);
    });
  });

  describe('getCategoryById', () => {
    it('should call service.getCategoryById with correct id', async () => {
      mockService.getCategoryById.mockResolvedValue(mockCategory);

      const result = await controller.getCategoryById('1');

      expect(service.getCategoryById).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockCategory);
    });
  });

  describe('getAllCategories', () => {
    it('should call service.getAllCategories', async () => {
      mockService.getAllCategories.mockResolvedValue([mockCategory]);

      const result = await controller.getAllCategories();

      expect(service.getAllCategories).toHaveBeenCalled();
      expect(result).toEqual([mockCategory]);
    });
  });

  describe('createCategory', () => {
    it('should call service.createCategory with dto', async () => {
      const dto = { name: 'New', slug: 'new' };
      mockService.createCategory.mockResolvedValue({ id: '2', ...dto });

      const result = await controller.createCategory(dto as any);

      expect(service.createCategory).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: '2', ...dto });
    });
  });

  describe('updateCategory', () => {
    it('should call service.updateCategory with id and dto', async () => {
      const dto = { name: 'Updated' };
      mockService.updateCategory.mockResolvedValue({ ...mockCategory, ...dto });

      const result = await controller.updateCategory('1', dto as any);

      expect(service.updateCategory).toHaveBeenCalledWith('1', dto);
      expect(result).toEqual({ ...mockCategory, ...dto });
    });
  });

  describe('deleteCategory', () => {
    it('should call service.deleteCategory with correct id', async () => {
      mockService.deleteCategory.mockResolvedValue({ message: 'Category deleted successfully' });

      const result = await controller.deleteCategory('1');

      expect(service.deleteCategory).toHaveBeenCalledWith('1');
      expect(result).toEqual({ message: 'Category deleted successfully' });
    });
  });
});
