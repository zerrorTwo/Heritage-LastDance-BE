import { IsString, IsOptional, IsDate } from 'class-validator';

export class CreateTimelineDto {
  @IsString()
  heritageId!: string;

  @IsOptional()
  @IsDate()
  eventDate?: Date;

  @IsOptional()
  @IsString()
  description?: string;
}
