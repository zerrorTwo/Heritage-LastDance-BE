import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateTimelineDto {
  @ApiProperty({ example: '1945-09-02', required: false, nullable: true })
  @IsDateString()
  @IsOptional()
  eventDate?: string | null;

  @ApiProperty({ example: 'Updated milestone description.', required: false, nullable: true })
  @IsString()
  @IsOptional()
  description?: string | null;
}
