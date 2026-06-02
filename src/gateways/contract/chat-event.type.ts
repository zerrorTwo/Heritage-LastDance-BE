import { ChatEventType, MessageFormat } from './chat-event.enum';

export type ChatEvent<TMessage = unknown> = {
  id?: number;
  type: ChatEventType;
  date: Date;
  message: TMessage;
  roomId?: string;
  userId?: string;
};

export type ChatMessage = {
  id: string;
  roomId: string;
  userId: string;
  content: string;
  username: string;
  type: string;
  createdAt: Date;
};

export type ChatUserEvent = {
  userId: string;
  username: string;
  roomId: string;
};

export type TypingEvent = {
  userId: string;
  username: string;
  roomId: string;
  isTyping: boolean;
};

export type JoinRoomData = {
  heritageId: string;
};

export type LeaveRoomData = {
  heritageId: string;
};

export type NewMessageData = {
  roomId: string;
  content: string;
};

export type GetMessagesData = {
  roomId: string;
  limit?: number;
  lastMessageTimestamp?: string;
};

export type JoinDMData = {
  otherUserId: string;
};

export type SendDMData = {
  otherUserId: string;
  content: string;
};

export type GetDMMessagesData = {
  otherUserId: string;
  page?: number;
  limit?: number;
};

export type StoredMessage = {
  format: MessageFormat;
  event: string;
  data: unknown;
};
