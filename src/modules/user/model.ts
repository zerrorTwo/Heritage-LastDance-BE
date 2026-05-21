import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('users')
export class UserModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', nullable: true })
  email!: string | null;

  @Column({ type: 'text', nullable: true })
  password!: string | null;

  @Column({ type: 'varchar', nullable: true })
  walletAddress!: string | null;

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

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  isActiveUser(): boolean {
    return this.isActive;
  }
}

export interface CreateUserData {
  email?: string | null;
  password?: string | null;
  walletAddress?: string | null;
  displayname?: string | null;
  phone?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  avatar?: string | null;
}

export interface IUserRepository {
  findByEmail(email: string): Promise<UserModel | null>;
  findById(id: string): Promise<UserModel | null>;
  findByWalletAddress(walletAddress: string): Promise<UserModel | null>;
  create(data: CreateUserData): Promise<UserModel>;
  update(user: Partial<UserModel>): Promise<void>;
}
