import type { ServerMessage, InitPacket } from 'phaserquest-shared';
import { WebSocket } from 'ws';

export class Broadcaster {
  private connections = new Map<string, WebSocket>();
  private rooms = new Map<string, Set<string>>();

  register(socketID: string, ws: WebSocket): void {
    this.connections.set(socketID, ws);
  }

  unregister(socketID: string): void {
    this.connections.delete(socketID);
    for (const [, members] of this.rooms) {
      members.delete(socketID);
    }
  }

  sendTo(socketID: string, msg: ServerMessage): void {
    const ws = this.connections.get(socketID);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  addToRoom(socketID: string, room: string): void {
    if (!this.rooms.has(room)) this.rooms.set(room, new Set());
    this.rooms.get(room)!.add(socketID);
  }

  leaveRoom(socketID: string, room: string): void {
    this.rooms.get(room)?.delete(socketID);
  }

  sendToRoom(room: string, msg: ServerMessage, exclude?: string): void {
    const members = this.rooms.get(room);
    if (!members) return;
    for (const sid of members) {
      if (sid !== exclude) this.sendTo(sid, msg);
    }
  }

  sendInit(socketID: string, packet: InitPacket): void {
    this.sendTo(socketID, { type: 'init', data: packet });
  }

  getShortStamp(): number {
    return parseInt(Date.now().toString().slice(-9));
  }
}
