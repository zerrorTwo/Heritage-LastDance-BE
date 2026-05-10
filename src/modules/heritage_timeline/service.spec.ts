import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { HeritageTimelineService } from './service';
import { HeritageTimelineRepository } from './repository';

const mockTimeline = {
  id: '1',
  heritageId: 'h1',
  year: 1900,
  event: 'Test Event',
};

const mockTimelines = [mockTimeline];

describe('HeritageTimelineService', () => {
  let service: HeritageTimelineService;
  let repo: HeritageTimelineRepository;

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
        HeritageTimelineService,
        { provide: HeritageTimelineRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<HeritageTimelineService>(HeritageTimelineService);
    repo = module.get<HeritageTimelineRepository>(HeritageTimelineRepository);
  });

  describe('getTimelineById', () => {
    it('should return timeline when found by id', async () => {
      mockRepo.findById.mockResolvedValue(mockTimeline);

      const result = await service.getTimelineById('1');

      expect(repo.findById).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockTimeline);
    });

    it('should throw BadRequestException when timeline not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.getTimelineById('999')).rejects.toThrow(BadRequestException);
      expect(repo.findById).toHaveBeenCalledWith('999');
    });
  });

  describe('getTimelinesByHeritageId', () => {
    it('should return timelines for given heritageId', async () => {
      mockRepo.findByHeritageId.mockResolvedValue(mockTimelines);

      const result = await service.getTimelinesByHeritageId('h1');

      expect(repo.findByHeritageId).toHaveBeenCalledWith('h1');
      expect(result).toEqual(mockTimelines);
    });

    it('should return empty array when no timelines found', async () => {
      mockRepo.findByHeritageId.mockResolvedValue([]);

      const result = await service.getTimelinesByHeritageId('h99');

      expect(result).toEqual([]);
    });
  });

  describe('createTimeline', () => {
    it('should create and return new timeline', async () => {
      const dto = { heritageId: 'h1', year: 2000, event: 'New Event' };
      mockRepo.create.mockResolvedValue({ id: '2', ...dto });

      const result = await service.createTimeline(dto as any);

      expect(repo.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: '2', ...dto });
    });
  });

  describe('updateTimeline', () => {
    it('should update and return updated timeline', async () => {
      const dto = { event: 'Updated Event' };
      const updated = { ...mockTimeline, ...dto };
      mockRepo.findById.mockResolvedValueOnce(mockTimeline);
      mockRepo.update.mockResolvedValue(undefined);
      mockRepo.findById.mockResolvedValueOnce(updated);

      const result = await service.updateTimeline('1', dto as any);

      expect(repo.findById).toHaveBeenCalledWith('1');
      expect(repo.update).toHaveBeenCalledWith('1', dto);
      expect(result).toEqual(updated);
    });

    it('should throw BadRequestException when updating non-existent timeline', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.updateTimeline('999', {} as any)).rejects.toThrow(BadRequestException);
      expect(repo.findById).toHaveBeenCalledWith('999');
    });
  });

  describe('deleteTimeline', () => {
    it('should delete timeline and return success message', async () => {
      mockRepo.findById.mockResolvedValue(mockTimeline);
      mockRepo.delete.mockResolvedValue(undefined);

      const result = await service.deleteTimeline('1');

      expect(repo.findById).toHaveBeenCalledWith('1');
      expect(repo.delete).toHaveBeenCalledWith('1');
      expect(result).toEqual({ message: 'Timeline event deleted successfully' });
    });

    it('should throw BadRequestException when deleting non-existent timeline', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.deleteTimeline('999')).rejects.toThrow(BadRequestException);
      expect(repo.findById).toHaveBeenCalledWith('999');
    });
  });
});
