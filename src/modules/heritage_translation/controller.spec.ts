import { Test, TestingModule } from '@nestjs/testing';
import { HeritageTranslationController } from './controller';
import { HeritageTranslationService } from './service';

const mockTranslation = {
  id: '1',
  heritageId: 'h1',
  language: 'en',
  name: 'Test Translation',
};

describe('HeritageTranslationController', () => {
  let controller: HeritageTranslationController;
  let service: HeritageTranslationService;

  const mockService = {
    getTranslationById: jest.fn(),
    getTranslationsByHeritageId: jest.fn(),
    createTranslation: jest.fn(),
    updateTranslation: jest.fn(),
    deleteTranslation: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HeritageTranslationController],
      providers: [
        { provide: HeritageTranslationService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<HeritageTranslationController>(HeritageTranslationController);
    service = module.get<HeritageTranslationService>(HeritageTranslationService);
  });

  describe('getTranslation', () => {
    it('should call service.getTranslationById with correct id', async () => {
      mockService.getTranslationById.mockResolvedValue(mockTranslation);

      const result = await controller.getTranslation('1');

      expect(service.getTranslationById).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockTranslation);
    });
  });

  describe('getTranslationsByHeritage', () => {
    it('should call service.getTranslationsByHeritageId with correct heritageId', async () => {
      mockService.getTranslationsByHeritageId.mockResolvedValue([mockTranslation]);

      const result = await controller.getTranslationsByHeritage('h1');

      expect(service.getTranslationsByHeritageId).toHaveBeenCalledWith('h1');
      expect(result).toEqual([mockTranslation]);
    });
  });

  describe('createTranslation', () => {
    it('should call service.createTranslation with dto', async () => {
      const dto = { heritageId: 'h1', language: 'en', name: 'New' };
      mockService.createTranslation.mockResolvedValue({ id: '2', ...dto });

      const result = await controller.createTranslation(dto as any);

      expect(service.createTranslation).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: '2', ...dto });
    });
  });

  describe('updateTranslation', () => {
    it('should call service.updateTranslation with id and dto', async () => {
      const dto = { name: 'Updated' };
      mockService.updateTranslation.mockResolvedValue({ ...mockTranslation, ...dto });

      const result = await controller.updateTranslation('1', dto as any);

      expect(service.updateTranslation).toHaveBeenCalledWith('1', dto);
      expect(result).toEqual({ ...mockTranslation, ...dto });
    });
  });

  describe('deleteTranslation', () => {
    it('should call service.deleteTranslation with correct id', async () => {
      mockService.deleteTranslation.mockResolvedValue({ message: 'Translation deleted successfully' });

      const result = await controller.deleteTranslation('1');

      expect(service.deleteTranslation).toHaveBeenCalledWith('1');
      expect(result).toEqual({ message: 'Translation deleted successfully' });
    });
  });
});
