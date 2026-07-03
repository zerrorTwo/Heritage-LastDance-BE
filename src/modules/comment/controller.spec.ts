import { Test, TestingModule } from '@nestjs/testing';
import { CommentController } from './controller';
import { CommentService } from './service';
import { CommentStatus } from './model';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CloudinaryProvider } from '../../providers/cloudinary.provider';

describe('CommentController', () => {
  let controller: CommentController;
  let commentService: jest.Mocked<CommentService>;

  const mockFormattedComment = {
    id: 'comment-1',
    _id: 'comment-1',
    heritageId: 'heritage-1',
    userId: 'user-1',
    displayName: 'Test User',
    avatar: 'avatar.jpg',
    user: {
      id: 'user-1',
      displayName: 'Test User',
      avatar: 'avatar.jpg',
    },
    content: 'Great place!',
    likes: ['user-2', 'user-3'],
    likesCount: 2,
    rating: 4,
    images: ['img1.jpg', 'img2.jpg'],
    status: CommentStatus.ACTIVE,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const mockCommentService = {
      getAll: jest.fn(),
      getCommentById: jest.fn(),
      createNew: jest.fn(),
      updateComment: jest.fn(),
      deleteComment: jest.fn(),
      likeComment: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentController],
      providers: [
        { provide: CommentService, useValue: mockCommentService },
        { provide: CloudinaryProvider, useValue: { uploadStream: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<CommentController>(CommentController);
    commentService = module.get(CommentService);

    jest.clearAllMocks();
  });

  describe('GET /', () => {
    it('should call service.getAll with query and return Response.OK', async () => {
      const query = { page: 1, limit: 10 };
      const serviceResult = {
        comments: [mockFormattedComment],
        pagination: { totalItems: 1, currentPage: 1, totalPages: 1, itemsPerPage: 10 },
      };
      commentService.getAll.mockResolvedValue(serviceResult);

      const result = await controller.getAll(query);

      expect(commentService.getAll).toHaveBeenCalledWith(query);
      expect(result).toEqual({ data: serviceResult });
    });

    it('should pass empty query to service', async () => {
      commentService.getAll.mockResolvedValue({ comments: [], pagination: {} as any });

      const result = await controller.getAll({});

      expect(commentService.getAll).toHaveBeenCalledWith({});
      expect(result).toEqual({
        data: { comments: [], pagination: {} },
      });
    });
  });

  describe('GET :id', () => {
    it('should call service.getCommentById and return Response.OK', async () => {
      commentService.getCommentById.mockResolvedValue(mockFormattedComment);

      const result = await controller.getCommentById('comment-1');

      expect(commentService.getCommentById).toHaveBeenCalledWith('comment-1');
      expect(result).toEqual({ data: mockFormattedComment });
    });

    it('should propagate NotFoundException from service', async () => {
      commentService.getCommentById.mockRejectedValue(new Error('Not found'));

      await expect(controller.getCommentById('nonexistent')).rejects.toThrow('Not found');
    });
  });

  describe('POST /', () => {
    it('should call service.createNew with dto and userId from req.user', async () => {
      const dto = {
        heritageId: 'heritage-1',
        content: 'Nice place!',
        rating: 5,
        images: ['img.jpg'],
      };
      const req = { user: { userId: 'user-1' } };
      commentService.createNew.mockResolvedValue(mockFormattedComment);

      const result = await controller.createNew(dto, [], req);

      expect(commentService.createNew).toHaveBeenCalledWith(dto, 'user-1');
      expect(result).toEqual({ data: mockFormattedComment });
    });
  });

  describe('PUT :id', () => {
    it('should call service.updateComment with id, dto, and userId', async () => {
      const id = 'comment-1';
      const dto = { content: 'Updated content', rating: 4 };
      const req = { user: { userId: 'user-1' } };
      commentService.updateComment.mockResolvedValue({
        ...mockFormattedComment,
        ...dto,
      });

      const result = await controller.updateComment(id, dto, req);

      expect(commentService.updateComment).toHaveBeenCalledWith(id, dto, 'user-1');
      expect(result).toEqual({
        data: { ...mockFormattedComment, ...dto },
      });
    });

    it('should propagate ForbiddenException from service', async () => {
      commentService.updateComment.mockRejectedValue(new Error('Forbidden'));

      await expect(
        controller.updateComment('comment-1', {}, { user: { userId: 'hacker' } }),
      ).rejects.toThrow('Forbidden');
    });
  });

  describe('DELETE :id', () => {
    it('should call service.deleteComment with id and userId', async () => {
      const req = { user: { userId: 'user-1' } };
      const serviceResult = { deletedResult: 'Comment was deleted' };
      commentService.deleteComment.mockResolvedValue(serviceResult);

      const result = await controller.deleteComment('comment-1', req);

      expect(commentService.deleteComment).toHaveBeenCalledWith('comment-1', 'user-1');
      expect(result).toEqual({ data: serviceResult });
    });
  });

  describe('POST :id/like', () => {
    it('should call service.likeComment with id and userId', async () => {
      const req = { user: { userId: 'user-1' } };
      commentService.likeComment.mockResolvedValue({
        ...mockFormattedComment,
        likes: ['user-2', 'user-3', 'user-1'],
        likesCount: 3,
      });

      const result = await controller.likeComment('comment-1', req);

      expect(commentService.likeComment).toHaveBeenCalledWith('comment-1', 'user-1');
      expect(result).toEqual({
        data: expect.objectContaining({ likesCount: 3 }),
      });
    });
  });
});
