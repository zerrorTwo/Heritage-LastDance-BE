import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Raw refresh token received from sign-in' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
