import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatRoomService } from '../modules/chat-room/service';

interface UserData {
  userId: string;
  username: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? (process.env.ALLOWED_ORIGINS || '').split(',')
      : true,
    credentials: true,
  },
  pingInterval: 25000,
  pingTimeout: 60000,
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSocketMap = new Map<string, string>();

  constructor(private readonly chatRoomService: ChatRoomService) {}

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    const username = client.handshake.query.userName as string;

    if (!userId) {
      client.disconnect();
      return;
    }

    this.userSocketMap.set(userId, client.id);
    client.data.userId = userId;
    client.data.username = username || 'Anonymous';
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      this.userSocketMap.delete(userId);
    }
  }

  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { heritageId: string; userData: UserData },
  ) {
    const { heritageId, userData } = data;
    if (!heritageId || !userData?.userId) return;

    const roomId = `heritage_${heritageId}`;

    try {
      await this.chatRoomService.joinRoom(heritageId, {
        userId: userData.userId,
        username: userData.username,
      });
    } catch {
      // Room may not exist yet, continue
    }

    client.join(roomId);
    client.emit('room-joined', { roomId });

    const users = await this.chatRoomService.getRoomUsers(heritageId);
    client.broadcast.to(roomId).emit('user-joined', { ...userData, roomId });
    this.server.to(roomId).emit('room-users', { roomId, users });
  }

  @SubscribeMessage('leave-room')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { heritageId: string; userId: string },
  ) {
    const { heritageId, userId } = data;
    const roomId = `heritage_${heritageId}`;

    try {
      await this.chatRoomService.leaveRoom(heritageId, userId);
    } catch {
      // ignore
    }

    client.leave(roomId);
    client.broadcast.to(roomId).emit('user-left', { userId, roomId });

    const users = await this.chatRoomService.getRoomUsers(heritageId);
    this.server.to(roomId).emit('room-users', { roomId, users });
  }

  @SubscribeMessage('new-message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { roomId: string; message: { content: string; userId: string; username: string } },
  ) {
    const { roomId, message } = data;
    if (!message?.content?.trim()) return;

    const heritageId = roomId?.replace('heritage_', '');
    if (!heritageId) return;

    try {
      const saved = await this.chatRoomService.saveMessage({
        roomId: heritageId,
        userId: message.userId,
        content: message.content,
        type: 'text',
        username: message.username,
      });

      this.server.to(roomId).emit('new-message', {
        ...saved,
        username: message.username,
        roomId,
      });
    } catch (err) {
      client.emit('error', { message: err.message });
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; isTyping: boolean; userId: string; username: string },
  ) {
    const { roomId } = data;
    client.broadcast.to(roomId).emit('user-typing', {
      userId: data.userId,
      username: data.username,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('get-messages')
  async handleGetMessages(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { roomId: string; limit?: number; lastMessageTimestamp?: string },
  ) {
    const { roomId, limit = 50 } = data;
    const heritageId = roomId?.replace('heritage_', '');
    if (!heritageId) return;

    const messages = await this.chatRoomService.getRoomMessages(heritageId, limit);
    client.emit('room-messages', { roomId, messages });
  }

  @SubscribeMessage('join-dm')
  handleJoinDM(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId1: string; userId2: string; userData: UserData },
  ) {
    const { userId1, userId2 } = data;
    const dmRoomId = [userId1, userId2].sort().join('-');
    client.join(dmRoomId);
    client.emit('join-dm', { dmRoomId });
  }

  @SubscribeMessage('send-dm')
  handleDirectMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { dmRoomId: string; userId: string; message: string },
  ) {
    const { dmRoomId, userId, message } = data;
    this.server.to(dmRoomId).emit('new-dm', {
      userId,
      message,
      dmRoomId,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('get-dm-messages')
  handleGetDMMessages(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { dmRoomId: string; limit?: number },
  ) {
    client.emit('dm-messages', {
      dmRoomId: data.dmRoomId,
      messages: [],
    });
  }
}
