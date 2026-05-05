import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserModel } from './model';
import type {
  IUserRepository,
  CreateUserData,
  UpsertGoogleUserData,
} from './model';

/**
 * MySQL implementation of IUserRepository using TypeORM.
 * Injected via USER_REPOSITORY token — never imported directly by services.
 */
@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(UserModel)
    private readonly repo: Repository<UserModel>,
  ) {}

  findByEmail(email: string): Promise<UserModel | null> {
    return this.repo.findOne({ where: { email } });
  }

  findByEmailWithPassword(email: string): Promise<UserModel | null> {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  findById(id: string): Promise<UserModel | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByGoogleId(googleId: string): Promise<UserModel | null> {
    return this.repo.findOne({ where: { googleId } });
  }

  async create(data: CreateUserData): Promise<UserModel> {
    const user = this.repo.create(data);
    return this.repo.save(user);
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await this.repo.update({ id: userId }, { password: hashedPassword });
  }

  async upsertGoogleUser(data: UpsertGoogleUserData): Promise<UserModel> {
    let user = await this.findByGoogleId(data.googleId);
    if (!user) {
      user = await this.findByEmail(data.email);
    }

    if (user) {
      await this.repo.update(
        { id: user.id },
        {
          googleId: data.googleId,
          firstName: data.firstName,
          lastName: data.lastName,
          isVerified: true,
        },
      );
      return this.repo.findOne({
        where: { id: user.id },
      }) as Promise<UserModel>;
    }

    const newUser = this.repo.create({
      ...data,
      isVerified: true,
    });
    return this.repo.save(newUser);
  }
}
