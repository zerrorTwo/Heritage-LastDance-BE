import { IsString, IsOptional } from 'class-validator';

export class CreateCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsString()
  slug!: string;
}
