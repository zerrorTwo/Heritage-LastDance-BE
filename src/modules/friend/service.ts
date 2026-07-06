import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { FriendshipRepository } from './repository';
import { FriendshipModel, FriendshipStatus } from './model';
import { UserModel } from '../user/model';

/** Trạng thái quan hệ giữa user hiện tại và 1 user khác (dùng cho UI) */
export type RelationStatus =
  | 'NONE'
  | 'FRIENDS'
  | 'REQUEST_SENT'
  | 'REQUEST_RECEIVED';

interface UserBrief {
  id: string;
  displayname: string | null;
  avatar: string | null;
  email?: string | null;
}

@Injectable()
export class FriendService {
  constructor(
    private readonly friendshipRepo: FriendshipRepository,
    @InjectRepository(UserModel)
    private readonly userRepo: Repository<UserModel>,
  ) {}

  private toBrief(u: UserModel): UserBrief {
    return { id: u.id, displayname: u.displayname, avatar: u.avatar, email: u.email };
  }

  private relationOf(
    meId: string,
    f: FriendshipModel | undefined,
  ): { status: RelationStatus; friendshipId: string | null } {
    if (!f) return { status: 'NONE', friendshipId: null };
    if (f.status === FriendshipStatus.ACCEPTED)
      return { status: 'FRIENDS', friendshipId: f.id };
    if (f.status === FriendshipStatus.PENDING) {
      return {
        status: f.requesterId === meId ? 'REQUEST_SENT' : 'REQUEST_RECEIVED',
        friendshipId: f.id,
      };
    }
    return { status: 'NONE', friendshipId: f.id };
  }

  /** Tìm user theo tên/email (loại bản thân), kèm trạng thái quan hệ. */
  async searchUsers(meId: string, q?: string): Promise<
    Array<UserBrief & { status: RelationStatus; friendshipId: string | null }>
  > {
    const qb = this.userRepo
      .createQueryBuilder('user')
      .where('user.id != :meId', { meId })
      .andWhere('user.isActive = true');

    const term = (q ?? '').trim();
    if (term) {
      qb.andWhere(
        new Brackets((b) => {
          b.where('LOWER(user.displayname) LIKE LOWER(:t)', { t: `%${term}%` }).orWhere(
            'LOWER(user.email) LIKE LOWER(:t)',
            { t: `%${term}%` },
          );
        }),
      );
    }

    const users = await qb.orderBy('user.displayname', 'ASC').take(20).getMany();
    if (users.length === 0) return [];

    const rels = await this.friendshipRepo.findForUserAgainst(
      meId,
      users.map((u) => u.id),
    );
    const relByOther = new Map<string, FriendshipModel>();
    for (const f of rels) {
      const otherId = f.requesterId === meId ? f.addresseeId : f.requesterId;
      relByOther.set(otherId, f);
    }

    return users.map((u) => ({
      ...this.toBrief(u),
      ...this.relationOf(meId, relByOther.get(u.id)),
    }));
  }

  /** Gửi lời mời kết bạn. Nếu đối phương đã mời mình trước -> tự động thành bạn. */
  async sendRequest(meId: string, addresseeId: string) {
    if (!addresseeId) throw new BadRequestException('Thiếu người nhận');
    if (meId === addresseeId)
      throw new BadRequestException('Không thể tự kết bạn với chính mình');

    const target = await this.userRepo.findOne({ where: { id: addresseeId } });
    if (!target) throw new NotFoundException('Người dùng không tồn tại');

    const existing = await this.friendshipRepo.findBetween(meId, addresseeId);
    if (existing) {
      if (existing.status === FriendshipStatus.ACCEPTED) {
        throw new BadRequestException('Hai bạn đã là bạn bè');
      }
      if (existing.status === FriendshipStatus.PENDING) {
        // Đối phương đã mời mình trước -> chấp nhận luôn
        if (existing.addresseeId === meId) {
          const updated = await this.friendshipRepo.update(existing.id, {
            status: FriendshipStatus.ACCEPTED,
          });
          return { friendship: updated, autoAccepted: true };
        }
        throw new BadRequestException('Đã gửi lời mời, đang chờ phản hồi');
      }
      // DECLINED trước đó -> mở lại lời mời từ phía mình
      const reopened = await this.friendshipRepo.update(existing.id, {
        requesterId: meId,
        addresseeId,
        status: FriendshipStatus.PENDING,
      });
      return { friendship: reopened, autoAccepted: false };
    }

    const created = await this.friendshipRepo.create({
      requesterId: meId,
      addresseeId,
      status: FriendshipStatus.PENDING,
    });
    return { friendship: created, autoAccepted: false };
  }

