import { Test, TestingModule } from '@nestjs/testing';
import { DiscussController } from './controller';
import { DiscussService } from './service';

describe('DiscussController', () => {
  let controller: DiscussController;
  let discussService: jest.Mocked<DiscussService>;

  const mockDiscuss = {
    id: 'discuss-1',
    heritageId: 'heritage-1',
    parentId: null,
    userId: 'user-1',
    content: 'Hello world',
    commentLeft: 1,
    commentRight: 2,
    isDeleted: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    user: {
      id: 'user-1',
      displayName: 'Test User',
      avatar: 'avatar.jpg',
    },
  };

  beforeEach(async () => {
    const mockDiscussService = {
      createNew: jest.fn(),
      getByParentId: jest.fn(),
      deleteNestedById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiscussController],
      providers: [
        { provide: DiscussService, useValue: mockDiscussService },
      ],
    }).compile();

    controller = module.get<DiscussController>(DiscussController);
    discussService = module.get(DiscussService);

    jest.clearAllMocks();
  });

  describe('POST /', () => {
    it('should call service.createNew with dto and return Response.Created', async () => {
      const dto: any = {
        heritageId: 'heritage-1',
        parentId: undefined,
        userId: 'user-1',
        content: 'New discuss',
      };
      discussService.createNew.mockResolvedValue(mockDiscuss as any);

      const result = await controller.createNew(dto);

      expect(discussService.createNew).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ data: mockDiscuss });
    });

    it('should propagate Error from service', async () => {
      discussService.createNew.mockRejectedValue(new Error('Failed to create Discuss'));

      const dto = { heritageId: 'h1', userId: 'u1', content: 'fail' } as any;

      await expect(controller.createNew(dto)).rejects.toThrow('Failed to create Discuss');
    });
  });

  describe('GET /', () => {
    it('should call service.getByParentId with query params and return Response.OK', async () => {
      discussService.getByParentId.mockResolvedValue([mockDiscuss]);

      const result = await controller.getByParentId('parent-1', 'heritage-1');

      expect(discussService.getByParentId).toHaveBeenCalledWith('parent-1', 'heritage-1');
      expect(result).toEqual({ data: [mockDiscuss] });
    });

    it('should handle undefined parentId', async () => {
      discussService.getByParentId.mockResolvedValue([mockDiscuss]);

      const result = await controller.getByParentId(undefined as any, 'heritage-1');

      expect(discussService.getByParentId).toHaveBeenCalledWith(undefined, 'heritage-1');
      expect(result).toEqual({ data: [mockDiscuss] });
    });

    it('should propagate NotFoundException from service', async () => {
      discussService.getByParentId.mockRejectedValue(new Error('Discusses not found'));

      await expect(
        controller.getByParentId('nonexistent', 'heritage-1'),
      ).rejects.toThrow('Discusses not found');
    });
  });

  describe('DELETE /', () => {
    it('should call service.deleteNestedById with query params and return Response.OK', async () => {
      const deleteResult = { deletedCount: 2 };
      discussService.deleteNestedById.mockResolvedValue(deleteResult);

      const result = await controller.deleteNested('heritage-1', 'discuss-1');

      expect(discussService.deleteNestedById).toHaveBeenCalledWith('heritage-1', 'discuss-1');
      expect(result).toEqual({ data: deleteResult });
    });

    it('should propagate NotFoundException from service', async () => {
      discussService.deleteNestedById.mockRejectedValue(new Error('Discuss not found'));

      await expect(
        controller.deleteNested('heritage-1', 'nonexistent'),
      ).rejects.toThrow('Discuss not found');
    });
  });
});
