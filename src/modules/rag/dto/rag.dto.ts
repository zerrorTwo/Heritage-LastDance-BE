import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ImportKnowledgeDto {
  @ApiPropertyOptional({ description: 'Public URL to ingest into the wiki' })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({ description: 'Display title for the source' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'AI service knowledge type slug' })
  @IsOptional()
  @IsString()
  knowledgeType?: string;
}

export class SearchKnowledgeDto {
  @ApiProperty({ description: 'Search query' })
  @IsString()
  @MinLength(2)
  q!: string;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({ description: 'Wiki page type filter' })
  @IsOptional()
  @IsString()
  pageType?: string;
}

export class WikiListDto {
  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({ description: 'Wiki page type filter' })
  @IsOptional()
  @IsString()
  pageType?: string;
}

export class QueryKnowledgeDto {
  @ApiProperty({ description: 'User question for the heritage assistant' })
  @IsString()
  @MinLength(2)
  question!: string;

  @ApiPropertyOptional({ description: 'Current heritage item id from FE' })
  @IsOptional()
  @IsString()
  heritageId?: string;

  @ApiPropertyOptional({ default: 5, minimum: 1, maximum: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  topK?: number;

  @ApiPropertyOptional({ description: 'Legacy FE field; accepted for compatibility' })
  @IsOptional()
  @IsString()
  collectionName?: string;

  @ApiPropertyOptional({ description: "Ngôn ngữ câu trả lời: 'vi' | 'en'" })
  @IsOptional()
  @IsString()
  language?: string;
}
