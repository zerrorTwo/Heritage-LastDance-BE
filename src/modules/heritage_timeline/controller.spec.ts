import { Test, TestingModule } from '@nestjs/testing';
import { HeritageTimelineController } from './controller';
import { HeritageTimelineService } from './service';

const mockTimeline = {
  id: 'timeline-1',
  heritageId: 'heritage-1',
  eventDate: '1945-09-02',
  description: 'Declaration of independence.',
};

describe('HeritageTimelineController', () => {
  let controller: HeritageTimelineController;
  let service: jest.Mocked<HeritageTimelineService>;

  const mockService = {
    getTimelineById: jest.fn(),
    getTimelinesByHeritageId: jest.fn(),
    createTimeline: jest.fn(),
    updateTimeline: jest.fn(),
    deleteTimeline: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HeritageTimelineController],
      providers: [{ provide: HeritageTimelineService, useValue: mockService }],
    }).compile();

    controller = module.get(HeritageTimelineController);
    service = module.get(HeritageTimelineService);
  });

  it('should get timeline by id', async () => {
    service.getTimelineById.mockResolvedValue(mockTimeline as any);

    await expect(controller.getTimeline('timeline-1')).resolves.toEqual(mockTimeline);
    expect(service.getTimelineById).toHaveBeenCalledWith('timeline-1');
  });

  it('should get timelines by heritage id', async () => {
    service.getTimelinesByHeritageId.mockResolvedValue([mockTimeline] as any);

    await expect(controller.getTimelinesByHeritage('heritage-1')).resolves.toEqual([mockTimeline]);
    expect(service.getTimelinesByHeritageId).toHaveBeenCalledWith('heritage-1');
  });

  it('should create timeline', async () => {
    const dto = { heritageId: 'heritage-1', eventDate: '1945-09-02', description: 'Created.' };
    service.createTimeline.mockResolvedValue({ id: 'timeline-1', ...dto } as any);

    await expect(controller.createTimeline(dto)).resolves.toEqual({ id: 'timeline-1', ...dto });
    expect(service.createTimeline).toHaveBeenCalledWith(dto);
  });

  it('should update timeline', async () => {
    service.updateTimeline.mockResolvedValue({ ...mockTimeline, description: 'Updated.' } as any);

    await expect(controller.updateTimeline('timeline-1', { description: 'Updated.' })).resolves.toEqual({
      ...mockTimeline,
      description: 'Updated.',
    });
  });

  it('should delete timeline', async () => {
    service.deleteTimeline.mockResolvedValue({ message: 'Timeline event deleted successfully' });

    await expect(controller.deleteTimeline('timeline-1')).resolves.toEqual({
      message: 'Timeline event deleted successfully',
    });
  });
});
