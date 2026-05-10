import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { HeritageRelationService } from './service';
import { HeritageRelationRepository } from './repository';

const mockRelation = {
  id: '1',
  fromId: 'h1',
  toId: 'h2',
  type: 'related',
};

const mockRelations = [mockRelation];

describe('HeritageRelationService', () => {
  let service: HeritageRelationService;
  let repo: HeritageRelationRepository;

  const mockRepo = {
    findById: jest.fn(),
    findByFromId: jest.fn(),
    findByToId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HeritageRelationService,
        { provide: HeritageRelationRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<HeritageRelationService>(HeritageRelationService);
    repo = module.get<HeritageRelationRepository>(HeritageRelationRepository);
  });

  describe('getRelationById', () => {
    it('should return relation when found by id', async () => {
      mockRepo.findById.mockResolvedValue(mockRelation);

      const result = await service.getRelationById('1');

      expect(repo.findById).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockRelation);
    });

    it('should throw BadRequestException when relation not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.getRelationById('999')).rejects.toThrow(BadRequestException);
      expect(repo.findById).toHaveBeenCalledWith('999');
    });
  });

  describe('getRelationsByFromId', () => {
    it('should return relations for given fromId', async () => {
      mockRepo.findByFromId.mockResolvedValue(mockRelations);

      const result = await service.getRelationsByFromId('h1');

      expect(repo.findByFromId).toHaveBeenCalledWith('h1');
      expect(result).toEqual(mockRelations);
    });

    it('should return empty array when no relations found for fromId', async () => {
      mockRepo.findByFromId.mockResolvedValue([]);

      const result = await service.getRelationsByFromId('h99');

      expect(result).toEqual([]);
    });
  });

  describe('getRelationsByToId', () => {
    it('should return relations for given toId', async () => {
      mockRepo.findByToId.mockResolvedValue(mockRelations);

      const result = await service.getRelationsByToId('h2');

      expect(repo.findByToId).toHaveBeenCalledWith('h2');
      expect(result).toEqual(mockRelations);
    });

    it('should return empty array when no relations found for toId', async () => {
      mockRepo.findByToId.mockResolvedValue([]);

      const result = await service.getRelationsByToId('h99');

      expect(result).toEqual([]);
    });
  });

  describe('createRelation', () => {
    it('should create and return new relation', async () => {
      const dto = { fromId: 'h1', toId: 'h3', type: 'related' };
      mockRepo.create.mockResolvedValue({ id: '2', ...dto });

      const result = await service.createRelation(dto as any);

      expect(repo.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: '2', ...dto });
    });
  });

  describe('updateRelation', () => {
    it('should update and return updated relation', async () => {
      const dto = { type: 'parent' };
      const updated = { ...mockRelation, ...dto };
      mockRepo.findById.mockResolvedValueOnce(mockRelation);
      mockRepo.update.mockResolvedValue(undefined);
      mockRepo.findById.mockResolvedValueOnce(updated);

      const result = await service.updateRelation('1', dto as any);

      expect(repo.findById).toHaveBeenCalledWith('1');
      expect(repo.update).toHaveBeenCalledWith('1', dto);
      expect(result).toEqual(updated);
    });

    it('should throw BadRequestException when updating non-existent relation', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.updateRelation('999', {} as any)).rejects.toThrow(BadRequestException);
      expect(repo.findById).toHaveBeenCalledWith('999');
    });
  });

  describe('deleteRelation', () => {
    it('should delete relation and return success message', async () => {
      mockRepo.findById.mockResolvedValue(mockRelation);
      mockRepo.delete.mockResolvedValue(undefined);

      const result = await service.deleteRelation('1');

      expect(repo.findById).toHaveBeenCalledWith('1');
      expect(repo.delete).toHaveBeenCalledWith('1');
      expect(result).toEqual({ message: 'Relation deleted successfully' });
    });

    it('should throw BadRequestException when deleting non-existent relation', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.deleteRelation('999')).rejects.toThrow(BadRequestException);
      expect(repo.findById).toHaveBeenCalledWith('999');
    });
  });
});
