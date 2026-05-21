import { Injectable, BadRequestException } from '@nestjs/common';
import { UserRepository } from './repository';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private readonly userRepo: UserRepository) {}

  async getUserById(userId: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new BadRequestException('User not found!');
    return user;
  }

  async updateUser(userId: string, dto: UpdateUserDto) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new BadRequestException('User not found!');

    if (dto.email) user.email = dto.email;
    if (dto.walletAddress) user.walletAddress = dto.walletAddress;
    if (dto.displayname !== undefined) user.displayname = dto.displayname;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.gender !== undefined) user.gender = dto.gender;
    if (dto.dateOfBirth !== undefined) user.dateOfBirth = dto.dateOfBirth;
    if (dto.avatar !== undefined) user.avatar = dto.avatar;

    await this.userRepo.update(user);
    return user;
  }
}
