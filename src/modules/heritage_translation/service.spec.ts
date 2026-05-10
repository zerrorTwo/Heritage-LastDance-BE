import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { HeritageTranslationService } from './service';
import { HeritageTranslationRepository } from './repository';

const mockTranslation = {
  id: '1',
  heritageId: 'h1',
  language: 'en',
  name: 'Test Translation',
  description: 'Test Description',
};

const mockTranslations = [mockTranslation];

describe('HeritageTranslationService', () => {
  let service: HeritageTranslationService;
  let repo: HeritageTranslationRepository;

  const mockRepo = {
    findById: jest.fn(),
    findByHeritageId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HeritageTranslationService,
        { provide: HeritageTranslationRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<HeritageTranslationService>(HeritageTranslationService);
    repo = module.get<HeritageTranslationRepository>(HeritageTranslationRepository);
  });

  describe('getTranslationById', () => {
    it('should return translation when found by id', async () => {
      mockRepo.findById.mockResolvedValue(mockTranslation);

      const result = await service.getTranslationById('1');

      expect(repo.findById).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockTranslation);
    });

    it('should throw BadRequestException when translation not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.getTranslationById('999')).rejects.toThrow(BadRequestException);
      expect(repo.findById).toHaveBeenCalledWith('999');
    });
  });

  describe('getTranslationsByHeritageId', () => {
    it('should return translations for given heritageId', async () => {
      mockRepo.findByHeritageId.mockResolvedValue(mockTranslations);

      const result = await service.getTranslationsByHeritageId('h1');

      expect(repo.findByHeritageId).toHaveBeenCalledWith('h1');
      expect(result).toEqual(mockTranslations);
    });

    it('should return empty array when no translations found', async () => {
      mockRepo.findByHeritageId.mockResolvedValue([]);

      const result = await service.getTranslationsByHeritageId('h99');

      expect(result).toEqual([]);
    });
  });

  describe('createTranslation', () => {
    it('should create and return new translation', async () => {
      const dto = { heritageId: 'h1', language: 'en', name: 'New' };
      mockRepo.create.mockResolvedValue({ id: '2', ...dto });

      const result = await service.createTranslation(dto as any);

      expect(repo.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: '2', ...dto });
    });
  });

  describe('updateTranslation', () => {
    it('should update and return updated translation', async () => {
      const dto = { name: 'Updated Translation' };
      const updated = { ...mockTranslation, ...dto };
      mockRepo.findById.mockResolvedValueOnce(mockTranslation);
      mockRepo.update.mockResolvedValue(undefined);
      mockRepo.findById.mockResolvedValueOnce(updated);

      const result = await service.updateTranslation('1', dto as any);

      expect(repo.findById).toHaveBeenCalledWith('1');
      expect(repo.update).toHaveBeenCalledWith('1', dto);
      expect(result).toEqual(updated);
    });

    it('should throw BadRequestException when updating non-existent translation', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.updateTranslation('999', {} as any)).rejects.toThrow(BadRequestException);
      expect(repo.findById).toHaveBeenCalledWith('999');
    });
  });

  describe('deleteTranslation', () => {
    it('should delete translation and return success message', async () => {
      mockRepo.findById.mockResolvedValue(mockTranslation);
      mockRepo.delete.mockResolvedValue(undefined);

      const result = await service.deleteTranslation('1');

      expect(repo.findById).toHaveBeenCalledWith('1');
      expect(repo.delete).toHaveBeenCalledWith('1');
      expect(result).toEqual({ message: 'Translation deleted successfully' });
    });

    it('should throw BadRequestException when deleting non-existent translation', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.deleteTranslation('999')).rejects.toThrow(BadRequestException);
      expect(repo.findById).toHaveBeenCalledWith('999');
    });
  });
});
