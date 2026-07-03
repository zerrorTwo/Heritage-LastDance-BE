import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

@Entity('users')
export class UserModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', nullable: true })
  email!: string | null;

  @Column({ type: 'text', nullable: true })
  password!: string | null;

  @Column({ type: 'varchar', nullable: true, unique: true })
  googleId!: string | null;

  @Column({ name: 'displayName', type: 'varchar', nullable: true })
  displayname!: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', nullable: true })
  gender!: string | null;

  @Column({ type: 'date', nullable: true })
  dateOfBirth!: string | null;

  @Column({ type: 'text', nullable: true })
  avatar!: string | null;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role!: UserRole;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  isActiveUser(): boolean {
    return this.isActive;
  }
}

export interface CreateUserData {
  email?: string | null;
  password?: string | null;
  googleId?: string | null;
  displayname?: string | null;
  phone?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  avatar?: string | null;
  role?: UserRole;
}

export interface FindAllUsersOptions {
  page: number;
  limit: number;
  search?: string;
  role?: UserRole;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

export interface IUserRepository {
  findByEmail(email: string): Promise<UserModel | null>;
  findById(id: string): Promise<UserModel | null>;
  findByGoogleId(googleId: string): Promise<UserModel | null>;
  findAll(opts: FindAllUsersOptions): Promise<[UserModel[], number]>;
  create(data: CreateUserData): Promise<UserModel>;
  update(user: Partial<UserModel>): Promise<void>;
  delete(id: string): Promise<void>;
}
