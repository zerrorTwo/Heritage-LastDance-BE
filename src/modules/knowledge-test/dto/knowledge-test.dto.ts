import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { KnowledgeTestStatus } from '../model';

export class OptionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  optionText!: string;

  @ApiProperty()
  @IsBoolean()
  isCorrect!: boolean;
}

export class QuestionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({ type: [OptionDto], minimum: 2 })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => OptionDto)
  options!: OptionDto[];
}

export class CreateKnowledgeTestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  heritageId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiProperty({ type: [QuestionDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionDto)
  questions?: QuestionDto[];

  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  @IsInt()
  topPerformersLimit?: number;
}

export class UpdateKnowledgeTestBasicDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ required: false, enum: KnowledgeTestStatus })
  @IsOptional()
  @IsIn(Object.values(KnowledgeTestStatus))
  status?: KnowledgeTestStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  topPerformersLimit?: number;
}

export class GetTestsQueryDto {
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiProperty({ required: false, default: 'ALL' })
  @IsOptional()
  @IsString()
  status?: string = 'ALL';
}

export class AnswerDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  questionId!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  selectedOptionIds!: string[];
}

export class SubmitAttemptDto {
  @ApiProperty({ type: [AnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers!: AnswerDto[];
}

export class AddQuestionDto extends QuestionDto {}

export class UpdateQuestionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({ type: [OptionDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionDto)
  options?: OptionDto[];
}

export class AddOptionDto extends OptionDto {}

export class UpdateOptionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  optionText?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isCorrect?: boolean;
}
