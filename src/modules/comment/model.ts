import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum CommentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DELETED = 'DELETED',
}

@Entity('comments')
@Index('idx_comments_heritage_id', ['heritageId'])
@Index('idx_comments_user_id', ['userId'])
@Index('idx_comments_status', ['status'])
export class CommentModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** ID của di tích mà bình luận thuộc về */
  @Column({ type: 'varchar', length: 36 })
  heritageId!: string;

  /** ID của người tạo bình luận */
  @Column({ type: 'varchar', length: 36 })
  userId!: string;

  /** Tên hiển thị của người tạo bình luận (snapshot) */
  @Column({ type: 'varchar', length: 100, nullable: true })
  displayName!: string | null;

  /** Ảnh đại diện của người tạo bình luận (snapshot) */
  @Column({ type: 'text', nullable: true })
  avatar!: string | null;

  /** Nội dung bình luận */
  @Column({ type: 'text' })
  content!: string;

  /** Danh sách userId đã like (lưu dưới dạng JSON string) */
  @Column({ type: 'text' })
  likes!: string;

  /** Số lượt like */
  @Column({ type: 'int', default: 0 })
  likesCount!: number;

  /** Đánh giá (1–5) */
  @Column({ type: 'float', nullable: true })
  rating!: number | null;

  /** Danh sách URL hình ảnh (JSON string) */
  @Column({ type: 'text' })
  images!: string;

  @Column({
    type: 'enum',
    enum: CommentStatus,
    default: CommentStatus.ACTIVE,
  })
  status!: CommentStatus;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}

// ---- Interfaces & DTOs ----
export interface ICommentRepository {
  findById(id: string): Promise<CommentModel | null>;
  findAllWithPagination(opts: FindAllCommentsOpts): Promise<[CommentModel[], number]>;
  create(data: CreateCommentData): Promise<CommentModel>;
  update(id: string, data: Partial<CommentModel>): Promise<CommentModel | null>;
  delete(id: string): Promise<void>;
}

export interface FindAllCommentsOpts {
  heritageId?: string;
  search?: string;
  status?: CommentStatus;
  sort?: string;
  order?: 'ASC' | 'DESC';
  skip: number;
  limit: number;
}

export interface CreateCommentData {
  heritageId: string;
  userId: string;
  displayName: string | null;
  avatar: string | null;
  content: string;
  images?: string[];
  rating?: number | null;
}
