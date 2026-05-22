import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  UserModel,
  IUserRepository,
  CreateUserData,
  FindAllUsersOptions,
} from './model';

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

  async findAll(opts: FindAllUsersOptions): Promise<[UserModel[], number]> {
    const {
      page,
      limit,
      search,
      role,
      sort = 'createdAt',
      order = 'DESC',
    } = opts;

    const sortableColumns = new Set([
      'createdAt',
      'displayname',
      'email',
      'role',
      'isActive',
    ]);
    const sortColumn = sortableColumns.has(sort) ? sort : 'createdAt';

    const qb = this.repo.createQueryBuilder('user');

    if (search) {
      qb.andWhere(
        '(LOWER(user.email) LIKE LOWER(:search) OR LOWER(user.displayname) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    if (role) {
      qb.andWhere('user.role = :role', { role });
    }

    return qb
      .orderBy(`user.${sortColumn}`, order)
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }

  async create(data: CreateUserData): Promise<UserModel> {
    return this.repo.save(data);
  }

  async update(user: Partial<UserModel>): Promise<void> {
    await this.repo.update(user.id!, user);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
