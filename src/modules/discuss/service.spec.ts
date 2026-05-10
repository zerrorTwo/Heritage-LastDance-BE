import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DiscussService } from './service';
import { DiscussRepository } from './repository';

describe('DiscussService', () => {
  let service: DiscussService;
  let discussRepo: jest.Mocked<DiscussRepository>;

  const mockDiscuss = {
    id: 'discuss-1',
    heritageId: 'heritage-1',
    parentId: null,
    userId: 'user-1',
    content: 'Interesting topic',
    commentLeft: 1,
    commentRight: 2,
    isDeleted: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockDiscussWithUser = {
    id: 'discuss-1',
    heritageId: 'heritage-1',
    parentId: null,
    userId: 'user-1',
    content: 'Interesting topic',
    commentLeft: 1,
    commentRight: 2,
    createdAt: new Date('2024-01-01'),
    user: {
      id: 'user-1',
      displayName: 'Test User',
      avatar: 'avatar.jpg',
    },
  };

  beforeEach(async () => {
    const mockDiscussRepo = {
      findById: jest.fn(),
      createNew: jest.fn(),
      getByParentId: jest.fn(),
      deleteNested: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscussService,
        { provide: DiscussRepository, useValue: mockDiscussRepo },
      ],
    }).compile();

    service = module.get<DiscussService>(DiscussService);
    discussRepo = module.get(DiscussRepository);

    jest.clearAllMocks();
  });

  describe('createNew', () => {
    it('should create a new discuss and return it', async () => {
      const dto = {
        heritageId: 'heritage-1',
        parentId: undefined,
        userId: 'user-1',
        content: 'Hello!',
      };
      discussRepo.createNew.mockResolvedValue(mockDiscuss);

      const result = await service.createNew(dto);

      expect(discussRepo.createNew).toHaveBeenCalledWith({
        heritageId: 'heritage-1',
        parentId: null,
        userId: 'user-1',
        content: 'Hello!',
      });
      expect(result).toEqual(mockDiscuss);
    });

    it('should pass parentId to repo.createNew when provided', async () => {
      const dto = {
        heritageId: 'heritage-1',
        parentId: 'parent-discuss-1',
        userId: 'user-1',
        content: 'Reply!',
      };
      discussRepo.createNew.mockResolvedValue({
        ...mockDiscuss,
        parentId: 'parent-discuss-1',
      });

      await service.createNew(dto);

      expect(discussRepo.createNew).toHaveBeenCalledWith({
        heritageId: 'heritage-1',
        parentId: 'parent-discuss-1',
        userId: 'user-1',
        content: 'Reply!',
      });
    });

    it('should throw Error when repo.createNew returns falsy', async () => {
      discussRepo.createNew.mockResolvedValue(null as any);
      const dto = {};
      await expect(service.createNew(dto as any)).rejects.toThrow(
        'Failed to create Discuss',
      );
    });

    it('should throw Error when repo.createNew returns undefined', async () => {
      discussRepo.createNew.mockResolvedValue(undefined as any);
      const dto = {};
      await expect(service.createNew(dto as any)).rejects.toThrow(
        'Failed to create Discuss',
      );
    });

    it('should default parentId to null when not provided in dto', async () => {
      const dto: any = {
        heritageId: 'heritage-1',
        userId: 'user-1',
        content: 'no parentId',
      };
      discussRepo.createNew.mockResolvedValue(mockDiscuss);

      await service.createNew(dto);

      expect(discussRepo.createNew).toHaveBeenCalledWith(
        expect.objectContaining({ parentId: null }),
      );
    });
  });

  describe('getByParentId', () => {
    it('should return discuss list by parentId', async () => {
      discussRepo.getByParentId.mockResolvedValue([mockDiscussWithUser]);

      const result = await service.getByParentId('parent-1', 'heritage-1');

      expect(discussRepo.getByParentId).toHaveBeenCalledWith('parent-1', 'heritage-1');
      expect(result).toEqual([mockDiscussWithUser]);
    });

    it('should convert undefined parentId to null', async () => {
      discussRepo.getByParentId.mockResolvedValue([mockDiscussWithUser]);

      await service.getByParentId(undefined, 'heritage-1');

      expect(discussRepo.getByParentId).toHaveBeenCalledWith(null, 'heritage-1');
    });

    it('should throw NotFoundException when result is falsy', async () => {
      (discussRepo.getByParentId as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getByParentId('parent-1', 'heritage-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when result is undefined', async () => {
      (discussRepo.getByParentId as jest.Mock).mockResolvedValue(undefined);

      await expect(
        service.getByParentId('parent-1', 'heritage-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteNestedById', () => {
    it('should delete discuss when it exists', async () => {
      const deleteResult = { deletedCount: 3 };
      discussRepo.findById.mockResolvedValue(mockDiscuss);
      discussRepo.deleteNested.mockResolvedValue(deleteResult);

      const result = await service.deleteNestedById('heritage-1', 'discuss-1');

      expect(discussRepo.findById).toHaveBeenCalledWith('discuss-1');
      expect(discussRepo.deleteNested).toHaveBeenCalledWith('heritage-1', 'discuss-1');
      expect(result).toEqual(deleteResult);
    });

    it('should throw NotFoundException when discuss not found', async () => {
      discussRepo.findById.mockResolvedValue(null);

      await expect(
        service.deleteNestedById('heritage-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);

      expect(discussRepo.deleteNested).not.toHaveBeenCalled();
    });

    it('should pass deletedCount = 0 through', async () => {
      discussRepo.findById.mockResolvedValue(mockDiscuss);
      discussRepo.deleteNested.mockResolvedValue({ deletedCount: 0 });

      const result = await service.deleteNestedById('heritage-1', 'discuss-1');

      expect(result).toEqual({ deletedCount: 0 });
    });
  });
});
