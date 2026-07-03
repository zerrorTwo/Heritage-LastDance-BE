import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { UserRole } from '../model';

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
    description: 'Display name shown in the application',
    example: 'Nguyen Van A',
    required: false,
    nullable: true,
  })
  @IsString()
  @IsOptional()
  displayname?: string | null;

  @ApiProperty({
    description: 'Phone number',
    example: '0901234567',
    required: false,
    nullable: true,
  })
  @IsString()
  @IsOptional()
  phone?: string | null;

  @ApiProperty({
    description: 'Gender',
    example: 'other',
    enum: ['men', 'woman', 'other'],
    required: false,
    nullable: true,
  })
  @IsIn(['men', 'woman', 'other'])
  @IsOptional()
  gender?: string | null;

  @ApiProperty({
    description: 'Date of birth',
    example: '2002-01-31',
    required: false,
    nullable: true,
  })
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string | null;

  @ApiProperty({
    description: 'Avatar URL or data URL',
    example: 'https://example.com/avatar.jpg',
    required: false,
    nullable: true,
  })
  @IsString()
  @IsOptional()
  avatar?: string | null;
}

export class AdminUpdateAccountDto {
  @ApiProperty({
    description: 'Account active status',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class AdminUpdateUserDto extends UpdateUserDto {
  @ApiProperty({
    description: 'User role',
    example: UserRole.USER,
    enum: UserRole,
    required: false,
  })
  @IsIn([UserRole.USER, UserRole.ADMIN])
  @IsOptional()
  role?: UserRole;

  @ApiProperty({
    description: 'Nested account fields used by the admin UI',
    required: false,
    type: AdminUpdateAccountDto,
  })
  @IsObject()
  @IsOptional()
  account?: AdminUpdateAccountDto;
}
