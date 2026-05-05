import { IsNotEmpty, IsString } from 'class-validator';

export class MetaMaskChallengeDto {
  @IsString()
  @IsNotEmpty()
  walletAddress!: string;
}

export class MetaMaskSignInDto {
  @IsString()
  @IsNotEmpty()
  walletAddress!: string;

  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsString()
  @IsNotEmpty()
  signature!: string;
}

export class LinkWalletDto {
  @IsString()
  @IsNotEmpty()
  walletAddress!: string;
}

export class VerifyLinkWalletDto {
  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsString()
  @IsNotEmpty()
  signature!: string;
}