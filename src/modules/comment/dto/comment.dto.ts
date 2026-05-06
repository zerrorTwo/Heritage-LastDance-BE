import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ description: 'ID của di tích', example: 'uuid-here' })
  @IsString()
  @IsNotEmpty()
  heritageId!: string;

  @ApiProperty({ description: 'Nội dung bình luận', example: 'Rất đẹp!' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiProperty({ description: 'Đánh giá (1–5)', example: 4, required: false })
  @IsNumber()
  @Min(1)
  @Max(5)
  @IsOptional()
  rating?: number;

  @ApiProperty({ description: 'Danh sách URL ảnh', required: false, type: [String] })
  @IsArray()
  @IsOptional()
  images?: string[];
}

export class UpdateCommentDto {
  @ApiProperty({ description: 'Nội dung bình luận', required: false })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty({ description: 'Đánh giá (1–5)', required: false })
  @IsNumber()
  @Min(1)
  @Max(5)
  @IsOptional()
  rating?: number;

  @ApiProperty({ description: 'Danh sách URL ảnh', required: false, type: [String] })
  @IsArray()
  @IsOptional()
  images?: string[];
}
