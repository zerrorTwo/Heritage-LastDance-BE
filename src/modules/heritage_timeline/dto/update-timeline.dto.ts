import { IsString, IsOptional, IsDate } from 'class-validator';

export class UpdateTimelineDto {
  @IsOptional()
  @IsDate()
  eventDate?: Date;

  @IsOptional()
  @IsString()
  description?: string;
}
