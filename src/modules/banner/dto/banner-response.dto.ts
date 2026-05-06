import { ApiProperty } from '@nestjs/swagger';

export class BannerResponseDto {
  @ApiProperty({
    description: 'Banner ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'Banner type',
    example: 'homepage',
    enum: ['homepage', 'ads', 'popup', 'sidebar'],
  })
  type!: string;

  @ApiProperty({
    description: 'Banner title',
    example: 'Summer Sale',
    nullable: true,
  })
  title!: string | null;

  @ApiProperty({
    description: 'Banner description',
    example: 'Get 50% off on all items',
    nullable: true,
  })
  description!: string | null;

  @ApiProperty({
    description: 'Banner image URL',
    example: 'https://example.com/banner.jpg',
  })
  imageUrl!: string;

  @ApiProperty({
    description: 'Mobile banner image URL',
    example: 'https://example.com/banner-mobile.jpg',
    nullable: true,
  })
  mobileImageUrl!: string | null;

  @ApiProperty({
    description: 'Link URL when banner is clicked',
    example: 'https://example.com/promo',
    nullable: true,
  })
  linkUrl!: string | null;

  @ApiProperty({
    description: 'Click action type',
    example: 'redirect',
    enum: ['redirect', 'open_modal', 'none'],
  })
  clickAction!: string;

  @ApiProperty({
    description: 'Banner position',
    example: 'top',
    enum: ['top', 'middle', 'bottom'],
    nullable: true,
  })
  position!: string | null;

  @ApiProperty({
    description: 'Display priority (higher = show first)',
    example: 10,
  })
  priority!: number;

  @ApiProperty({
    description: 'Banner start date',
    example: '2026-05-06T00:00:00.000Z',
    nullable: true,
  })
  startAt!: Date | null;

  @ApiProperty({
    description: 'Banner end date',
    example: '2026-06-06T23:59:59.000Z',
    nullable: true,
  })
  endAt!: Date | null;

  @ApiProperty({
    description: 'Banner active status',
    example: true,
  })
  isActive!: boolean;

  @ApiProperty({
    description: 'Creation date',
    example: '2026-05-06T10:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Last update date',
    example: '2026-05-06T10:00:00.000Z',
  })
  updatedAt!: Date;
}
