import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export const SUPPORTED_LANGUAGES = ['vi', 'en'] as const;
export const SUPPORTED_LEVELS = ['basic', 'intermediate', 'advanced'] as const;
export const SUPPORTED_TOPIC_TYPES = [
  'history',
  'heritage',
  'lesson',
  'event',
  'other',
] as const;

export class GenerateMindMapDto {
  @ApiProperty({
    description: 'Educational text content to convert into a mind map',
    example: 'Địa đạo Củ Chi là một hệ thống...',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(10000)
  text!: string;

  @ApiPropertyOptional({
    description: 'Language of the mind map labels',
    example: 'vi',
    enum: SUPPORTED_LANGUAGES,
    default: 'vi',
  })
  @IsOptional()
  @IsString()
  @IsIn(SUPPORTED_LANGUAGES)
  language?: string;

  @ApiPropertyOptional({
    description: 'Learning level for adjusting mind map complexity',
    example: 'intermediate',
    enum: SUPPORTED_LEVELS,
    default: 'intermediate',
  })
  @IsOptional()
  @IsString()
  @IsIn(SUPPORTED_LEVELS)
  level?: string;

  @ApiPropertyOptional({
    description: 'Topic type for branch structure hints',
    example: 'history',
    enum: SUPPORTED_TOPIC_TYPES,
    default: 'history',
  })
  @IsOptional()
  @IsString()
  @IsIn(SUPPORTED_TOPIC_TYPES)
  topicType?: string;
}
