import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserModel, IUserRepository, CreateUserData } from './model';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(UserModel)
    private readonly repo: Repository<UserModel>,
  ) {}

  async findByEmail(email: string): Promise<UserModel | null> {
    return this.repo.findOneBy({ email });
  }

  async findById(id: string): Promise<UserModel | null> {
    return this.repo.findOneBy({ id });
  }

  async findByWalletAddress(walletAddress: string): Promise<UserModel | null> {
    return this.repo.findOneBy({ walletAddress });
  }

  async create(data: CreateUserData): Promise<UserModel> {
    return this.repo.save(data);
  }

  async update(user: Partial<UserModel>): Promise<void> {
    await this.repo.update(user.id!, user);
  }
}