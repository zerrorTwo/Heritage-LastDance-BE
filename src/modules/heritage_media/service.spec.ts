import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { HeritageMediaService } from './service';
import { HeritageMediaRepository } from './repository';

const mockMedia = {
  id: '1',
  heritageId: 'h1',
  url: 'https://example.com/image.jpg',
  type: 'image',
};

const mockMediaList = [mockMedia];

describe('HeritageMediaService', () => {
  let service: HeritageMediaService;
  let repo: HeritageMediaRepository;

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
        HeritageMediaService,
        { provide: HeritageMediaRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<HeritageMediaService>(HeritageMediaService);
    repo = module.get<HeritageMediaRepository>(HeritageMediaRepository);
  });

  describe('getMediaById', () => {
    it('should return media when found by id', async () => {
      mockRepo.findById.mockResolvedValue(mockMedia);

      const result = await service.getMediaById('1');

      expect(repo.findById).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockMedia);
    });

    it('should throw BadRequestException when media not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.getMediaById('999')).rejects.toThrow(BadRequestException);
      expect(repo.findById).toHaveBeenCalledWith('999');
    });
  });

  describe('getMediaByHeritageId', () => {
    it('should return media list for given heritageId', async () => {
      mockRepo.findByHeritageId.mockResolvedValue(mockMediaList);

      const result = await service.getMediaByHeritageId('h1');

      expect(repo.findByHeritageId).toHaveBeenCalledWith('h1');
      expect(result).toEqual(mockMediaList);
    });

    it('should return empty array when no media found', async () => {
      mockRepo.findByHeritageId.mockResolvedValue([]);

      const result = await service.getMediaByHeritageId('h99');

      expect(result).toEqual([]);
    });
  });

  describe('createMedia', () => {
    it('should create and return new media', async () => {
      const dto = { heritageId: 'h1', url: 'https://example.com/new.jpg', type: 'image' };
      mockRepo.create.mockResolvedValue({ id: '2', ...dto });

      const result = await service.createMedia(dto as any);

      expect(repo.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: '2', ...dto });
    });
  });

  describe('updateMedia', () => {
    it('should update and return updated media', async () => {
      const dto = { url: 'https://example.com/updated.jpg' };
      const updated = { ...mockMedia, ...dto };
      mockRepo.findById.mockResolvedValueOnce(mockMedia);
      mockRepo.update.mockResolvedValue(undefined);
      mockRepo.findById.mockResolvedValueOnce(updated);

      const result = await service.updateMedia('1', dto as any);

      expect(repo.findById).toHaveBeenCalledWith('1');
      expect(repo.update).toHaveBeenCalledWith('1', dto);
      expect(result).toEqual(updated);
    });

    it('should throw BadRequestException when updating non-existent media', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.updateMedia('999', {} as any)).rejects.toThrow(BadRequestException);
      expect(repo.findById).toHaveBeenCalledWith('999');
    });
  });

  describe('deleteMedia', () => {
    it('should delete media and return success message', async () => {
      mockRepo.findById.mockResolvedValue(mockMedia);
      mockRepo.delete.mockResolvedValue(undefined);

      const result = await service.deleteMedia('1');

      expect(repo.findById).toHaveBeenCalledWith('1');
      expect(repo.delete).toHaveBeenCalledWith('1');
      expect(result).toEqual({ message: 'Media deleted successfully' });
    });

    it('should throw BadRequestException when deleting non-existent media', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.deleteMedia('999')).rejects.toThrow(BadRequestException);
      expect(repo.findById).toHaveBeenCalledWith('999');
    });
  });
});
