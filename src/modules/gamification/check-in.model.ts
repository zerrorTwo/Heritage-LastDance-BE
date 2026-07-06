import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Mỗi lần điểm danh tại một di tích (B1) — đồng thời là một "con tem" trong
 * Hộ chiếu di sản (B2).
 */
@Entity('heritage_check_ins')
@Index('idx_check_ins_user', ['userId'])
@Index('idx_check_ins_user_heritage', ['userId', 'heritageId'])
export class CheckInModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  userId!: string;

  @Column({ type: 'varchar', length: 64 })
  heritageId!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  heritageTitle!: string | null;

  // Snapshot thông tin người check-in (để hiện feed cộng đồng, khỏi join bảng User)
  @Column({ type: 'varchar', length: 120, nullable: true })
  displayName!: string | null;

  @Column({ type: 'text', nullable: true })
  avatarUrl!: string | null;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  lat!: number | null;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  lng!: number | null;

  // Ảnh bằng chứng (Cloudinary URL) — không bắt buộc, không auto-verify nội dung.
  @Column({ type: 'text', nullable: true })
  photoUrl!: string | null;

  // Khoảng cách (m) từ vị trí user tới toạ độ chính thức của di tích tại lúc check-in.
  @Column({ type: 'int', nullable: true })
  distanceM!: number | null;

  // Đã xác thực bằng GPS (trong bán kính) hay chưa.
  @Column({ type: 'boolean', default: false })
  verified!: boolean;

  // Quyền riêng tư: 'private' (chỉ mình) | 'public' (chia sẻ cộng đồng).
  @Column({ type: 'varchar', length: 16, default: 'private' })
  visibility!: 'private' | 'public';

  // Kiểm duyệt: 'active' | 'hidden' (admin ẩn nếu không hợp lệ).
  @Column({ type: 'varchar', length: 16, default: 'active' })
  status!: 'active' | 'hidden';

  @Column({ type: 'int', default: 0 })
  xpAwarded!: number;

  // Nếu check-in này nằm trên một hành trình (trip).
  @Column({ type: 'varchar', length: 64, nullable: true })
  tripId!: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
