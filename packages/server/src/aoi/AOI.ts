import type { GameObject } from '../entities/GameObject.js';
import { UpdatePacket } from '../packets/UpdatePacket.js';
import { GameServer } from '../GameServer.js';

export class AOI {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  entities: GameObject[] = [];
  updatePacket: UpdatePacket;

  constructor(x: number, y: number, w: number, h: number) {
    this.id = 0; // set by caller
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
    this.updatePacket = new UpdatePacket();
  }

  getUpdatePacket(): UpdatePacket {
    return this.updatePacket;
  }

  clear(): void {
    this.updatePacket = new UpdatePacket();
  }

  addEntity(entity: GameObject, previous: number | null): void {
    this.entities.push(entity);
    if ('socketID' in entity) {
      GameServer.instance.broadcaster.addToRoom(
        (entity as any).socketID as string,
        'AOI' + this.id
      );
    }
    GameServer.instance.handleAOITransition(entity, previous);
  }

  deleteEntity(entity: GameObject): void {
    const idx = this.entities.indexOf(entity);
    if (idx >= 0) this.entities.splice(idx, 1);
    if ('socketID' in entity) {
      GameServer.instance.broadcaster.leaveRoom(
        (entity as any).socketID as string,
        'AOI' + this.id
      );
    }
  }
}
