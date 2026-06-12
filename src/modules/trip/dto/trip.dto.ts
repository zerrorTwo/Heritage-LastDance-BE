import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateTripDto {
  @ApiProperty({ description: 'ID người dùng' })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ required: false, description: 'ISO start' })
  @IsString()
  @IsOptional()
  startedAt?: string;

  @ApiProperty({ required: false, description: 'ISO end' })
  @IsString()
  @IsOptional()
  endedAt?: string;

  @ApiProperty({ description: 'Thời lượng (giây)' })
  @IsInt()
  @Min(0)
  durationSec!: number;

  @ApiProperty({ description: 'Quãng đường (mét)' })
  @IsInt()
  @Min(0)
  distanceM!: number;

  @ApiProperty({ required: false, description: 'Cân nặng (kg) để ước tính kcal' })
  @IsOptional()
  weightKg?: number;

  @ApiProperty({ type: [Object], description: 'Tuyến đường [{lat,lng,t}]' })
  @IsArray()
  points!: Array<{ lat: number; lng: number; t?: number }>;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  coverPhoto?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsOptional()
  heritageIds?: string[];

  @ApiProperty({ required: false, enum: ['private', 'public'] })
  @IsString()
  @IsOptional()
  visibility?: 'private' | 'public';

  @ApiProperty({ required: false, description: 'ID hành trình gốc nếu đây là "trải nghiệm lại"' })
  @IsString()
  @IsOptional()
  followedTripId?: string;

  @ApiProperty({ required: false, type: [Object] })
  @IsArray()
  @IsOptional()
  moments?: Array<{ lat?: number; lng?: number; photoUrl?: string; note?: string }>;
}

export class UpdateTripVisibilityDto {
  @ApiProperty({ description: 'ID người dùng (chủ hành trình)' })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ enum: ['private', 'public'] })
  @IsString()
  @IsNotEmpty()
  visibility!: 'private' | 'public';
}
