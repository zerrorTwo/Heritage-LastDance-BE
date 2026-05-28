import { IsString, IsOptional, IsIn, IsArray, IsObject } from 'class-validator';

export class UpdateHeritageDto {
  @IsOptional()
  @IsString()
  slug?: string;

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
  type?: string;

  @IsOptional()
  @IsIn(['draft', 'published', 'archived'])
  status?: string;

  @IsOptional()
  publishedAt?: Date;

  @IsOptional()
  @IsString()
  seoTitle?: string;

  @IsOptional()
  @IsString()
  seoDescription?: string;

  @IsOptional()
  @IsArray()
  alternativeNames?: string[];

  @IsOptional()
  @IsString()
  history?: string;

  @IsOptional()
  @IsString()
  architecture?: string;

  @IsOptional()
  @IsString()
  culturalSignificance?: string;

  @IsOptional()
  @IsString()
  constructionPeriod?: string;

  @IsOptional()
  @IsString()
  founder?: string;

  @IsOptional()
  @IsObject()
  recognition?: Record<string, any>;

  @IsOptional()
  @IsObject()
  festivals?: Record<string, any>;

  @IsOptional()
  @IsString()
  legends?: string;

  @IsOptional()
  @IsString()
  sourceUrl?: string;
}
