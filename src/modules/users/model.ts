import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class UserModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true, select: false })
  password: string;

  @Column({ nullable: true })
  googleId: string;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

export interface CreateUserData {
  email: string;
  password: string;
  isVerified: boolean;
}

export interface UpsertGoogleUserData {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface IUserRepository {
  findByEmail(email: string): Promise<UserModel | null>;
  findByEmailWithPassword(email: string): Promise<UserModel | null>;
  findById(id: string): Promise<UserModel | null>;
  findByGoogleId(googleId: string): Promise<UserModel | null>;
  create(data: CreateUserData): Promise<UserModel>;
  updatePassword(userId: string, hashedPassword: string): Promise<void>;
  upsertGoogleUser(data: UpsertGoogleUserData): Promise<UserModel>;
}
