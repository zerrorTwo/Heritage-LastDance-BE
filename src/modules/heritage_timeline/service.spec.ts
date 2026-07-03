import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { HeritageTimelineRepository } from './repository';
import { HeritageTimelineService } from './service';

const mockTimeline = {
  id: 'timeline-1',
  heritageId: 'heritage-1',
  eventDate: '1945-09-02',
  description: 'Declaration of independence.',
};

describe('HeritageTimelineService', () => {
  let service: HeritageTimelineService;

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

    service = module.get(HeritageTimelineService);
  });

  it('should return timeline by id', async () => {
    mockRepo.findById.mockResolvedValue(mockTimeline);

    await expect(service.getTimelineById('timeline-1')).resolves.toEqual(mockTimeline);
  });

  it('should throw when timeline not found', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(service.getTimelineById('missing')).rejects.toThrow(BadRequestException);
  });

  it('should return timelines by heritage id', async () => {
    mockRepo.findByHeritageId.mockResolvedValue([mockTimeline]);

    await expect(service.getTimelinesByHeritageId('heritage-1')).resolves.toEqual([mockTimeline]);
  });

  it('should create timeline', async () => {
    const dto = {
      heritageId: 'heritage-1',
      eventDate: '1945-09-02',
      description: 'Declaration of independence.',
    };
    mockRepo.create.mockResolvedValue({ id: 'timeline-1', ...dto });

    await expect(service.createTimeline(dto)).resolves.toEqual({ id: 'timeline-1', ...dto });
  });

  it('should update timeline', async () => {
    mockRepo.findById.mockResolvedValueOnce(mockTimeline).mockResolvedValueOnce({
      ...mockTimeline,
      description: 'Updated.',
    });
    mockRepo.update.mockResolvedValue(undefined);

    await expect(service.updateTimeline('timeline-1', { description: 'Updated.' })).resolves.toEqual({
      ...mockTimeline,
      description: 'Updated.',
    });
  });

  it('should delete timeline', async () => {
    mockRepo.findById.mockResolvedValue(mockTimeline);
    mockRepo.delete.mockResolvedValue(undefined);

    await expect(service.deleteTimeline('timeline-1')).resolves.toEqual({
      message: 'Timeline event deleted successfully',
    });
  });
});
