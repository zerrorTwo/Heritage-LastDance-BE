import { Observable } from 'rxjs';
import { ChatEvent } from './chat-event.type';
import { ChatEventType } from './chat-event.enum';

export interface IChatEventStore {
  list(by?: { types?: ChatEventType[] }): Required<ChatEvent>[];
  listen(): Observable<Required<ChatEvent>>;
  add(event: ChatEvent): number;
}
