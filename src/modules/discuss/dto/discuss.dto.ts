import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateDiscussDto {
  @ApiProperty({ description: 'ID di tích', example: 'uuid-here' })
  @IsString()
  @IsNotEmpty()
  heritageId!: string;

  @ApiProperty({ description: 'ID bình luận cha (null nếu là root)', required: false })
  @IsString()
  @IsOptional()
  parentId?: string;

  @ApiProperty({ description: 'ID người dùng', example: 'uuid-here' })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ description: 'Nội dung thảo luận' })
  @IsString()
  @IsNotEmpty()
  content!: string;
}
