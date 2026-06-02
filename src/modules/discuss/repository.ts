import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateDiscussData, DiscussModel, DiscussWithUser } from './model';

interface DiscussRawRow {
  d_id?: string;
  id: string;
  d_heritageId?: string;
  heritageId: string;
  d_parentId?: string;
  parentId: string | null;
  d_userId?: string;
  userId: string;
  d_content?: string;
  content: string;
  d_commentLeft?: number;
  commentLeft: number;
  d_commentRight?: number;
  commentRight: number;
  d_createdAt?: Date;
  createdAt: Date;
  user_id: string;
  user_displayName: string;
  user_avatar: string;
}

@Injectable()
export class DiscussRepository {
  constructor(
    @InjectRepository(DiscussModel)
    private readonly repo: Repository<DiscussModel>,
    private readonly dataSource: DataSource,
  ) {}

  async findById(id: string): Promise<DiscussModel | null> {
    return this.repo.findOne({ where: { id } });
  }

  /**
   * Tạo bình luận mới với thuật toán Nested Set.
   * Nếu có parentId thì chèn vào cây con của parent,
   * ngược lại thêm vào cuối cây của heritageId.
   */
  async createNew(data: CreateDiscussData): Promise<DiscussModel> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(DiscussModel);

      let leftValue: number;

      if (data.parentId) {
        // Tìm parent
        const parent = await repo.findOne({ where: { id: data.parentId } });
        if (!parent) throw new Error('Parent comment not found');

        leftValue = parent.commentRight;

        // Dịch các node có left >= parent.right sang phải 2 đơn vị
        await repo
          .createQueryBuilder()
          .update(DiscussModel)
          .set({ commentLeft: () => 'comment_left + 2' })
          .where('comment_left >= :leftValue', { leftValue })
          .execute();

        await repo
          .createQueryBuilder()
          .update(DiscussModel)
          .set({ commentRight: () => 'comment_right + 2' })
          .where('comment_right >= :leftValue', { leftValue })
          .execute();
      } else {
        // Tìm max right trong heritageId
        const maxNode = await repo.findOne({
          where: { heritageId: data.heritageId },
          order: { commentRight: 'DESC' },
        });
        leftValue = maxNode ? maxNode.commentRight + 1 : 1;
      }

      const entity = repo.create({
        heritageId: data.heritageId,
        parentId: data.parentId ?? null,
        userId: data.userId,
        content: data.content,
        commentLeft: leftValue,
        commentRight: leftValue + 1,
        isDeleted: false,
      });

      return repo.save(entity);
    });
  }

  /**
   * Lấy danh sách bình luận theo parentId + heritageId.
   * Nếu parentId = null → lấy các root comment.
   * Kết quả được join với bảng users để lấy tên, avatar.
   */
  async getByParentId(
    parentId: string | null,
    heritageId: string,
  ): Promise<DiscussWithUser[]> {
    const qb = this.repo
      .createQueryBuilder('d')
      .select([
        'd.id AS id',
        'd.heritageId AS heritageId',
        'd.parentId AS parentId',
        'd.userId AS userId',
        'd.content AS content',
        'd.commentLeft AS commentLeft',
        'd.commentRight AS commentRight',
        'd.createdAt AS createdAt',
      ])
      .addSelect(['u.id AS user_id', 'u.displayName AS user_displayName', 'u.avatar AS user_avatar'])
      .leftJoin('users', 'u', 'u.id = d.userId')
      .where('d.heritageId = :heritageId', { heritageId })
      .andWhere('d.isDeleted = :isDeleted', { isDeleted: false })
      .orderBy('d.commentLeft', 'ASC');

    if (parentId) {
      qb.andWhere('d.parentId = :parentId', { parentId });
    } else {
      qb.andWhere('d.parentId IS NULL');
    }

    const rows: DiscussRawRow[] = await qb.getRawMany();

    return rows.map((row) => ({
      id: row['d_id'] ?? row['id'],
      heritageId: row['d_heritageId'] ?? row['heritageId'],
      parentId: row['d_parentId'] ?? row['parentId'],
      userId: row['d_userId'] ?? row['userId'],
      content: row['d_content'] ?? row['content'],
      commentLeft: row['d_commentLeft'] ?? row['commentLeft'],
      commentRight: row['d_commentRight'] ?? row['commentRight'],
      createdAt: row['d_createdAt'] ?? row['createdAt'],
      user: {
        id: row['user_id'],
        displayName: row['user_displayName'],
        avatar: row['user_avatar'],
      },
    }));
  }

  /**
   * Xóa nested discuss và cập nhật lại cây Nested Set.
   */
  async deleteNested(heritageId: string, discussId: string): Promise<{ deletedCount: number }> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(DiscussModel);

      const discuss = await repo.findOne({ where: { id: discussId } });
      if (!discuss) return { deletedCount: 0 };

      const left = discuss.commentLeft;
      const right = discuss.commentRight;
      const width = right - left + 1;

      // Xóa tất cả node trong range [left, right] thuộc heritageId
      const result = await repo
        .createQueryBuilder()
        .delete()
        .from(DiscussModel)
        .where('heritageId = :heritageId', { heritageId })
        .andWhere('comment_left >= :left', { left })
        .andWhere('comment_left <= :right', { right })
        .execute();

      // Cập nhật lại cây: dịch các node bên phải sang trái
      await repo
        .createQueryBuilder()
        .update(DiscussModel)
        .set({ commentLeft: () => `comment_left - ${width}` })
        .where('heritageId = :heritageId', { heritageId })
        .andWhere('comment_left > :right', { right })
        .execute();

      await repo
        .createQueryBuilder()
        .update(DiscussModel)
        .set({ commentRight: () => `comment_right - ${width}` })
        .where('heritageId = :heritageId', { heritageId })
        .andWhere('comment_right > :right', { right })
        .execute();

      return { deletedCount: result.affected ?? 0 };
    });
  }

  async update(id: string, data: Partial<DiscussModel>): Promise<DiscussModel | null> {
    await this.repo.update(id, data);
    return this.findById(id);
  }
}
