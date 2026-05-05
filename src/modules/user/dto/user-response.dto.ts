import { ApiProperty } from '@nestjs/swagger';
import { UserModel } from '../../user/model';

export class UserProfileDto {
  @ApiProperty({ description: 'User ID' })
  id!: string;

  @ApiProperty({ description: 'User email' })
  email!: string | null;

  @ApiProperty({ description: 'Wallet address' })
  walletAddress!: string | null;

  @ApiProperty({ description: 'Account active status' })
  isActive!: boolean;

  @ApiProperty({ description: 'Account creation date' })
  createdAt!: Date;
}

export class UpdateUserDto {
  @ApiProperty({ description: 'User email', required: false })
  email?: string;

  @ApiProperty({ description: 'Wallet address', required: false })
  walletAddress?: string;
}
