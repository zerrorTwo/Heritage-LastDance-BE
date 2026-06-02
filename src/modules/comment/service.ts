import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CommentRepository } from './repository';
import { UserRepository } from '../user/repository';
import { CommentModel, CommentStatus } from './model';
import { CreateCommentDto, UpdateCommentDto } from './dto/comment.dto';

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  heritageId?: string;
}

@Injectable()
export class CommentService {
  constructor(
    private readonly commentRepo: CommentRepository,
    private readonly userRepo: UserRepository,
  ) {}

  /** Lấy danh sách bình luận với phân trang */
  async getAll(query: PaginationQuery) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const [comments, totalCount] = await this.commentRepo.findAllWithPagination({
      heritageId: query.heritageId,
      search: query.search,
      status: CommentStatus.ACTIVE,
      sort: query.sort || 'createdAt',
      order: (query.order?.toUpperCase() as 'ASC' | 'DESC') || 'DESC',
      skip,
      limit,
    });

    const totalPages = Math.ceil(totalCount / limit);

    return {
      comments: comments.map((c) => this.formatComment(c)),
      pagination: {
        totalItems: totalCount,
        currentPage: page,
        totalPages,
        itemsPerPage: limit,
      },
    };
  }

  /** Lấy bình luận theo ID */
  async getCommentById(id: string) {
    const comment = await this.commentRepo.findById(id);
    if (!comment) throw new NotFoundException('Comment not found!');
    if (comment.status !== CommentStatus.ACTIVE)
      throw new ForbiddenException('Comment is not active!');
    return this.formatComment(comment);
  }

  /** Tạo bình luận mới */
  async createNew(dto: CreateCommentDto, userId: string) {
    // Kiểm tra user tồn tại
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundException('User not found!');

    const comment = await this.commentRepo.create({
      heritageId: dto.heritageId,
      userId,
      displayName: user.displayname ?? null,
      avatar: user.avatar,
      content: dto.content,
      images: dto.images ?? [],
      rating: dto.rating ?? null,
    });

    return this.formatComment(comment);
  }

  /** Cập nhật bình luận (chỉ người tạo mới được sửa) */
  async updateComment(id: string, dto: UpdateCommentDto, userId: string) {
    const comment = await this.commentRepo.findById(id);
    if (!comment) throw new NotFoundException('Comment not found!');
    if (comment.userId !== userId)
      throw new ForbiddenException('You are not allowed to update this comment!');

    const updateData: Partial<CommentModel> = {};
    if (dto.content !== undefined) updateData.content = dto.content;
    if (dto.rating !== undefined) updateData.rating = dto.rating;
    if (dto.images !== undefined) updateData.images = JSON.stringify(dto.images);

    const updated = await this.commentRepo.update(id, updateData);
    return this.formatComment(updated!);
  }

  /** Xóa mềm bình luận (cập nhật status = DELETED) */
  async deleteComment(id: string, userId: string) {
    const comment = await this.commentRepo.findById(id);
    if (!comment) throw new NotFoundException('Comment not found!');
    if (comment.userId !== userId)
      throw new ForbiddenException('You are not allowed to delete this comment!');

    await this.commentRepo.update(id, { status: CommentStatus.DELETED });
    return { deletedResult: 'Comment was deleted' };
  }

  /** Toggle like bình luận */
  async likeComment(commentId: string, userId: string) {
    const comment = await this.commentRepo.findById(commentId);
    if (!comment) throw new NotFoundException('Comment not found!');

    const likes: string[] = this.parseLikes(comment.likes);
    const hasLiked = likes.includes(userId);

    const updatedLikes = hasLiked
      ? likes.filter((id) => id !== userId)
      : [...likes, userId];

    const updated = await this.commentRepo.update(commentId, {
      likes: JSON.stringify(updatedLikes),
      likesCount: updatedLikes.length,
    });

    return this.formatComment(updated!);
  }

  // ---- Helpers ----
  private parseLikes(raw: string): string[] {
    try {
      return JSON.parse(raw ?? '[]') as string[];
    } catch {
      return [];
    }
  }

  private parseImages(raw: string): string[] {
    try {
      return JSON.parse(raw ?? '[]') as string[];
    } catch {
      return [];
    }
  }

  private formatComment(comment: CommentModel) {
    return {
      ...comment,
      _id: comment.id,
      likes: this.parseLikes(comment.likes),
      images: this.parseImages(comment.images),
      user: {
        id: comment.userId,
        displayName: comment.displayName,
        avatar: comment.avatar,
      },
    };
  }
}
