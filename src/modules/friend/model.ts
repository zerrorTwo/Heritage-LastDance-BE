import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export enum FriendshipStatus {
  /** Đã gửi lời mời, chờ đối phương phản hồi */
  PENDING = 'PENDING',
  /** Đã là bạn bè */
  ACCEPTED = 'ACCEPTED',
  /** Đã từ chối (giữ lại để có thể gửi lại) */
  DECLINED = 'DECLINED',
}

/**
 * Quan hệ bạn bè giữa 2 user.
 * - requesterId: người gửi lời mời
 * - addresseeId: người nhận lời mời
 * Khi ACCEPTED, quan hệ là 2 chiều (bạn của nhau).
 */
@Entity('friendships')
@Unique('uq_friendship_pair', ['requesterId', 'addresseeId'])
@Index('idx_friendship_requester', ['requesterId'])
@Index('idx_friendship_addressee', ['addresseeId'])
@Index('idx_friendship_status', ['status'])
export class FriendshipModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  requesterId!: string;

  @Column({ type: 'varchar', length: 36 })
  addresseeId!: string;

  @Column({ type: 'enum', enum: FriendshipStatus, default: FriendshipStatus.PENDING })
  status!: FriendshipStatus;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
