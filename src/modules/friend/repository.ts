import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { FriendshipModel, FriendshipStatus } from './model';

@Injectable()
export class FriendshipRepository {
  constructor(
    @InjectRepository(FriendshipModel)
    private readonly repo: Repository<FriendshipModel>,
  ) {}

  async findById(id: string): Promise<FriendshipModel | null> {
    return this.repo.findOne({ where: { id } });
  }

  /** Tìm quan hệ giữa 2 user theo cả 2 chiều (bất kể status) */
  async findBetween(a: string, b: string): Promise<FriendshipModel | null> {
    return this.repo.findOne({
      where: [
        { requesterId: a, addresseeId: b },
        { requesterId: b, addresseeId: a },
      ],
    });
  }

  /** Tất cả quan hệ liên quan tới user (mọi chiều, mọi status) */
  async findAllForUser(userId: string): Promise<FriendshipModel[]> {
    return this.repo.find({
      where: [{ requesterId: userId }, { addresseeId: userId }],
      order: { updatedAt: 'DESC' },
    });
  }

  /** Quan hệ giữa 1 user và một danh sách user (để annotate kết quả search) */
  async findForUserAgainst(
    userId: string,
    otherIds: string[],
  ): Promise<FriendshipModel[]> {
    if (otherIds.length === 0) return [];
    return this.repo
      .createQueryBuilder('f')
      .where(
        new Brackets((qb) => {
          qb.where('f.requesterId = :userId AND f.addresseeId IN (:...ids)', {
            userId,
            ids: otherIds,
          }).orWhere('f.addresseeId = :userId AND f.requesterId IN (:...ids)', {
            userId,
            ids: otherIds,
          });
        }),
      )
      .getMany();
  }

  async listByStatus(
    userId: string,
    status: FriendshipStatus,
    role?: 'requester' | 'addressee',
  ): Promise<FriendshipModel[]> {
    if (role === 'requester') {
      return this.repo.find({ where: { requesterId: userId, status }, order: { updatedAt: 'DESC' } });
    }
    if (role === 'addressee') {
      return this.repo.find({ where: { addresseeId: userId, status }, order: { updatedAt: 'DESC' } });
    }
    return this.repo.find({
      where: [
        { requesterId: userId, status },
        { addresseeId: userId, status },
      ],
      order: { updatedAt: 'DESC' },
    });
  }

  async areFriends(a: string, b: string): Promise<boolean> {
    const count = await this.repo.count({
      where: [
        { requesterId: a, addresseeId: b, status: FriendshipStatus.ACCEPTED },
        { requesterId: b, addresseeId: a, status: FriendshipStatus.ACCEPTED },
      ],
    });
    return count > 0;
  }

  async create(data: Partial<FriendshipModel>): Promise<FriendshipModel> {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: Partial<FriendshipModel>): Promise<FriendshipModel | null> {
    await this.repo.update(id, data);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  /** Số lời mời đang chờ mình xử lý */
  async countIncomingPending(userId: string): Promise<number> {
    return this.repo.count({
      where: { addresseeId: userId, status: FriendshipStatus.PENDING },
    });
  }
}