  /** Chấp nhận / từ chối lời mời mình nhận được. */
  async respondRequest(meId: string, friendshipId: string, accept: boolean) {
    const f = await this.friendshipRepo.findById(friendshipId);
    if (!f) throw new NotFoundException('Lời mời không tồn tại');
    if (f.addresseeId !== meId)
      throw new ForbiddenException('Bạn không có quyền xử lý lời mời này');
    if (f.status !== FriendshipStatus.PENDING)
      throw new BadRequestException('Lời mời đã được xử lý');

    const updated = await this.friendshipRepo.update(friendshipId, {
      status: accept ? FriendshipStatus.ACCEPTED : FriendshipStatus.DECLINED,
    });
    return updated;
  }

  /** Huỷ kết bạn hoặc thu hồi lời mời (xoá hẳn quan hệ). */
  async removeFriendship(meId: string, friendshipId: string) {
    const f = await this.friendshipRepo.findById(friendshipId);
    if (!f) throw new NotFoundException('Quan hệ không tồn tại');
    if (f.requesterId !== meId && f.addresseeId !== meId)
      throw new ForbiddenException('Bạn không có quyền');
    await this.friendshipRepo.delete(friendshipId);
    return { success: true };
  }

  /** Huỷ kết bạn theo userId đối phương (tiện cho FE). */
  async removeByUser(meId: string, otherUserId: string) {
    const f = await this.friendshipRepo.findBetween(meId, otherUserId);
    if (!f) return { success: true };
    return this.removeFriendship(meId, f.id);
  }

  /** Danh sách bạn bè (ACCEPTED) kèm profile đối phương. */
  async listFriends(meId: string) {
    const rels = await this.friendshipRepo.listByStatus(
      meId,
      FriendshipStatus.ACCEPTED,
    );
    const otherIds = rels.map((f) =>
      f.requesterId === meId ? f.addresseeId : f.requesterId,
    );
    const users = await this.loadUsers(otherIds);
    return rels.map((f) => {
      const otherId = f.requesterId === meId ? f.addresseeId : f.requesterId;
      const u = users.get(otherId);
      return {
        friendshipId: f.id,
        userId: otherId,
        displayname: u?.displayname ?? null,
        email: u?.email ?? null,
        avatar: u?.avatar ?? null,
        since: f.updatedAt,
      };
    });
  }

  /** Lời mời mình NHẬN (đang chờ mình phản hồi). */
  async listIncomingRequests(meId: string) {
    const rels = await this.friendshipRepo.listByStatus(
      meId,
      FriendshipStatus.PENDING,
      'addressee',
    );
    const users = await this.loadUsers(rels.map((f) => f.requesterId));
    return rels.map((f) => {
      const u = users.get(f.requesterId);
      return {
        friendshipId: f.id,
        userId: f.requesterId,
        displayname: u?.displayname ?? null,
        email: u?.email ?? null,
        avatar: u?.avatar ?? null,
        createdAt: f.createdAt,
      };
    });
  }

  /** Lời mời mình ĐÃ GỬI (đang chờ đối phương). */
  async listOutgoingRequests(meId: string) {
    const rels = await this.friendshipRepo.listByStatus(
      meId,
      FriendshipStatus.PENDING,
      'requester',
    );
    const users = await this.loadUsers(rels.map((f) => f.addresseeId));
    return rels.map((f) => {
      const u = users.get(f.addresseeId);
      return {
        friendshipId: f.id,
        userId: f.addresseeId,
        displayname: u?.displayname ?? null,
        email: u?.email ?? null,
        avatar: u?.avatar ?? null,
        createdAt: f.createdAt,
      };
    });
  }

  async getOverview(meId: string) {
    const [friends, incoming, outgoing] = await Promise.all([
      this.listFriends(meId),
      this.listIncomingRequests(meId),
      this.listOutgoingRequests(meId),
    ]);
    return { friends, incoming, outgoing, incomingCount: incoming.length };
  }

  /** Dùng cho DM gating. */
  async areFriends(a: string, b: string): Promise<boolean> {
    return this.friendshipRepo.areFriends(a, b);
  }

  private async loadUsers(ids: string[]): Promise<Map<string, UserModel>> {
    const map = new Map<string, UserModel>();
    const unique = [...new Set(ids)].filter(Boolean);
    if (unique.length === 0) return map;
    const users = await this.userRepo
      .createQueryBuilder('user')
      .where('user.id IN (:...ids)', { ids: unique })
      .getMany();
    for (const u of users) map.set(u.id, u);
    return map;
  }
}
