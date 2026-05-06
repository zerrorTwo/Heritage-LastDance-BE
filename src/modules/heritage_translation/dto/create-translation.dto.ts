import { IsString, IsOptional } from 'class-validator';

export class CreateTranslationDto {
  @IsString()
  heritageId!: string;

  @IsString()
  languageCode!: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  content?: string;
}
