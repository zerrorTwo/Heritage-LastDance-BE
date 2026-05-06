import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class MetaMaskChallengeDto {
  @ApiProperty({
    description: 'MetaMask wallet address',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38',
  })
  @IsString()
  @IsNotEmpty()
  walletAddress!: string;
}

export class MetaMaskSignInDto {
  @ApiProperty({
    description: 'MetaMask wallet address',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38',
  })
  @IsString()
  @IsNotEmpty()
  walletAddress!: string;

  @ApiProperty({
    description: 'Challenge message to sign',
    example: 'Sign this message to authenticate: 1234567890',
  })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiProperty({
    description: 'Signature of the challenge message',
    example: '0x1234567890abcdef...',
  })
  @IsString()
  @IsNotEmpty()
  signature!: string;
}

export class LinkWalletDto {
  @ApiProperty({
    description: 'MetaMask wallet address to link',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38',
  })
  @IsString()
  @IsNotEmpty()
  walletAddress!: string;
}

export class VerifyLinkWalletDto {
  @ApiProperty({
    description: 'Challenge message that was signed',
    example: 'Sign this message to link wallet: 1234567890',
  })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiProperty({
    description: 'Signature of the challenge message',
    example: '0x1234567890abcdef...',
  })
  @IsString()
  @IsNotEmpty()
  signature!: string;
}