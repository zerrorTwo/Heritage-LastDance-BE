import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export const GRAPH_NODE_TYPES = [
  'dynasty',
  'person',
  'enemy',
  'event',
  'battle',
  'capital',
  'heritage',
  'artifact',
] as const;

export class CreateGraphNodeDto {
  /** id nghiệp vụ, chỉ chữ thường/số/_ (vd bach_dang_1288). */
  @IsString()
  @Matches(/^[a-z0-9_]+$/, { message: 'id chỉ gồm chữ thường, số và dấu _' })
  @MaxLength(64)
  id!: string;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsIn(GRAPH_NODE_TYPES)
  type!: (typeof GRAPH_NODE_TYPES)[number];

  @IsOptional() @IsString() @MaxLength(40)
  label?: string;

  @IsOptional() @IsString() @MaxLength(255)
  nameEn?: string;

  @IsOptional() @IsString() @MaxLength(60)
  year?: string;

  @IsOptional() @IsNumber()
  yearStart?: number;

  @IsOptional() @IsNumber()
  yearEnd?: number;

  @IsOptional() @IsNumber()
  lat?: number;

  @IsOptional() @IsNumber()
  lng?: number;

  @IsOptional() @IsString() @MaxLength(120)
  province?: string;

  @IsOptional() @IsString() @MaxLength(120)
  era?: string;

  @IsOptional() @IsBoolean()
  mapPoint?: boolean;

  @IsOptional() @IsString() @MaxLength(255)
  heritageSlug?: string;

  @IsOptional() @IsString()
  summary?: string;
}

export class UpdateGraphNodeDto {
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @IsIn(GRAPH_NODE_TYPES) type?: (typeof GRAPH_NODE_TYPES)[number];
  @IsOptional() @IsString() @MaxLength(40) label?: string;
  @IsOptional() @IsString() @MaxLength(255) nameEn?: string;
  @IsOptional() @IsString() @MaxLength(60) year?: string;
  @IsOptional() @IsNumber() yearStart?: number;
  @IsOptional() @IsNumber() yearEnd?: number;
  @IsOptional() @IsNumber() lat?: number;
  @IsOptional() @IsNumber() lng?: number;
  @IsOptional() @IsString() @MaxLength(120) province?: string;
  @IsOptional() @IsString() @MaxLength(120) era?: string;
  @IsOptional() @IsBoolean() mapPoint?: boolean;
  @IsOptional() @IsString() @MaxLength(255) heritageSlug?: string;
  @IsOptional() @IsString() summary?: string;
}

export class CreateGraphEdgeDto {
  @IsString() @MaxLength(64) fromId!: string;
  @IsString() @MaxLength(64) toId!: string;
  @IsString() @MaxLength(60) relation!: string;
}
