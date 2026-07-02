import { IsString, IsOptional, IsObject } from 'class-validator';

export class UpdateTranslationDto {
  @IsOptional()
  @IsString()
  languageCode?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  seoTitle?: string;

  @IsOptional()
  @IsString()
  seoDescription?: string;

  @IsOptional()
  @IsObject()
  additionalInfo?: Record<string, any>;
}
