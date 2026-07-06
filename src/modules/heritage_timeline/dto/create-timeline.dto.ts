import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateTimelineDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  heritageId!: string;

  @ApiProperty({ example: '1945-09-02', required: false, nullable: true })
  @IsDateString()
  @IsOptional()
  eventDate?: string | null;

  @ApiProperty({ example: 'Major historical milestone.', required: false, nullable: true })
  @IsString()
  @IsOptional()
  description?: string | null;
}
