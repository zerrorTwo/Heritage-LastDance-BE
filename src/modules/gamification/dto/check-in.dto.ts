import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CheckInDto {
  @ApiProperty({ example: 'user-uuid' })
  @IsString()
  @MaxLength(64)
  userId!: string;

  @ApiProperty({ example: 'bach_dang_1288' })
  @IsString()
  @MaxLength(64)
  heritageId!: string;

  @ApiProperty({ required: false, example: 'Sông Bạch Đằng' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  heritageTitle?: string;

  @ApiProperty({ required: false, description: 'Tên hiển thị (snapshot cho feed)' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;

  @ApiProperty({ required: false, description: 'Avatar URL (snapshot cho feed)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;

  @ApiProperty({ description: 'Vĩ độ vị trí user (bắt buộc trừ chế độ demo)' })
  @IsOptional()
  @IsLatitude()
  lat?: number;

  @ApiProperty({ description: 'Kinh độ vị trí user (bắt buộc trừ chế độ demo)' })
  @IsOptional()
  @IsLongitude()
  lng?: number;

  @ApiProperty({ required: false, description: 'Độ chính xác GPS (m)' })
  @IsOptional()
  @IsNumber()
  accuracy?: number;

  @ApiProperty({ required: false, description: 'URL ảnh bằng chứng (Cloudinary)' })
  @IsOptional()
  @IsUrl()
  photoUrl?: string;

  @ApiProperty({ required: false, enum: ['private', 'public'], default: 'private' })
  @IsOptional()
  @IsIn(['private', 'public'])
  visibility?: 'private' | 'public';

  @ApiProperty({ required: false, description: 'Chế độ demo: giả lập đang ở di tích' })
  @IsOptional()
  @IsBoolean()
  demo?: boolean;
}
