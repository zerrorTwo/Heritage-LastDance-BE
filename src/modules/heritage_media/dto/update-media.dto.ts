import { IsString, IsOptional, IsInt } from 'class-validator';

export class UpdateMediaDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsString()
  credit?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
