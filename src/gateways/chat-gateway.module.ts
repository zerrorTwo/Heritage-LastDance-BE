import { Module } from '@nestjs/common';
import { ChatRoomModule } from '../modules/chat-room/module';
import { ChatGateway } from './chat.gateway';
import { ChatEventStore } from './chat-event.store';

@Module({
  imports: [ChatRoomModule],
  providers: [ChatGateway, ChatEventStore],
  exports: [ChatGateway, ChatEventStore],
})
export class ChatGatewayModule {}
