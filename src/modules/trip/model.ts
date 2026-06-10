import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Một "Hành trình khám phá di sản" được ghi lại (tracking GPS foreground).
 * Tuyến đường lưu dạng JSON các điểm [{lat,lng,t}] trong cột `points`.
 */
@Entity('heritage_trips')
@Index('idx_trips_user', ['userId'])
@Index('idx_trips_visibility', ['visibility'])
export class TripModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  userId!: string;

  // Snapshot người dùng (để feed cộng đồng khỏi join bảng User)
  @Column({ type: 'varchar', length: 120, nullable: true })
  displayName!: string | null;

  @Column({ type: 'text', nullable: true })
  avatarUrl!: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  title!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  endedAt!: Date | null;

  @Column({ type: 'int', default: 0 })
  durationSec!: number;

  @Column({ type: 'int', default: 0 })
  distanceM!: number;

  // Ước tính calo (MET) — null nếu không có cân nặng.
  @Column({ type: 'int', nullable: true })
  kcal!: number | null;

  // Tuyến đường: JSON array [{lat,lng,t}]
  @Column({ type: 'text', nullable: true })
  points!: string | null;

  @Column({ type: 'text', nullable: true })
  coverPhoto!: string | null;

  // JSON array các heritageId đã ghé trên hành trình
  @Column({ type: 'text', nullable: true })
  heritageIds!: string | null;

  @Column({ type: 'int', default: 0 })
  heritageCount!: number;

  @Column({ type: 'varchar', length: 16, default: 'private' })
  visibility!: 'private' | 'public';

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status!: 'active' | 'hidden';

  @Column({ type: 'int', default: 0 })
  xpAwarded!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}

/** Khoảnh khắc dọc đường: ảnh + ghi chú gắn toạ độ (Phase 2). */
@Entity('heritage_trip_moments')
@Index('idx_trip_moments_trip', ['tripId'])
export class TripMomentModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  tripId!: string;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  lat!: number | null;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  lng!: number | null;

  @Column({ type: 'text', nullable: true })
  photoUrl!: string | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
