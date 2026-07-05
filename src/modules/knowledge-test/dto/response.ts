import { ApiProperty } from '@nestjs/swagger';
import { KnowledgeTestStatus } from '../model';

export class KnowledgeTestOptionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  questionId!: string;

  @ApiProperty()
  optionText!: string;

  @ApiProperty()
  isCorrect!: boolean;

  @ApiProperty()
  position!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class KnowledgeTestQuestionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  testId!: string;

  @ApiProperty()
  content!: string;

  @ApiProperty({ required: false, nullable: true })
  explanation!: string | null;

  @ApiProperty({ required: false, nullable: true })
  image!: string | null;

  @ApiProperty()
  position!: number;

  @ApiProperty({ type: () => [KnowledgeTestOptionResponseDto] })
  options!: KnowledgeTestOptionResponseDto[];

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class KnowledgeTestResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  heritageId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  content!: string;

  @ApiProperty()
  totalAttempts!: number;

  @ApiProperty()
  averageScore!: number;

  @ApiProperty()
  highestScore!: number;

  @ApiProperty()
  topPerformersLimit!: number;

  @ApiProperty({ enum: KnowledgeTestStatus })
  status!: KnowledgeTestStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;

  @ApiProperty({ type: () => [KnowledgeTestQuestionResponseDto], required: false })
  questions?: KnowledgeTestQuestionResponseDto[];
}

export class KnowledgeTestPaginationDto {
  @ApiProperty()
  totalItems!: number;

  @ApiProperty()
  currentPage!: number;

  @ApiProperty()
  totalPages!: number;

  @ApiProperty()
  itemsPerPage!: number;
}

export class KnowledgeTestListResponseDto {
  @ApiProperty({ type: () => [KnowledgeTestResponseDto] })
  results!: KnowledgeTestResponseDto[];

  @ApiProperty()
  totalCount!: number;

  @ApiProperty({ type: () => KnowledgeTestPaginationDto })
  pagination!: KnowledgeTestPaginationDto;
}

export class SubmitAttemptResponseDto {
  @ApiProperty({ example: 80 })
  score!: number;

  @ApiProperty({ example: 10 })
  totalQuestions!: number;

  @ApiProperty({ example: 8 })
  correctAnswers!: number;
}

export class TopPerformerDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty({ nullable: true })
  userName!: string | null;

  @ApiProperty()
  score!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

export class KnowledgeTestStatsDto {
  @ApiProperty()
  totalAttempts!: number;

  @ApiProperty()
  averageScore!: number;

  @ApiProperty()
  highestScore!: number;
}

export class KnowledgeTestLeaderboardResponseDto {
  @ApiProperty()
  testId!: string;

  @ApiProperty()
  testTitle!: string;

  @ApiProperty({ type: () => KnowledgeTestStatsDto })
  stats!: KnowledgeTestStatsDto;

  @ApiProperty({ type: () => [TopPerformerDto] })
  topPerformers!: TopPerformerDto[];
}

export class KnowledgeTestQuestionsResponseDto {
  @ApiProperty()
  testId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ type: () => [KnowledgeTestQuestionResponseDto] })
  questions!: KnowledgeTestQuestionResponseDto[];
}

export class KnowledgeTestQuestionDetailResponseDto {
  @ApiProperty()
  testId!: string;

  @ApiProperty()
  testTitle!: string;

  @ApiProperty({ type: () => KnowledgeTestQuestionResponseDto })
  question!: KnowledgeTestQuestionResponseDto;
}

export class KnowledgeTestOptionsResponseDto {
  @ApiProperty()
  testId!: string;

  @ApiProperty()
  questionId!: string;

  @ApiProperty()
  questionContent!: string;

  @ApiProperty({ type: () => [KnowledgeTestOptionResponseDto] })
  options!: KnowledgeTestOptionResponseDto[];
}

export class SuccessMessageResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Xóa thành công' })
  message!: string;
}
