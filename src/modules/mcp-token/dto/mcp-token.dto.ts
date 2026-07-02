import { IsArray, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMcpTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  scopes?: string[];
}

