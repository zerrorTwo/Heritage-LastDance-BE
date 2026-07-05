import { IsString, IsOptional } from 'class-validator';

export class UpdateRelationDto {
  @IsOptional()
  @IsString()
  relationType?: string;
}
