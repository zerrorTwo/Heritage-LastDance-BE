import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class AddFavoriteDto {
  @ApiProperty({ description: 'ID người dùng', example: 'uuid-here' })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ description: 'ID di tích muốn thêm vào yêu thích', example: 'uuid-here' })
  @IsString()
  @IsNotEmpty()
  heritageId!: string;
}

export class FavoriteQueryDto {
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  page?: number;

  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  limit?: number;

  @ApiProperty({ required: false, default: 'en', enum: ['vi', 'en'] })
  @IsOptional()
  language?: string;
}
