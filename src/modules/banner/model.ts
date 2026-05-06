import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('banners')
export class BannerModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50 })
  type!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'text' })
  imageUrl!: string;

  @Column({ type: 'text', nullable: true })
  mobileImageUrl!: string | null;

  @Column({ type: 'text', nullable: true })
  linkUrl!: string | null;

  @Column({ type: 'varchar', length: 50, default: 'none' })
  clickAction!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  position!: string | null;

  @Column({ type: 'int', default: 0 })
  priority!: number;

  @Column({ type: 'timestamptz', nullable: true })
  startAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  endAt!: Date | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

export interface CreateBannerData {
  type: string;
  imageUrl: string;
  title?: string | null;
  description?: string | null;
  mobileImageUrl?: string | null;
  linkUrl?: string | null;
  clickAction?: string;
  position?: string | null;
  priority?: number;
  startAt?: Date | null;
  endAt?: Date | null;
  isActive?: boolean;
}

export interface UpdateBannerData {
  type?: string;
  title?: string | null;
  description?: string | null;
  imageUrl?: string;
  mobileImageUrl?: string | null;
  linkUrl?: string | null;
  clickAction?: string;
  position?: string | null;
  priority?: number;
  startAt?: Date | null;
  endAt?: Date | null;
  isActive?: boolean;
}

export interface IBannerRepository {
  findAll(activeOnly?: boolean): Promise<BannerModel[]>;
  findById(id: string): Promise<BannerModel | null>;
  findByType(type: string, activeOnly?: boolean): Promise<BannerModel[]>;
  create(data: CreateBannerData): Promise<BannerModel>;
  update(banner: Partial<BannerModel>): Promise<void>;
  delete(id: string): Promise<void>;
}
