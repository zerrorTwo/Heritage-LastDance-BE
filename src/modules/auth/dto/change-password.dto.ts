import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Reset token received after OTP verification' })
  @IsString()
  @IsNotEmpty({ message: 'Reset token must not be empty' })
  resetToken: string;

  @ApiProperty({
    example: 'NewAbc@12345',
    description: 'Min 8 chars — must contain uppercase, lowercase, digit, and special character',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain uppercase, lowercase, digit, and special character',
  })
  newPassword: string;
}
