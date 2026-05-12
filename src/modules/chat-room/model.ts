import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// =================== ChatRoom ===================

export enum ChatRoomType {
  HERITAGE = 'HERITAGE',
  DIRECT = 'DIRECT',
}

export enum ChatRoomStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Entity('chat_rooms')
@Index('idx_chat_rooms_heritage_id', ['heritageId'])
@Index('idx_chat_rooms_type', ['type'])
export class ChatRoomModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  /** ID di tích (chỉ áp dụng cho loại HERITAGE) */
  @Column({ type: 'varchar', length: 36, nullable: true })
  heritageId!: string | null;

  @Column({ type: 'enum', enum: ChatRoomType, default: ChatRoomType.HERITAGE })
  type!: ChatRoomType;

  /**
   * Danh sách userId tham gia (JSON string array).
   * DIRECT room chỉ có tối đa 2 userId.
   */
  @Column({ type: 'text' })
  participants!: string;

  @Column({ type: 'enum', enum: ChatRoomStatus, default: ChatRoomStatus.ACTIVE })
  status!: ChatRoomStatus;

  /**
   * Tin nhắn cuối cùng (JSON string):
   * { content, userId, username, sentAt }
   */
  @Column({ type: 'text', nullable: true })
  lastMessage!: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}

// =================== ChatRoomParticipant ===================

export enum ParticipantStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  AWAY = 'AWAY',
}

@Entity('chat_room_participants')
@Index('idx_participants_room_user', ['chatRoomId', 'userId'])
@Index('idx_participants_user_id', ['userId'])
export class ChatRoomParticipantModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  chatRoomId!: string;

  @Column({ type: 'varchar', length: 36 })
  userId!: string;

  @Column({ type: 'varchar', length: 100, default: 'Khách' })
  username!: string;

  @Column({ type: 'enum', enum: ParticipantStatus, default: ParticipantStatus.OFFLINE })
  status!: ParticipantStatus;

  @Column({ type: 'timestamp', nullable: true })
  lastActive!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  joinedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}

// =================== Message ===================

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  FILE = 'FILE',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
  SYSTEM = 'SYSTEM',
}

export enum MessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  DELETED = 'DELETED',
}

@Entity('messages')
@Index('idx_messages_chat_room_id', ['chatRoomId'])
@Index('idx_messages_user_id', ['userId'])
export class MessageModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  chatRoomId!: string;

  @Column({ type: 'varchar', length: 36 })
  userId!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'enum', enum: MessageType, default: MessageType.TEXT })
  type!: MessageType;

  @Column({ type: 'enum', enum: MessageStatus, default: MessageStatus.SENT })
  status!: MessageStatus;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
