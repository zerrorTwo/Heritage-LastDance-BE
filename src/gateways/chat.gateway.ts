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
import { ChatEventStore } from './chat-event.store';
import {
  ChatEventType,
  ChatRoomAction,
  ChatUserEvent,
  TypingEvent,
  JoinRoomData,
  LeaveRoomData,
  NewMessageData,
  GetMessagesData,
  JoinDMData,
  SendDMData,
  GetDMMessagesData,
} from './contract';

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

  constructor(
    private readonly chatRoomService: ChatRoomService,
    private readonly eventStore: ChatEventStore,
  ) {}

  handleConnection(client: AuthenticatedSocket) {
    try {
      const decoded = this.authenticate(client);
      if (!decoded) {
        client.disconnect();
        return;
      }

      client.data.userId = decoded.sub;
      client.data.username = decoded.email ?? decoded.sub;
      client.data.email = decoded.email ?? '';

      this.userSocketMap.set(decoded.sub, client.id);

      this.eventStore.add({
        type: ChatEventType.Connected,
        date: new Date(),
        userId: decoded.sub,
        message: { socketId: client.id },
      });
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const userId = client.data.userId;
    if (userId) {
      this.userSocketMap.delete(userId);

      this.eventStore.add({
        type: ChatEventType.Disconnected,
        date: new Date(),
        userId,
        message: { socketId: client.id },
      });
    }
  }

  @SubscribeMessage(ChatRoomAction.JOIN)
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: JoinRoomData,
  ) {
    const { heritageId } = data;
    const userId = client.data.userId;
    const username = client.data.username;

    if (!heritageId || !userId) return;

    const roomId = `heritage_${heritageId}`;

    try {
      await this.chatRoomService.joinRoom(heritageId, { userId, username });
    } catch {
      // Room may not exist yet, continue
    }

    client.join(roomId);
    client.emit('room-joined', { roomId });

    const userEvent: ChatUserEvent = { userId, username, roomId };
    const users = await this.chatRoomService.getRoomUsers(heritageId);

    client.broadcast.to(roomId).emit('user-joined', userEvent);
    this.server.to(roomId).emit('room-users', { roomId, users });

      this.eventStore.add({
        type: ChatEventType.RoomJoined,
        date: new Date(),
        userId,
        roomId,
        message: userEvent,
      });
  }

  @SubscribeMessage(ChatRoomAction.LEAVE)
  async handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: LeaveRoomData,
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

    this.eventStore.add({
      type: ChatEventType.RoomLeft,
      date: new Date(),
      userId,
      roomId,
      message: { userId, roomId },
    });
  }

  @SubscribeMessage(ChatRoomAction.MESSAGE)
  async handleMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: NewMessageData,
  ) {
    const { roomId, content } = data;
    if (!content?.trim()) return;

    const heritageId = roomId.replace('heritage_', '');
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

      this.eventStore.add({
        type: ChatEventType.SentMessage,
        date: new Date(),
        userId,
        roomId,
        message: saved,
      });
    } catch (err) {
      client.emit('error', {
        message: err instanceof Error ? err.message : 'Unable to save message',
      });

      this.eventStore.add({
        type: ChatEventType.Error,
        date: new Date(),
        userId,
        roomId,
        message: { error: err instanceof Error ? err.message : 'Unable to save message' },
      });
    }
  }

  @SubscribeMessage(ChatRoomAction.TYPING)
  handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: TypingEvent,
  ) {
    const { roomId, isTyping } = data;
    const typingEvent: TypingEvent = {
      roomId,
      isTyping,
      userId: client.data.userId,
      username: client.data.username,
    };
    client.broadcast.to(roomId).emit('user-typing', typingEvent);
  }

  @SubscribeMessage(ChatRoomAction.GET_MESSAGES)
  async handleGetMessages(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: GetMessagesData,
  ) {
    const { roomId, limit = 50 } = data;
    const heritageId = roomId.replace('heritage_', '');
    if (!heritageId) return;

    const messages = await this.chatRoomService.getRoomMessages(heritageId, limit);
    client.emit('room-messages', { roomId, messages });
  }

  @SubscribeMessage(ChatRoomAction.JOIN_DM)
  async handleJoinDM(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: JoinDMData,
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

  @SubscribeMessage(ChatRoomAction.SEND_DM)
  async handleDirectMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SendDMData,
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

      this.eventStore.add({
        type: ChatEventType.SentMessage,
        date: new Date(),
        userId,
        message: saved,
      });
    } catch (err) {
      client.emit('error', { message: (err as Error).message });

      this.eventStore.add({
        type: ChatEventType.Error,
        date: new Date(),
        userId,
        message: { error: (err as Error).message },
      });
    }
  }

  @SubscribeMessage(ChatRoomAction.GET_DM_MESSAGES)
  async handleGetDMMessages(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: GetDMMessagesData,
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

  private authenticate(client: Socket): { sub: string; sessionId: string; email?: string } | null {
    const authToken: unknown = client.handshake.auth?.token
      ?? client.handshake.query?.token;
    const token = typeof authToken === 'string' ? authToken : null;

    if (!token) return null;

    const raw = token.startsWith('Bearer ') ? token.slice(7) : token;

    try {
      const env = loadEnv();
      const decoded = jwt.verify(raw, env.JWT_SECRET as string) as {
        sub: string;
        sessionId: string;
        email?: string;
      };
      return decoded?.sub && decoded?.sessionId ? decoded : null;
    } catch {
      return null;
    }
  }
}
