import { Injectable, BadRequestException } from '@nestjs/common';
import { UserRepository } from './repository';
import { AdminUpdateUserDto, UpdateUserDto } from './dto/update-user.dto';
import { UserModel, UserRole } from './model';

interface GetAllUsersQuery {
  page?: number | string;
  limit?: number | string;
  search?: string;
  role?: UserRole;
  sort?: string;
  order?: string;
}

@Injectable()
export class UserService {
  constructor(private readonly userRepo: UserRepository) {}

  async getUserById(userId: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new BadRequestException('User not found!');
    return this.toClientUser(user);
  }

  async getUserEntityById(userId: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new BadRequestException('User not found!');
    return user;
  }

  async getAllUsers(query: GetAllUsersQuery) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
    const order = String(query.order || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const [users, totalItems] = await this.userRepo.findAll({
      page,
      limit,
      search: query.search?.trim() || undefined,
      role: query.role,
      sort: query.sort,
      order,
    });

    return {
      users: users.map((user) => this.toClientUser(user)),
      pagination: {
        totalItems,
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        itemsPerPage: limit,
      },
    };
  }

  async updateUser(userId: string, dto: UpdateUserDto) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new BadRequestException('User not found!');

    if (dto.email) user.email = dto.email.trim().toLowerCase();
    if (dto.displayname !== undefined) user.displayname = dto.displayname;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.gender !== undefined) user.gender = dto.gender;
    if (dto.dateOfBirth !== undefined) user.dateOfBirth = dto.dateOfBirth;
    if (dto.avatar !== undefined) user.avatar = dto.avatar;

    await this.userRepo.update(user);
    return this.toClientUser(user);
  }

  async updateUserByAdmin(userId: string, dto: AdminUpdateUserDto) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new BadRequestException('User not found!');

    if (dto.email) user.email = dto.email.trim().toLowerCase();
    if (dto.displayname !== undefined) user.displayname = dto.displayname;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.gender !== undefined) user.gender = dto.gender;
    if (dto.dateOfBirth !== undefined) user.dateOfBirth = dto.dateOfBirth;
    if (dto.avatar !== undefined) user.avatar = dto.avatar;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.account?.isActive !== undefined) user.isActive = dto.account.isActive;

    await this.userRepo.update(user);
    return this.toClientUser(user);
  }

  async deleteUser(userId: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new BadRequestException('User not found!');

    await this.userRepo.delete(userId);
  }

  toClientUser(user: UserModel) {
    return {
      id: user.id,
      _id: user.id,
      email: user.email,
      displayname: user.displayname,
      phone: user.phone,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
      avatar: user.avatar,
      role: user.role || UserRole.USER,
      isActive: user.isActive,
      account: {
        email: user.email,
        isActive: user.isActive,
        isVerified: true,
      },
      createdAt: user.createdAt,
      createAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
