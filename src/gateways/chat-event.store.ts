import { Injectable } from '@nestjs/common';
import { Observable, ReplaySubject } from 'rxjs';
import { ChatEvent, ChatEventType, IChatEventStore } from './contract';

@Injectable()
export class ChatEventStore implements IChatEventStore {
  private readonly events: Required<ChatEvent>[];
  private readonly events$: ReplaySubject<Required<ChatEvent>>;

  constructor() {
    this.events = [];
    this.events$ = new ReplaySubject<Required<ChatEvent>>(100);
  }

  list(by?: { types?: ChatEventType[] }): Required<ChatEvent>[] {
    let result = this.events;

    if (by?.types && by.types.length > 0) {
      result = result.filter((item) => by.types!.includes(item.type));
    }

    return result;
  }

  listen(): Observable<Required<ChatEvent>> {
    return this.events$.asObservable();
  }

  add(event: ChatEvent): number {
    const id = this.events.length + 1;
    const entry: Required<ChatEvent> = { id, ...event } as Required<ChatEvent>;

    this.events.push(entry);
    this.events$.next(entry);

    return id;
  }
}
