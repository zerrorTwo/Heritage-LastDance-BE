import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HeritageController } from './controller';
import { HeritageService } from './service';
import { APP_INTERCEPTOR } from '@nestjs/core';

const mockHeritage = {
  id: '1',
  name: 'Test Heritage',
  slug: 'test-heritage',
  status: 'active',
  type: 'cultural',
};

describe('HeritageController', () => {
  let controller: HeritageController;
  let service: HeritageService;

  const mockService = {
    getHeritageBySlug: jest.fn(),
    getHeritageById: jest.fn(),
    getAllHeritage: jest.fn(),
    createHeritage: jest.fn(),
    updateHeritage: jest.fn(),
    deleteHeritage: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HeritageController],
      providers: [
        { provide: HeritageService, useValue: mockService },
        { provide: CACHE_MANAGER, useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn() } },
      ],
    }).compile();

    controller = module.get<HeritageController>(HeritageController);
    service = module.get<HeritageService>(HeritageService);
  });

  describe('getHeritageBySlug', () => {
    it('should call service.getHeritageBySlug with correct slug', async () => {
      mockService.getHeritageBySlug.mockResolvedValue(mockHeritage);

      const result = await controller.getHeritageBySlug('test-heritage');

      expect(service.getHeritageBySlug).toHaveBeenCalledWith('test-heritage');
      expect(result).toEqual(mockHeritage);
    });
  });

  describe('getHeritageById', () => {
    it('should call service.getHeritageById with correct id', async () => {
      mockService.getHeritageById.mockResolvedValue(mockHeritage);

      const result = await controller.getHeritageById('1');

      expect(service.getHeritageById).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockHeritage);
    });
  });

  describe('getAllHeritage', () => {
    it('should call service.getAllHeritage with filter params', async () => {
      mockService.getAllHeritage.mockResolvedValue([mockHeritage]);

      const result = await controller.getAllHeritage('active', 'cultural');

      expect(service.getAllHeritage).toHaveBeenCalledWith({
        status: 'active',
        type: 'cultural',
        page: 1,
        limit: 10,
        name: undefined,
        sort: undefined,
        order: undefined,
      });
      expect(result).toEqual([mockHeritage]);
    });

    it('should call service.getAllHeritage with default params when no query', async () => {
      mockService.getAllHeritage.mockResolvedValue([mockHeritage]);

      const result = await controller.getAllHeritage(undefined, undefined);

      expect(service.getAllHeritage).toHaveBeenCalledWith({
        status: undefined,
        type: undefined,
        page: 1,
        limit: 10,
        name: undefined,
        sort: undefined,
        order: undefined,
      });
      expect(result).toEqual([mockHeritage]);
    });
  });

  describe('createHeritage', () => {
    it('should call service.createHeritage with dto', async () => {
      const dto = { name: 'New', slug: 'new', status: 'active', type: 'cultural' };
      mockService.createHeritage.mockResolvedValue({ id: '2', ...dto });

      const result = await controller.createHeritage(dto as any);

      expect(service.createHeritage).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: '2', ...dto });
    });
  });

  describe('updateHeritage', () => {
    it('should call service.updateHeritage with id and dto', async () => {
      const dto = { name: 'Updated' };
      mockService.updateHeritage.mockResolvedValue({ ...mockHeritage, ...dto });

      const result = await controller.updateHeritage('1', dto as any);

      expect(service.updateHeritage).toHaveBeenCalledWith('1', dto);
      expect(result).toEqual({ ...mockHeritage, ...dto });
    });
  });

  describe('deleteHeritage', () => {
    it('should call service.deleteHeritage with correct id', async () => {
      mockService.deleteHeritage.mockResolvedValue({ message: 'Heritage item deleted successfully' });

      const result = await controller.deleteHeritage('1');

      expect(service.deleteHeritage).toHaveBeenCalledWith('1');
      expect(result).toEqual({ message: 'Heritage item deleted successfully' });
    });
  });
});
