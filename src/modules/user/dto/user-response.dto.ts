import { ApiProperty } from '@nestjs/swagger';

// User profile response
export class UserProfileDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'User email',
    example: 'user@example.com',
  })
  email!: string | null;

  @ApiProperty({
    description: 'Wallet address',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38',
  })
  walletAddress!: string | null;

  @ApiProperty({
    description: 'Account active status',
    example: true,
  })
  isActive!: boolean;

  @ApiProperty({
    description: 'Account creation date',
    example: '2026-05-06T10:00:00.000Z',
  })
  createdAt!: Date;
}
