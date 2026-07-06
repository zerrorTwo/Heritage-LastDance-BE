import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'User email address for password reset',
    example: 'user@example.com',
    format: 'email',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}

export class VerifyForgotPasswordOtpDto {
  @ApiProperty({
    description: 'Reset token received from forgot password request',
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

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Reset token received after OTP verification',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({
    description: 'New password (minimum 6 characters)',
    example: 'NewSecurePass123!',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  newPassword!: string;
}