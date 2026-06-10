import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class TripPointDto {
  @ApiProperty() lat!: number;
  @ApiProperty() lng!: number;
  @ApiProperty({ required: false, description: 'epoch ms' }) t?: number;
}

export class TripMomentInputDto {
  @ApiProperty() lat?: number;
  @ApiProperty() lng?: number;
  @ApiProperty({ required: false }) photoUrl?: string;
  @ApiProperty({ required: false }) note?: string;
}

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

  @ApiProperty({ type: [TripPointDto], description: 'Tuyến đường' })
  @IsArray()
  points!: TripPointDto[];

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

  @ApiProperty({ required: false, type: [TripMomentInputDto] })
  @IsArray()
  @IsOptional()
  moments?: TripMomentInputDto[];
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
