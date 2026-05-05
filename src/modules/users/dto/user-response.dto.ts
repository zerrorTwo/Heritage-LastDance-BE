import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for user profile responses.
 * Excludes sensitive fields (password, googleId).
 */
export class UserResponseDto {
  @ApiProperty({ example: 'uuid-string' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'Nguyễn' })
  firstName: string;

  @ApiProperty({ example: 'Văn A' })
  lastName: string;

  @ApiProperty({ example: true })
  isVerified: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
