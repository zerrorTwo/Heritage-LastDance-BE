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
import * as jwt from 'jsonwebtoken';
import loadEnv from '../config/configuration';
import { ChatRoomService } from '../modules/chat-room/service';
import { MessageType } from '../modules/chat-room/model';

const env = loadEnv();

interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    username: string;
    email: string;
  };
}

@WebSocketGateway({
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? (process.env.ALLOWED_ORIGINS || 'https://yourdomain.com').split(',').map(o => o.trim()).filter(Boolean)
      : true,
    credentials: true,
  },
  pingInterval: 25000,
  pingTimeout: 60000,
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private userSocketMap = new Map<string, string>();

  constructor(private readonly chatRoomService: ChatRoomService) {}

  handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.disconnect();
        return;
      }

      const decoded = jwt.verify(token, env.JWT_SECRET as string) as {
        sub: string;
        sessionId: string;
        email?: string;
      };

      if (!decoded?.sub || !decoded?.sessionId) {
        client.disconnect();
        return;
      }

      client.data.userId = decoded.sub;
      client.data.username = decoded.email ?? decoded.sub;
      client.data.email = decoded.email ?? '';

      this.userSocketMap.set(decoded.sub, client.id);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      this.userSocketMap.delete(userId);
    }
  }

  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { heritageId: string },
  ) {
    const { heritageId } = data;
    const userId = client.data.userId;
    const username = client.data.username;

    if (!heritageId || !userId) return;

    const roomId = `heritage_${heritageId}`;

    try {
      await this.chatRoomService.joinRoom(heritageId, {
        userId,
        username,
      });
    } catch {
      // Room may not exist yet, continue
    }

    client.join(roomId);
    client.emit('room-joined', { roomId });

    const userData = { userId, username };
    const users = await this.chatRoomService.getRoomUsers(heritageId);
    client.broadcast.to(roomId).emit('user-joined', { ...userData, roomId });
    this.server.to(roomId).emit('room-users', { roomId, users });
  }

  @SubscribeMessage('leave-room')
  async handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { heritageId: string },
  ) {
    const { heritageId } = data;
    const userId = client.data.userId;
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
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: { roomId: string; content: string },
  ) {
    const { roomId, content } = data;
    if (!content?.trim()) return;

    const heritageId = roomId?.replace('heritage_', '');
    if (!heritageId) return;

    const userId = client.data.userId;
    const username = client.data.username;

    try {
      const saved = await this.chatRoomService.saveMessage({
        roomId: heritageId,
        userId,
        content,
        type: MessageType.TEXT,
        username,
      });

      this.server.to(roomId).emit('new-message', {
        ...saved,
        username,
        roomId,
      });
    } catch (err) {
      client.emit('error', {
        message: err instanceof Error ? err.message : 'Unable to save message',
      });
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; isTyping: boolean },
  ) {
    const { roomId, isTyping } = data;
    client.broadcast.to(roomId).emit('user-typing', {
      userId: client.data.userId,
      username: client.data.username,
      isTyping,
    });
  }

  @SubscribeMessage('get-messages')
  async handleGetMessages(
    @ConnectedSocket() client: AuthenticatedSocket,
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
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { otherUserId: string },
  ) {
    const { otherUserId } = data;
    const userId = client.data.userId;
    if (!otherUserId) return;

    try {
      const room = await this.chatRoomService.findOrCreateDirectRoom(
        userId,
        otherUserId,
        client.data.username,
      );
      client.join(room.id);
      client.emit('join-dm', { dmRoomId: room.id });
    } catch (err) {
      client.emit('error', { message: (err as Error).message });
    }
  }

  @SubscribeMessage('send-dm')
  async handleDirectMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      otherUserId: string;
      content: string;
    },
  ) {
    const { otherUserId, content } = data;
    if (!content?.trim()) return;

    const userId = client.data.userId;

    try {
      const { room, message: saved } = await this.chatRoomService.saveDirectMessage(
        userId,
        otherUserId,
        content,
        undefined,
        client.data.username,
      );

      this.server.to(room.id).emit('new-dm', {
        ...saved,
        dmRoomId: room.id,
        username: client.data.username,
      });
    } catch (err) {
      client.emit('error', { message: (err as Error).message });
    }
  }

  @SubscribeMessage('get-dm-messages')
  async handleGetDMMessages(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: { otherUserId: string; page?: number; limit?: number },
  ) {
    const { otherUserId, page = 1, limit = 20 } = data;
    if (!otherUserId) return;

    const result = await this.chatRoomService.getDirectMessages(
      client.data.userId,
      otherUserId,
      page,
      limit,
    );
    client.emit('dm-messages', result);
  }

  private extractToken(client: Socket): string | null {
    const token = client.handshake.auth?.token
      || client.handshake.query?.token as string;

    if (!token) return null;

    if (token.startsWith('Bearer ')) {
      return token.slice(7);
    }

    return token;
  }
}
