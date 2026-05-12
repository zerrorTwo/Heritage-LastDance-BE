import { Module } from '@nestjs/common';
import { ChatRoomModule } from '../modules/chat-room/module';
import { ChatGateway } from './chat.gateway';

@Module({
  imports: [ChatRoomModule],
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class ChatGatewayModule {}
