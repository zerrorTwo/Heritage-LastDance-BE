export enum ChatEventType {
  SentMessage = 'SentMessage',
  ReceivedMessage = 'ReceivedMessage',
  Connected = 'Connected',
  Disconnected = 'Disconnected',
  RoomJoined = 'RoomJoined',
  RoomLeft = 'RoomLeft',
  Error = 'Error',
}

export enum MessageFormat {
  String = 'string',
  Json = 'json',
}

export enum ChatRoomAction {
  JOIN = 'join-room',
  LEAVE = 'leave-room',
  MESSAGE = 'new-message',
  TYPING = 'typing',
  GET_MESSAGES = 'get-messages',
  JOIN_DM = 'join-dm',
  SEND_DM = 'send-dm',
  GET_DM_MESSAGES = 'get-dm-messages',
}
