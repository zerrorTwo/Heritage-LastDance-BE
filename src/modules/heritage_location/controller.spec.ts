import { Test, TestingModule } from '@nestjs/testing';
import { HeritageLocationController } from './controller';
import { HeritageLocationService } from './service';

const mockLocation = {
  id: '1',
  heritageId: 'h1',
  latitude: 10.123,
  longitude: 106.456,
  name: 'Test Location',
};

describe('HeritageLocationController', () => {
  let controller: HeritageLocationController;
  let service: HeritageLocationService;

  const mockService = {
    getLocationById: jest.fn(),
    getLocationsByHeritageId: jest.fn(),
    createLocation: jest.fn(),
    updateLocation: jest.fn(),
    deleteLocation: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HeritageLocationController],
      providers: [
        { provide: HeritageLocationService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<HeritageLocationController>(HeritageLocationController);
    service = module.get<HeritageLocationService>(HeritageLocationService);
  });

  describe('getLocation', () => {
    it('should call service.getLocationById with correct id', async () => {
      mockService.getLocationById.mockResolvedValue(mockLocation);

      const result = await controller.getLocation('1');

      expect(service.getLocationById).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockLocation);
    });
  });

  describe('getLocationsByHeritage', () => {
    it('should call service.getLocationsByHeritageId with correct heritageId', async () => {
      mockService.getLocationsByHeritageId.mockResolvedValue([mockLocation]);

      const result = await controller.getLocationsByHeritage('h1');

      expect(service.getLocationsByHeritageId).toHaveBeenCalledWith('h1');
      expect(result).toEqual([mockLocation]);
    });
  });

  describe('createLocation', () => {
    it('should call service.createLocation with dto', async () => {
      const dto = { heritageId: 'h1', latitude: 10.5, longitude: 106.7, name: 'New' };
      mockService.createLocation.mockResolvedValue({ id: '2', ...dto });

      const result = await controller.createLocation(dto as any);

      expect(service.createLocation).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: '2', ...dto });
    });
  });

  describe('updateLocation', () => {
    it('should call service.updateLocation with id and dto', async () => {
      const dto = { name: 'Updated' };
      mockService.updateLocation.mockResolvedValue({ ...mockLocation, ...dto });

      const result = await controller.updateLocation('1', dto as any);

      expect(service.updateLocation).toHaveBeenCalledWith('1', dto);
      expect(result).toEqual({ ...mockLocation, ...dto });
    });
  });

  describe('deleteLocation', () => {
    it('should call service.deleteLocation with correct id', async () => {
      mockService.deleteLocation.mockResolvedValue({ message: 'Location deleted successfully' });

      const result = await controller.deleteLocation('1');

      expect(service.deleteLocation).toHaveBeenCalledWith('1');
      expect(result).toEqual({ message: 'Location deleted successfully' });
    });
  });
});
