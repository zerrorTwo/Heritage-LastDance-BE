import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { CreateDiscussData, DiscussModel } from './model';
import { UserModel } from '../user/model';

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
  ): Promise<any[]> {
    // Dùng entity query để TypeORM tự map cột (snake_case) -> tránh lỗi raw alias.
    const items = await this.repo.find({
      where: {
        heritageId,
        isDeleted: false,
        parentId: parentId ? parentId : IsNull(),
      },
      order: { commentLeft: 'ASC' },
    });

    // Nạp thông tin người dùng cho các comment
    const userIds = [...new Set(items.map((i) => i.userId).filter(Boolean))];
    const users = userIds.length
      ? await this.dataSource
          .getRepository(UserModel)
          .find({ where: { id: In(userIds) } })
      : [];
    const byId = new Map(users.map((u) => [u.id, u]));

    return items.map((d) => {
      const u = byId.get(d.userId);
      return {
        id: d.id,
        heritageId: d.heritageId,
        parentId: d.parentId,
        userId: d.userId,
        content: d.content,
        commentLeft: d.commentLeft,
        commentRight: d.commentRight,
        createdAt: d.createdAt,
        user: u
          ? { id: u.id, displayName: u.displayname, email: u.email, avatar: u.avatar }
          : null,
      };
    });
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
