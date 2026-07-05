import { ApiProperty } from '@nestjs/swagger';

export class LeaderboardStatsDto {
  @ApiProperty({ example: 25 })
  totalParticipants!: number;

  @ApiProperty({ example: 95 })
  highestScore!: number;

  @ApiProperty({ example: 72.5 })
  averageScore!: number;
}

export class LeaderboardEntryResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  id!: string;

  @ApiProperty({ example: 'a1b2c3d4-...' })
  leaderboardId!: string;

  @ApiProperty({ example: 'user-uuid' })
  userId!: string;

  @ApiProperty({ example: 95 })
  score!: number;

  @ApiProperty({ example: 1 })
  rank!: number;

  @ApiProperty({ required: false, nullable: true })
  avatar!: string | null;

  @ApiProperty({ required: false, nullable: true, example: 'Nguyễn Văn A' })
  displayName!: string | null;

  @ApiProperty({ required: false, nullable: true, type: String, format: 'date-time' })
  completedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class LeaderboardResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  id!: string;

  @ApiProperty({ example: 'heritage-uuid' })
  heritageId!: string;

  @ApiProperty({ example: 25 })
  totalParticipants!: number;

  @ApiProperty({ example: 95 })
  highestScore!: number;

  @ApiProperty({ example: 72.5 })
  averageScore!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;

  @ApiProperty({ type: () => [LeaderboardEntryResponseDto] })
  rankings!: LeaderboardEntryResponseDto[];
}

export class LeaderboardPaginationDto {
  @ApiProperty({ example: 100 })
  totalItems!: number;

  @ApiProperty({ example: 1 })
  currentPage!: number;

  @ApiProperty({ example: 5 })
  totalPages!: number;

  @ApiProperty({ example: 20 })
  itemsPerPage!: number;
}

export class LeaderboardListResponseDto {
  @ApiProperty({ type: () => [LeaderboardResponseDto] })
  leaderBoards!: LeaderboardResponseDto[];

  @ApiProperty({ type: () => LeaderboardPaginationDto })
  pagination!: LeaderboardPaginationDto;
}

export class LeaderboardByHeritagePaginationDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 5 })
  totalPages!: number;

  @ApiProperty({ example: 100 })
  totalItems!: number;
}

export class LeaderboardByHeritageResponseDto {
  @ApiProperty({ type: () => [LeaderboardEntryResponseDto] })
  rankings!: LeaderboardEntryResponseDto[];

  @ApiProperty({ type: () => LeaderboardStatsDto })
  stats!: LeaderboardStatsDto;

  @ApiProperty({ type: () => LeaderboardByHeritagePaginationDto })
  pagination!: LeaderboardByHeritagePaginationDto;
}

export class DeleteLeaderboardResponseDto {
  @ApiProperty({ example: 'Leaderboard deleted successfully' })
  message!: string;
}
