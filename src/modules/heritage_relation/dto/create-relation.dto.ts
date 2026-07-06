import { IsString, IsOptional } from 'class-validator';

export class CreateRelationDto {
  @IsString()
  fromId!: string;

  @IsString()
  toId!: string;

  @IsOptional()
  @IsString()
  relationType?: string;
}
