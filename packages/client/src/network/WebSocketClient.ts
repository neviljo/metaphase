import type { ServerMessage, ClientMessage } from 'phaserquest-shared';

type MsgHandler = (msg: ServerMessage) => void;
type StatusCallback = (status: 'connecting' | 'connected' | 'disconnected' | 'error', err?: string) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private handler: MsgHandler | null = null;
  private statusCallback: StatusCallback | null = null;
  private pendingMessages: ClientMessage[] = [];
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;

  connect(url: string): void {
    this.intentionalClose = false;
    this.statusCallback?.('connecting');
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.statusCallback?.('connected');
      for (const msg of this.pendingMessages) {
        this.ws?.send(JSON.stringify(msg));
      }
      this.pendingMessages = [];
      this.startPing();
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
      this.stopPing();
      this.statusCallback?.('disconnected');
      if (!this.intentionalClose) {
        this.reconnectTimer = setTimeout(() => this.connect(url), 2000);
      }
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
    this.intentionalClose = true;
    this.stopPing();
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  private startPing(): void {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      this.send({ type: 'ponq', stamp: parseInt(Date.now().toString().slice(-9)) });
    }, 5000);
  }

  private stopPing(): void {
    if (this.pingInterval !== null) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}

export const wsClient = new WebSocketClient();
