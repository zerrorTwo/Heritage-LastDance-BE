import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({
    description: 'Auth token received from signup',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({
    description: 'OTP code sent to email',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  otpCode!: string;
}

export class ResendOtpDto {
  @ApiProperty({
    description: 'Auth token received from signup',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;
}