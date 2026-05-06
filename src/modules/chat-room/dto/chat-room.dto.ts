import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsEnum,
  IsArray,
} from 'class-validator';
import { ChatRoomType, MessageType } from '../model';

export class CreateChatRoomDto {
  @ApiProperty({ description: 'Tên phòng chat', example: 'Thảo luận Cố đô Huế' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'ID di tích (nếu là phòng của di tích)', required: false })
  @IsString()
  @IsOptional()
  heritageId?: string;

  @ApiProperty({
    description: 'Loại phòng chat (HERITAGE hoặc DIRECT)',
    enum: ChatRoomType,
    required: false,
    default: ChatRoomType.HERITAGE,
  })
  @IsEnum(ChatRoomType)
  @IsOptional()
  type?: ChatRoomType;

  @ApiProperty({
    description: 'Danh sách ID người tham gia ban đầu (chỉ với DIRECT cần 2 người)',
    type: [String],
    required: false,
  })
  @IsArray()
  @IsOptional()
  participants?: string[];
}

export class JoinRoomDto {
  @ApiProperty({ description: 'ID người dùng', example: 'uuid-here' })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ description: 'Tên hiển thị người dùng', example: 'Nguyễn Văn A' })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ description: 'Socket ID (nếu có)', required: false })
  @IsString()
  @IsOptional()
  socketId?: string;
}

export class SaveMessageDto {
  @ApiProperty({ description: 'ID phòng chat', example: 'uuid-here' })
  @IsString()
  @IsNotEmpty()
  roomId!: string;

  @ApiProperty({ description: 'ID người gửi', example: 'uuid-here' })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ description: 'Nội dung tin nhắn', example: 'Xin chào mọi người!' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiProperty({
    description: 'Loại tin nhắn',
    enum: MessageType,
    required: false,
    default: MessageType.TEXT,
  })
  @IsEnum(MessageType)
  @IsOptional()
  type?: MessageType;
}
