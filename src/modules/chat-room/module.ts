import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ChatRoomModel,
  ChatRoomParticipantModel,
  MessageModel,
} from './model';
import {
  ChatRoomParticipantRepository,
  ChatRoomRepository,
  MessageRepository,
} from './repository';
import { ChatRoomService } from './service';
import { ChatRoomController } from './controller';
import { FriendModule } from '../friend/module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatRoomModel,
      ChatRoomParticipantModel,
      MessageModel,
    ]),
    FriendModule,
  ],
  controllers: [ChatRoomController],
  providers: [
    ChatRoomRepository,
    ChatRoomParticipantRepository,
    MessageRepository,
    ChatRoomService,
  ],
  exports: [
    ChatRoomRepository,
    ChatRoomParticipantRepository,
    MessageRepository,
    ChatRoomService,
  ],
})
export class ChatRoomModule {}
