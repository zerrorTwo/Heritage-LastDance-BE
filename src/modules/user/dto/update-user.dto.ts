import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({
    description: 'User email address',
    example: 'newemail@example.com',
    format: 'email',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'User wallet address (MetaMask)',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38',
    required: false,
  })
  @IsString()
  @IsOptional()
  walletAddress?: string;
}