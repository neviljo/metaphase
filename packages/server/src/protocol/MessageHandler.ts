import type { ClientMessage } from 'phaserquest-shared';
import { WebSocket } from 'ws';
import { GameServer } from '../GameServer.js';

let connectionCounter = 0;

export class MessageHandler {
  private ws: WebSocket;
  private gs: GameServer;
  socketID: string;
  private pings: number[] = [];
  latency = 0;

  constructor(ws: WebSocket, gs: GameServer) {
    this.ws = ws;
    this.gs = gs;
    this.socketID = 'conn_' + ++connectionCounter;
  }

  handle(raw: Buffer | string): void {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    switch (msg.type) {
      case 'init_world':
        this.handleInitWorld(msg);
        break;
      case 'path':
        this.handlePath(msg);
        break;
      case 'revive':
        this.handleRevive();
        break;
      case 'chat':
        this.handleChat(msg.text);
        break;
      case 'delete':
        this.handleDelete(msg.id);
        break;
      case 'ponq':
        this.handlePonq(msg.stamp);
        break;
    }
  }

  send(msg: any): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private handleInitWorld(msg: ClientMessage & { type: 'init_world' }): void {
    if (!this.gs.mapReady) {
      this.send({ type: 'wait' });
      return;
    }
    if (msg.new) {
      if (!this.gs.checkSocketID(this.socketID)) {
        this.send({ type: 'dbError', message: 'Session already active' });
        return;
      }
      this.gs.addNewPlayer(this.socketID, msg.name || 'Player', (playerID) => {
        this.send({ type: 'pid', playerID });
      });
    } else {
      if (!this.gs.checkPlayerID(msg.id!)) {
        this.send({ type: 'dbError', message: 'Player already connected' });
        return;
      }
      this.gs.loadPlayer(this.socketID, msg.id!, () => {
        this.send({ type: 'pid', playerID: msg.id! });
      });
    }
  }

  private handlePath(msg: ClientMessage & { type: 'path' }): void {
    const ok = this.gs.handlePath(msg.path, msg.action, msg.or, this.socketID, this.latency);
    if (!ok) {
      const pos = this.gs.getCurrentPosition(this.socketID);
      if (pos) this.send({ type: 'reset', data: pos });
    }
  }

  private handleRevive(): void {
    const playerID = this.gs.getPlayerID(this.socketID);
    if (playerID !== undefined) this.gs.revivePlayer(playerID);
  }

  private handleChat(text: string): void {
    if (!text.length || text.length > 300) return;
    const rooms = this.gs.listAOIsFromSocket(this.socketID);
    const playerID = this.gs.getPlayerID(this.socketID);
    for (const room of rooms) {
      this.gs.broadcaster.sendToRoom(room, {
        type: 'chat',
        data: { id: playerID!, text },
      });
    }
  }

  private handleDelete(id: string): void {
    this.gs.deletePlayer(id);
  }

  private handlePonq(sentStamp: number): void {
    const ss = this.gs.broadcaster.getShortStamp();
    const delta = Math.max(0, (ss - sentStamp) / 2);
    this.pings.push(delta);
    if (this.pings.length > 20) this.pings.shift();
    this.latency = this.quickMedian([...this.pings]);
  }

  private quickMedian(arr: number[]): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  onDisconnect(): void {
    this.gs.removePlayer(this.socketID);
  }
}
