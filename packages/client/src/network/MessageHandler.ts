import type { ServerMessage } from 'phaserquest-shared';

export type MessageDispatcher = (msg: ServerMessage) => void;

export class ClientMessageHandler {
  private handlers = new Map<string, MessageDispatcher>();

  on(type: string, handler: MessageDispatcher): void {
    this.handlers.set(type, handler);
  }

  off(type: string): void {
    this.handlers.delete(type);
  }

  handle(msg: ServerMessage): void {
    const handler = this.handlers.get(msg.type);
    if (handler) {
      handler(msg);
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}
