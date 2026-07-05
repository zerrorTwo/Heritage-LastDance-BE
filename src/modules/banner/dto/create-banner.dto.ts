import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUrl,
  IsInt,
  IsBoolean,
  IsDateString,
  IsIn,
} from 'class-validator';

export class CreateBannerDto {
  @ApiProperty({
    description: 'Banner type',
    example: 'homepage',
    enum: ['homepage', 'ads', 'popup', 'sidebar'],
  })
  @IsString()
  @IsIn(['homepage', 'ads', 'popup', 'sidebar'])
  type!: string;

  @ApiProperty({
    description: 'Banner title',
    example: 'Summer Sale',
    required: false,
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    description: 'Banner description',
    example: 'Get 50% off on all items',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Banner image URL',
    example: 'https://example.com/banner.jpg',
  })
  @IsUrl()
  imageUrl!: string;

  @ApiProperty({
    description: 'Mobile banner image URL',
    example: 'https://example.com/banner-mobile.jpg',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  mobileImageUrl?: string;

  @ApiProperty({
    description: 'Link URL when banner is clicked',
    example: 'https://example.com/promo',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  linkUrl?: string;

  @ApiProperty({
    description: 'Click action type',
    example: 'redirect',
    enum: ['redirect', 'open_modal', 'none'],
    default: 'none',
  })
  @IsString()
  @IsIn(['redirect', 'open_modal', 'none'])
  @IsOptional()
  clickAction?: string;

  @ApiProperty({
    description: 'Banner position',
    example: 'top',
    enum: ['top', 'middle', 'bottom'],
    required: false,
  })
  @IsString()
  @IsIn(['top', 'middle', 'bottom'])
  @IsOptional()
  position?: string;

  @ApiProperty({
    description: 'Display priority (higher = show first)',
    example: 10,
    default: 0,
  })
  @IsInt()
  @IsOptional()
  priority?: number;

  @ApiProperty({
    description: 'Banner start date (ISO 8601)',
    example: '2026-05-06T00:00:00.000Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  startAt?: string;

  @ApiProperty({
    description: 'Banner end date (ISO 8601)',
    example: '2026-06-06T23:59:59.000Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  endAt?: string;

  @ApiProperty({
    description: 'Banner active status',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
