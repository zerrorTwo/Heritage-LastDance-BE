import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @IsNotEmpty()
  otpCode!: string;
}

export class ResendOtpDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}