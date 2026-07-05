import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Discuss dùng thuật toán Nested Set (comment_left / comment_right)
 * để quản lý bình luận dạng cây lồng nhau.
 */
@Entity('discusses')
@Index('idx_discusses_heritage_id', ['heritageId'])
@Index('idx_discusses_parent_id', ['parentId'])
@Index('idx_discusses_user_id', ['userId'])
@Index('idx_discusses_nested_set', ['commentLeft', 'commentRight'])
export class DiscussModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** ID di tích liên quan */
  @Column({ type: 'varchar', length: 36 })
  heritageId!: string;

  /** ID bình luận cha (null nếu là root) */
  @Column({ type: 'varchar', length: 36, nullable: true })
  parentId!: string | null;

  /** ID người dùng */
  @Column({ type: 'varchar', length: 36 })
  userId!: string;

  /** Nội dung bình luận */
  @Column({ type: 'text' })
  content!: string;

  /** Nested Set – giá trị left */
  @Column({ type: 'int', default: 0 })
  commentLeft!: number;

  /** Nested Set – giá trị right */
  @Column({ type: 'int', default: 0 })
  commentRight!: number;

  /** Đánh dấu xóa mềm */
  @Column({ type: 'boolean', default: false })
  isDeleted!: boolean;

  // timestamptz: lưu mốc tuyệt đối (UTC) -> FE hiển thị đúng múi giờ local
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

// ---- Interfaces ----
export interface CreateDiscussData {
  heritageId: string;
  parentId?: string | null;
  userId: string;
  content: string;
}
