import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY } from '../../common/constants/injection-tokens';
import type {
  IUserRepository,
  CreateUserData,
  UpsertGoogleUserData,
} from './model';
import { UserModel } from './model';

/**
 * UsersService — handles all user data operations.
 * Depends on IUserRepository via DI token; never on a concrete class.
 * No logging, no HTTP concerns, no validation.
 */
@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  findByEmail(email: string): Promise<UserModel | null> {
    return this.userRepository.findByEmail(email);
  }

  findByEmailWithPassword(email: string): Promise<UserModel | null> {
    return this.userRepository.findByEmailWithPassword(email);
  }

  findById(id: string): Promise<UserModel | null> {
    return this.userRepository.findById(id);
  }

  findByGoogleId(googleId: string): Promise<UserModel | null> {
    return this.userRepository.findByGoogleId(googleId);
  }

  create(data: CreateUserData): Promise<UserModel> {
    return this.userRepository.create(data);
  }

  updatePassword(userId: string, hashedPassword: string): Promise<void> {
    return this.userRepository.updatePassword(userId, hashedPassword);
  }

  upsertGoogleUser(data: UpsertGoogleUserData): Promise<UserModel> {
    return this.userRepository.upsertGoogleUser(data);
  }
}
