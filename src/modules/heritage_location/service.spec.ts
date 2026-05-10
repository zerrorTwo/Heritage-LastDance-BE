import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { HeritageLocationService } from './service';
import { HeritageLocationRepository } from './repository';

const mockLocation = {
  id: '1',
  heritageId: 'h1',
  latitude: 10.123,
  longitude: 106.456,
  name: 'Test Location',
};

const mockLocations = [mockLocation];

describe('HeritageLocationService', () => {
  let service: HeritageLocationService;
  let repo: HeritageLocationRepository;

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
        HeritageLocationService,
        { provide: HeritageLocationRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<HeritageLocationService>(HeritageLocationService);
    repo = module.get<HeritageLocationRepository>(HeritageLocationRepository);
  });

  describe('getLocationById', () => {
    it('should return location when found by id', async () => {
      mockRepo.findById.mockResolvedValue(mockLocation);

      const result = await service.getLocationById('1');

      expect(repo.findById).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockLocation);
    });

    it('should throw BadRequestException when location not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.getLocationById('999')).rejects.toThrow(BadRequestException);
      expect(repo.findById).toHaveBeenCalledWith('999');
    });
  });

  describe('getLocationsByHeritageId', () => {
    it('should return locations for given heritageId', async () => {
      mockRepo.findByHeritageId.mockResolvedValue(mockLocations);

      const result = await service.getLocationsByHeritageId('h1');

      expect(repo.findByHeritageId).toHaveBeenCalledWith('h1');
      expect(result).toEqual(mockLocations);
    });

    it('should return empty array when no locations found', async () => {
      mockRepo.findByHeritageId.mockResolvedValue([]);

      const result = await service.getLocationsByHeritageId('h99');

      expect(result).toEqual([]);
    });
  });

  describe('createLocation', () => {
    it('should create and return new location', async () => {
      const dto = { heritageId: 'h1', latitude: 10.5, longitude: 106.7, name: 'New Location' };
      mockRepo.create.mockResolvedValue({ id: '2', ...dto });

      const result = await service.createLocation(dto as any);

      expect(repo.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: '2', ...dto });
    });
  });

  describe('updateLocation', () => {
    it('should update and return updated location', async () => {
      const dto = { name: 'Updated Location' };
      const updated = { ...mockLocation, ...dto };
      mockRepo.findById.mockResolvedValueOnce(mockLocation);
      mockRepo.update.mockResolvedValue(undefined);
      mockRepo.findById.mockResolvedValueOnce(updated);

      const result = await service.updateLocation('1', dto as any);

      expect(repo.findById).toHaveBeenCalledWith('1');
      expect(repo.update).toHaveBeenCalledWith('1', dto);
      expect(result).toEqual(updated);
    });

    it('should throw BadRequestException when updating non-existent location', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.updateLocation('999', {} as any)).rejects.toThrow(BadRequestException);
      expect(repo.findById).toHaveBeenCalledWith('999');
    });
  });

  describe('deleteLocation', () => {
    it('should delete location and return success message', async () => {
      mockRepo.findById.mockResolvedValue(mockLocation);
      mockRepo.delete.mockResolvedValue(undefined);

      const result = await service.deleteLocation('1');

      expect(repo.findById).toHaveBeenCalledWith('1');
      expect(repo.delete).toHaveBeenCalledWith('1');
      expect(result).toEqual({ message: 'Location deleted successfully' });
    });

    it('should throw BadRequestException when deleting non-existent location', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.deleteLocation('999')).rejects.toThrow(BadRequestException);
      expect(repo.findById).toHaveBeenCalledWith('999');
    });
  });
});
