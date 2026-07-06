import { IsString, IsOptional, IsInt } from 'class-validator';

export class CreateMediaDto {
  @IsString()
  heritageId!: string;

  @IsString()
  type!: string;

  @IsString()
  url!: string;

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
