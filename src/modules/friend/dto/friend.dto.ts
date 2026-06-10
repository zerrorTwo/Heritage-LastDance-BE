import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendFriendRequestDto {
  @ApiProperty({ description: 'ID người muốn kết bạn' })
  @IsString()
  @IsNotEmpty()
  addresseeId!: string;
}

export class RespondFriendRequestDto {
  @ApiProperty({ description: 'true = chấp nhận, false = từ chối' })
  @IsBoolean()
  accept!: boolean;
}

export class SearchFriendQueryDto {
  @ApiProperty({ description: 'Từ khoá tìm theo tên hoặc email', required: false })
  @IsString()
  @IsOptional()
  q?: string;
}
