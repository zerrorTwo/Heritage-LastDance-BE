import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateLocationDto {
  @IsString()
  heritageId!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  countryCode?: string;
}
