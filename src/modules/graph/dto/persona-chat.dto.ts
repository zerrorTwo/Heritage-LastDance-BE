import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PersonaChatDto {
  @ApiProperty({ example: 'Ngài đã thắng quân Nguyên ở Bạch Đằng như thế nào?' })
  @IsString()
  @MaxLength(1000)
  question!: string;

  @ApiProperty({ required: false, description: 'Lịch sử hội thoại (tuỳ chọn)' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  history?: string;
}
