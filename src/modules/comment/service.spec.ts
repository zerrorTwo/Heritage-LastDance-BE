import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CommentService, PaginationQuery } from './service';
import { CommentRepository } from './repository';
import { UserRepository } from '../user/repository';
import { CommentStatus } from './model';

describe('CommentService', () => {
  let service: CommentService;
  let commentRepo: jest.Mocked<CommentRepository>;
  let userRepo: jest.Mocked<UserRepository>;

  const mockComment = {
    id: 'comment-1',
    heritageId: 'heritage-1',
    userId: 'user-1',
    displayName: 'Test User',
    avatar: 'avatar.jpg',
    content: 'Great place!',
    likes: JSON.stringify(['user-2', 'user-3']),
    likesCount: 2,
    rating: 4,
    images: JSON.stringify(['img1.jpg', 'img2.jpg']),
    status: CommentStatus.ACTIVE,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockUser = {
    id: 'user-1',
    displayName: 'Test User',
    avatar: 'avatar.jpg',
  };

  beforeEach(async () => {
    const mockCommentRepo = {
      findById: jest.fn(),
      findAllWithPagination: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const mockUserRepo = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentService,
        { provide: CommentRepository, useValue: mockCommentRepo },
        { provide: UserRepository, useValue: mockUserRepo },
      ],
    }).compile();

    service = module.get<CommentService>(CommentService);
    commentRepo = module.get(CommentRepository);
    userRepo = module.get(UserRepository);

    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return formatted comments with pagination (default params)', async () => {
      commentRepo.findAllWithPagination.mockResolvedValue([[mockComment], 1]);

      const result = await service.getAll({});

      expect(commentRepo.findAllWithPagination).toHaveBeenCalledWith({
        heritageId: undefined,
        search: undefined,
        status: CommentStatus.ACTIVE,
        sort: 'createdAt',
        order: 'DESC',
        skip: 0,
        limit: 10,
      });
      expect(result.comments).toHaveLength(1);
      expect(result.comments[0].id).toBe('comment-1');
      expect(result.comments[0].likes).toEqual(['user-2', 'user-3']);
      expect(result.comments[0].images).toEqual(['img1.jpg', 'img2.jpg']);
      expect(result.pagination).toEqual({
        totalItems: 1,
        currentPage: 1,
        totalPages: 1,
        itemsPerPage: 10,
      });
    });

    it('should apply custom page, limit, sort, order, heritageId, search', async () => {
      commentRepo.findAllWithPagination.mockResolvedValue([[], 0]);

      const query: PaginationQuery = {
        page: 3,
        limit: 5,
        sort: 'rating',
        order: 'asc',
        heritageId: 'heritage-123',
        search: 'beautiful',
      };

      await service.getAll(query);

      expect(commentRepo.findAllWithPagination).toHaveBeenCalledWith({
        heritageId: 'heritage-123',
        search: 'beautiful',
        status: CommentStatus.ACTIVE,
        sort: 'rating',
        order: 'ASC',
        skip: 10,
        limit: 5,
      });
    });

    it('should default order to DESC when not provided', async () => {
      commentRepo.findAllWithPagination.mockResolvedValue([[], 0]);

      await service.getAll({});

      expect(commentRepo.findAllWithPagination).toHaveBeenCalledWith(
        expect.objectContaining({ order: 'DESC' }),
      );
    });

    it('should calculate totalPages with ceil division', async () => {
      commentRepo.findAllWithPagination.mockResolvedValue([[mockComment], 5]);

      const result = await service.getAll({ limit: 2 } as any);

      expect(result.pagination.totalPages).toBe(3);
    });
  });

  describe('getCommentById', () => {
    it('should return formatted comment when found and active', async () => {
      commentRepo.findById.mockResolvedValue({ ...mockComment });

      const result = await service.getCommentById('comment-1');

      expect(result.id).toBe('comment-1');
      expect(result.likes).toEqual(['user-2', 'user-3']);
      expect(result.images).toEqual(['img1.jpg', 'img2.jpg']);
    });

    it('should throw NotFoundException when comment not found', async () => {
      commentRepo.findById.mockResolvedValue(null);

      await expect(service.getCommentById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when comment status is not ACTIVE', async () => {
      commentRepo.findById.mockResolvedValue({
        ...mockComment,
        status: CommentStatus.DELETED,
      });

      await expect(service.getCommentById('comment-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when comment status is INACTIVE', async () => {
      commentRepo.findById.mockResolvedValue({
        ...mockComment,
        status: CommentStatus.INACTIVE,
      });

      await expect(service.getCommentById('comment-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('createNew', () => {
    it('should create a new comment successfully', async () => {
      userRepo.findById.mockResolvedValue(mockUser as any);
      commentRepo.create.mockResolvedValue({
        ...mockComment,
        id: 'new-comment',
        likes: '[]',
        likesCount: 0,
        images: '[]',
      });

      const dto = {
        heritageId: 'heritage-1',
        content: 'Nice!',
        rating: 5,
        images: ['img.jpg'],
      };

      const result = await service.createNew(dto, 'user-1');

      expect(userRepo.findById).toHaveBeenCalledWith('user-1');
      expect(commentRepo.create).toHaveBeenCalledWith({
        heritageId: 'heritage-1',
        userId: 'user-1',
        displayName: 'Test User',
        avatar: 'avatar.jpg',
        content: 'Nice!',
        images: ['img.jpg'],
        rating: 5,
      });
      expect(result.id).toBe('new-comment');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      userRepo.findById.mockResolvedValue(null);

      await expect(
        service.createNew(
          { heritageId: 'h1', content: 'test' } as any,
          'nonexistent-user',
        ),
      ).rejects.toThrow(NotFoundException);

      expect(commentRepo.create).not.toHaveBeenCalled();
    });

    it('should use displayname fallback when displayName is null', async () => {
      userRepo.findById.mockResolvedValue({
        id: 'user-1',
        displayName: null,
        displayname: 'Lowercase Name',
        avatar: null,
      } as any);
      commentRepo.create.mockResolvedValue({
        ...mockComment,
        id: 'new-comment',
      });

      const dto = { heritageId: 'heritage-1', content: 'test' };
      await service.createNew(dto as any, 'user-1');

      expect(commentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          displayName: 'Lowercase Name',
          avatar: null,
        }),
      );
    });

    it('should default images to empty array and rating to null', async () => {
      userRepo.findById.mockResolvedValue(mockUser as any);
      commentRepo.create.mockResolvedValue({
        ...mockComment,
        id: 'new-comment',
      });

      const dto = { heritageId: 'heritage-1', content: 'simple' };
      await service.createNew(dto as any, 'user-1');

      expect(commentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          images: [],
          rating: null,
        }),
      );
    });
  });

  describe('updateComment', () => {
    it('should update comment when owner makes request', async () => {
      commentRepo.findById.mockResolvedValue({ ...mockComment });
      commentRepo.update.mockResolvedValue({
        ...mockComment,
        content: 'Updated content',
        rating: 5,
        images: JSON.stringify(['new.jpg']),
      });

      const dto = { content: 'Updated content', rating: 5, images: ['new.jpg'] };
      const result = await service.updateComment('comment-1', dto, 'user-1');

      expect(commentRepo.update).toHaveBeenCalledWith('comment-1', {
        content: 'Updated content',
        rating: 5,
        images: JSON.stringify(['new.jpg']),
      });
      expect(result.content).toBe('Updated content');
    });

    it('should throw NotFoundException when comment not found', async () => {
      commentRepo.findById.mockResolvedValue(null);

      await expect(
        service.updateComment('nonexistent', {} as any, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when non-owner tries to update', async () => {
      commentRepo.findById.mockResolvedValue({ ...mockComment, userId: 'owner-99' });

      await expect(
        service.updateComment('comment-1', {} as any, 'user-1'),
      ).rejects.toThrow(ForbiddenException);

      expect(commentRepo.update).not.toHaveBeenCalled();
    });

    it('should only update provided fields', async () => {
      commentRepo.findById.mockResolvedValue({ ...mockComment });
      commentRepo.update.mockResolvedValue({ ...mockComment, rating: 3 });
      const dto = { rating: 3 };

      await service.updateComment('comment-1', dto, 'user-1');

      expect(commentRepo.update).toHaveBeenCalledWith('comment-1', {
        rating: 3,
      });
    });
  });

  describe('deleteComment', () => {
    it('should soft-delete comment when owner makes request', async () => {
      commentRepo.findById.mockResolvedValue({ ...mockComment });
      commentRepo.update.mockResolvedValue(null);

      const result = await service.deleteComment('comment-1', 'user-1');

      expect(commentRepo.update).toHaveBeenCalledWith('comment-1', {
        status: CommentStatus.DELETED,
      });
      expect(result).toEqual({ deletedResult: 'Comment was deleted' });
    });

    it('should throw NotFoundException when comment not found', async () => {
      commentRepo.findById.mockResolvedValue(null);

      await expect(
        service.deleteComment('nonexistent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when non-owner tries to delete', async () => {
      commentRepo.findById.mockResolvedValue({ ...mockComment, userId: 'owner-99' });

      await expect(
        service.deleteComment('comment-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);

      expect(commentRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('likeComment', () => {
    it('should add like for user who has not liked before', async () => {
      commentRepo.findById.mockResolvedValue({
        ...mockComment,
        likes: JSON.stringify(['user-2']),
        likesCount: 1,
      });
      commentRepo.update.mockResolvedValue({
        ...mockComment,
        likes: JSON.stringify(['user-2', 'user-1']),
        likesCount: 2,
      });

      const result = await service.likeComment('comment-1', 'user-1');

      expect(commentRepo.update).toHaveBeenCalledWith(
        'comment-1',
        expect.objectContaining({
          likes: JSON.stringify(['user-2', 'user-1']),
          likesCount: 2,
        }),
      );
      expect(result.likes).toEqual(['user-2', 'user-1']);
    });

    it('should remove like for user who already liked', async () => {
      commentRepo.findById.mockResolvedValue({
        ...mockComment,
        likes: JSON.stringify(['user-2', 'user-1']),
        likesCount: 2,
      });
      commentRepo.update.mockResolvedValue({
        ...mockComment,
        likes: JSON.stringify(['user-2']),
        likesCount: 1,
      });

      const result = await service.likeComment('comment-1', 'user-1');

      expect(commentRepo.update).toHaveBeenCalledWith(
        'comment-1',
        expect.objectContaining({
          likes: JSON.stringify(['user-2']),
          likesCount: 1,
        }),
      );
      expect(result.likes).toEqual(['user-2']);
    });

    it('should throw NotFoundException when comment not found', async () => {
      commentRepo.findById.mockResolvedValue(null);

      await expect(
        service.likeComment('nonexistent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle empty likes string', async () => {
      commentRepo.findById.mockResolvedValue({
        ...mockComment,
        likes: '',
        likesCount: 0,
      });
      commentRepo.update.mockResolvedValue({
        ...mockComment,
        likes: JSON.stringify(['user-1']),
        likesCount: 1,
      });

      const result = await service.likeComment('comment-1', 'user-1');

      expect(commentRepo.update).toHaveBeenCalledWith(
        'comment-1',
        expect.objectContaining({
          likes: JSON.stringify(['user-1']),
          likesCount: 1,
        }),
      );
      expect(result.likes).toEqual(['user-1']);
    });
  });
});
