import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateMcpTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
}
