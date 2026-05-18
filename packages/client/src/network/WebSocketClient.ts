import type { ServerMessage, ClientMessage } from 'phaserquest-shared';

type MsgHandler = (msg: ServerMessage) => void;
type StatusCallback = (status: 'connecting' | 'connected' | 'disconnected' | 'error', err?: string) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private handler: MsgHandler | null = null;
  private statusCallback: StatusCallback | null = null;
  private pendingMessages: ClientMessage[] = [];

  connect(url: string): void {
    this.statusCallback?.('connecting');
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.statusCallback?.('connected');
      for (const msg of this.pendingMessages) {
        this.ws?.send(JSON.stringify(msg));
      }
      this.pendingMessages = [];
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);
        this.handler?.(msg);
      } catch {
        // ignore parse errors
      }
    };

    this.ws.onerror = () => {
      this.statusCallback?.('error', 'Connection failed');
    };

    this.ws.onclose = () => {
      this.statusCallback?.('disconnected');
      setTimeout(() => this.connect(url), 2000);
    };
  }

  onMessage(handler: MsgHandler): void {
    this.handler = handler;
  }

  onStatus(cb: StatusCallback): void {
    this.statusCallback = cb;
  }

  send(msg: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      this.pendingMessages.push(msg);
    }
  }

  close(): void {
    this.ws?.close();
  }
}

export const wsClient = new WebSocketClient();
