import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CommentModel,
  CommentStatus,
  CreateCommentData,
  FindAllCommentsOpts,
  ICommentRepository,
} from './model';

@Injectable()
export class CommentRepository implements ICommentRepository {
  constructor(
    @InjectRepository(CommentModel)
    private readonly repo: Repository<CommentModel>,
  ) {}

  async findById(id: string): Promise<CommentModel | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findAllWithPagination(
    opts: FindAllCommentsOpts,
  ): Promise<[CommentModel[], number]> {
    const {
      heritageId,
      search,
      status = CommentStatus.ACTIVE,
      sort = 'createdAt',
      order = 'DESC',
      skip,
      limit,
    } = opts;

    const qb = this.repo.createQueryBuilder('comment');

    qb.where('comment.status = :status', { status });

    if (heritageId) {
      qb.andWhere('comment.heritageId = :heritageId', { heritageId });
    }

    if (search) {
      qb.andWhere('comment.content LIKE :search', { search: `%${search}%` });
    }

    qb.orderBy(`comment.${sort}`, order).skip(skip).take(limit);

    return qb.getManyAndCount();
  }

  async create(data: CreateCommentData): Promise<CommentModel> {
    const entity = this.repo.create({
      heritageId: data.heritageId,
      userId: data.userId,
      displayName: data.displayName,
      avatar: data.avatar,
      content: data.content,
      images: JSON.stringify(data.images ?? []),
      likes: JSON.stringify([]),
      likesCount: 0,
      rating: data.rating ?? null,
      status: CommentStatus.ACTIVE,
    });
    return this.repo.save(entity);
  }

  async update(
    id: string,
    data: Partial<CommentModel>,
  ): Promise<CommentModel | null> {
    await this.repo.update(id, data);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
