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
  async handleJoinDM(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId1: string; userId2: string; userData?: UserData },
  ) {
    const { userId1, userId2, userData } = data;
    if (!userId1 || !userId2) return;

    try {
      const room = await this.chatRoomService.findOrCreateDirectRoom(
        userId1,
        userId2,
        userData?.username,
      );
      client.join(room.id);
      client.emit('join-dm', { dmRoomId: room.id });
    } catch (err) {
      client.emit('error', { message: (err as Error).message });
    }
  }

  @SubscribeMessage('send-dm')
  async handleDirectMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      userId: string;
      otherUserId: string;
      message: { content: string; type?: string; username?: string };
    },
  ) {
    const { userId, otherUserId, message } = data;
    if (!message?.content?.trim()) return;

    try {
      const { room, message: saved } = await this.chatRoomService.saveDirectMessage(
        userId,
        otherUserId,
        message.content,
        undefined,
        message.username,
      );

      this.server.to(room.id).emit('new-dm', {
        ...saved,
        dmRoomId: room.id,
        username: message.username,
      });
    } catch (err) {
      client.emit('error', { message: (err as Error).message });
    }
  }

  @SubscribeMessage('get-dm-messages')
  async handleGetDMMessages(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { userId1: string; userId2: string; page?: number; limit?: number },
  ) {
    const { userId1, userId2, page = 1, limit = 20 } = data;
    if (!userId1 || !userId2) return;

    const result = await this.chatRoomService.getDirectMessages(
      userId1,
      userId2,
      page,
      limit,
    );
    client.emit('dm-messages', result);
  }
}
