import { Test, TestingModule } from '@nestjs/testing';
import { HeritageRelationController } from './controller';
import { HeritageRelationService } from './service';

const mockRelation = {
  id: '1',
  fromId: 'h1',
  toId: 'h2',
  type: 'related',
};

describe('HeritageRelationController', () => {
  let controller: HeritageRelationController;
  let service: HeritageRelationService;

  const mockService = {
    getRelationById: jest.fn(),
    getRelationsByFromId: jest.fn(),
    getRelationsByToId: jest.fn(),
    createRelation: jest.fn(),
    updateRelation: jest.fn(),
    deleteRelation: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HeritageRelationController],
      providers: [
        { provide: HeritageRelationService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<HeritageRelationController>(HeritageRelationController);
    service = module.get<HeritageRelationService>(HeritageRelationService);
  });

  describe('getRelation', () => {
    it('should call service.getRelationById with correct id', async () => {
      mockService.getRelationById.mockResolvedValue(mockRelation);

      const result = await controller.getRelation('1');

      expect(service.getRelationById).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockRelation);
    });
  });

  describe('getRelationsByFromId', () => {
    it('should call service.getRelationsByFromId with correct fromId', async () => {
      mockService.getRelationsByFromId.mockResolvedValue([mockRelation]);

      const result = await controller.getRelationsByFromId('h1');

      expect(service.getRelationsByFromId).toHaveBeenCalledWith('h1');
      expect(result).toEqual([mockRelation]);
    });
  });

  describe('getRelationsByToId', () => {
    it('should call service.getRelationsByToId with correct toId', async () => {
      mockService.getRelationsByToId.mockResolvedValue([mockRelation]);

      const result = await controller.getRelationsByToId('h2');

      expect(service.getRelationsByToId).toHaveBeenCalledWith('h2');
      expect(result).toEqual([mockRelation]);
    });
  });

  describe('createRelation', () => {
    it('should call service.createRelation with dto', async () => {
      const dto = { fromId: 'h1', toId: 'h3', type: 'related' };
      mockService.createRelation.mockResolvedValue({ id: '2', ...dto });

      const result = await controller.createRelation(dto as any);

      expect(service.createRelation).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: '2', ...dto });
    });
  });

  describe('updateRelation', () => {
    it('should call service.updateRelation with id and dto', async () => {
      const dto = { type: 'parent' };
      mockService.updateRelation.mockResolvedValue({ ...mockRelation, ...dto });

      const result = await controller.updateRelation('1', dto as any);

      expect(service.updateRelation).toHaveBeenCalledWith('1', dto);
      expect(result).toEqual({ ...mockRelation, ...dto });
    });
  });

  describe('deleteRelation', () => {
    it('should call service.deleteRelation with correct id', async () => {
      mockService.deleteRelation.mockResolvedValue({ message: 'Relation deleted successfully' });

      const result = await controller.deleteRelation('1');

      expect(service.deleteRelation).toHaveBeenCalledWith('1');
      expect(result).toEqual({ message: 'Relation deleted successfully' });
    });
  });
});
