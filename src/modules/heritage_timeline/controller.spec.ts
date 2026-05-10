import { Test, TestingModule } from '@nestjs/testing';
import { HeritageTimelineController } from './controller';
import { HeritageTimelineService } from './service';

const mockTimeline = {
  id: '1',
  heritageId: 'h1',
  year: 1900,
  event: 'Test Event',
};

describe('HeritageTimelineController', () => {
  let controller: HeritageTimelineController;
  let service: HeritageTimelineService;

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
      providers: [
        { provide: HeritageTimelineService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<HeritageTimelineController>(HeritageTimelineController);
    service = module.get<HeritageTimelineService>(HeritageTimelineService);
  });

  describe('getTimeline', () => {
    it('should call service.getTimelineById with correct id', async () => {
      mockService.getTimelineById.mockResolvedValue(mockTimeline);

      const result = await controller.getTimeline('1');

      expect(service.getTimelineById).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockTimeline);
    });
  });

  describe('getTimelinesByHeritage', () => {
    it('should call service.getTimelinesByHeritageId with correct heritageId', async () => {
      mockService.getTimelinesByHeritageId.mockResolvedValue([mockTimeline]);

      const result = await controller.getTimelinesByHeritage('h1');

      expect(service.getTimelinesByHeritageId).toHaveBeenCalledWith('h1');
      expect(result).toEqual([mockTimeline]);
    });
  });

  describe('createTimeline', () => {
    it('should call service.createTimeline with dto', async () => {
      const dto = { heritageId: 'h1', year: 2000, event: 'New Event' };
      mockService.createTimeline.mockResolvedValue({ id: '2', ...dto });

      const result = await controller.createTimeline(dto as any);

      expect(service.createTimeline).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: '2', ...dto });
    });
  });

  describe('updateTimeline', () => {
    it('should call service.updateTimeline with id and dto', async () => {
      const dto = { event: 'Updated' };
      mockService.updateTimeline.mockResolvedValue({ ...mockTimeline, ...dto });

      const result = await controller.updateTimeline('1', dto as any);

      expect(service.updateTimeline).toHaveBeenCalledWith('1', dto);
      expect(result).toEqual({ ...mockTimeline, ...dto });
    });
  });

  describe('deleteTimeline', () => {
    it('should call service.deleteTimeline with correct id', async () => {
      mockService.deleteTimeline.mockResolvedValue({ message: 'Timeline event deleted successfully' });

      const result = await controller.deleteTimeline('1');

      expect(service.deleteTimeline).toHaveBeenCalledWith('1');
      expect(result).toEqual({ message: 'Timeline event deleted successfully' });
    });
  });
});
