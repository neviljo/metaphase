import { GameServer } from '../GameServer.js';
import { MovingEntity } from './MovingEntity.js';
import { PersonalUpdatePacket } from '../packets/PersonalUpdatePacket.js';
import type { PlayerState, TileCoord } from 'phaserquest-shared';
import { Item } from './Item.js';
import { PlayerModel } from '../db/models/PlayerModel.js';
import { Types } from 'mongoose';

export class Player extends MovingEntity {
  name: string;
  socketID: string = '';
  mongoID: string = '';
  weapon: number = 0;
  armor: number = 0;
  aoi: number = 0;
  lastSavedPosition: TileCoord = { x: 0, y: 0 };
  updatePacket: PersonalUpdatePacket;
  newAOIs: number[] = [];
  connected = true;
  latency = 0;
  lastTeleport = 0;

  constructor(name: string) {
    super();
    this.name = name;
    const start = GameServer.instance.determineStartingPosition();
    this.x = start.x;
    this.y = start.y;
    this.setAOI();
    this.category = 'player';
    this.maxLife = 100;
    this.life = this.maxLife;
    this.speed = 120;
    this.atk = 0;
    this.def = 0;
    this.orientation = 4;
    this.equip(1, 'sword1');
    this.equip(2, 'clotharmor');
    this.updatePacket = new PersonalUpdatePacket();
    this.newAOIs = [];
  }

  setAOI(): void {
    this.aoi = this.getAOIid();
  }

  setIDs(dbId: string, socketId: string): void {
    this.id = GameServer.instance.lastPlayerID++;
    GameServer.instance.IDmap.set(this.id, dbId);
    this.socketID = socketId;
  }

  getMongoID(): string {
    return GameServer.instance.IDmap.get(this.id) || '';
  }

  setLastSavedPosition(): void {
    this.lastSavedPosition = { x: this.x, y: this.y };
  }

  resetPosition(): void {
    this.setProperty('x', this.lastSavedPosition.x);
    this.setProperty('y', this.lastSavedPosition.y);
  }

  trim(): PlayerState {
    const trimmed: PlayerState = {
      id: this.id,
      name: this.name,
      x: Math.floor(this.x),
      y: Math.floor(this.y),
      weapon: this.weapon,
      armor: this.armor,
      aoi: this.aoi,
      targetID: this.target ? this.target.id : null,
      inFight: this.inFight,
      alive: this.alive,
    };
    if (this.route) trimmed.route = this.route.trim('player') as any;
    if (this.target) trimmed.targetID = this.target.id;
    return trimmed;
  }

  dbTrim(): Record<string, any> {
    return {
      x: this.x,
      y: this.y,
      name: this.name,
      weapon: GameServer.instance.db.itemsIDmap[this.weapon] || 'sword1',
      armor: GameServer.instance.db.itemsIDmap[this.armor] || 'clotharmor',
    };
  }

  async getDataFromDb(doc: any): Promise<void> {
    this.x = doc.x;
    this.y = doc.y;
    this.name = doc.name;
    this.setAOI();
    this.equip(1, doc.weapon || 'sword1');
    this.equip(2, doc.armor || 'clotharmor');
  }

  getIndividualUpdatePackage(): any {
    if (this.updatePacket.isEmpty()) return null;
    const pkg = this.updatePacket;
    this.updatePacket = new PersonalUpdatePacket();
    return pkg;
  }

  getPathEnd(): TileCoord | null {
    if (!this.route || !this.route.path || this.route.path.length === 0) return null;
    return this.route.path[this.route.path.length - 1];
  }

  updateFight(): void {
    this.lastFightUpdate = Date.now();
    if (!this.target || !this.target.alive) return;
    const direction = GameServer.instance.adjacentNoDiagonal(this, this.target);
    if (direction > 0) this.damage();
  }

  updateLife(amount: number): number {
    const result = super.updateLife(amount);
    this.updatePacket.updateLife(this.life);
    return result;
  }

  regenerate(): void {
    this.updateLife(2);
  }

  equip(type: number, item: string): void {
    const equipInfo = GameServer.instance.db.items[item];
    if (!equipInfo) return;
    if (type === 1) {
      this.atk = equipInfo.atk;
      this.setProperty('weapon', equipInfo.id);
    } else if (type === 2) {
      this.def = equipInfo.def;
      this.setProperty('armor', equipInfo.id);
    }
  }

  applyItem(item: Item): boolean {
    const itemInfo = GameServer.instance.db.items[item.itemKey];
    if (!itemInfo) return false;
    let picked = true;
    if (itemInfo.heals) {
      const difference = this.updateLife(itemInfo.heals);
      this.updatePacket.addHP(false, difference, 0);
      this.updatePacket.addUsed(itemInfo.id);
    } else if (itemInfo.equip) {
      const equipInfo = GameServer.instance.db.items[itemInfo.equip];
      const type = equipInfo.type;
      if (type === 1) {
        if (this.atk >= equipInfo.atk) {
          this.updatePacket.addNoPick();
          picked = false;
        }
      } else if (type === 2) {
        if (this.def >= equipInfo.def) {
          this.updatePacket.addNoPick();
          picked = false;
        }
      }
      if (picked) {
        this.equip(type, itemInfo.equip);
        if (this.x < 92) GameServer.instance.savePlayer(this);
        this.updatePacket.addUsed(equipInfo.id);
      }
    }
    return picked;
  }

  teleport(door: any): void {
    const fromX = this.x;
    const fromY = this.y;
    let targetX = door.to.x;
    let targetY = door.to.y;

    // If the destination lands on another door tile, scoot off it
    // so the player doesn't ping-pong back and forth every tick.
    const gs = GameServer.instance;
    if (gs.doors.getFirst(targetX, targetY)) {
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nx = targetX + dx;
        const ny = targetY + dy;
        if (
          gs.collisionGrid[ny]?.[nx] === 0 &&
          !gs.doors.getFirst(nx, ny)
        ) {
          targetX = nx;
          targetY = ny;
          break;
        }
      }
    }

    this.x = targetX;
    this.y = targetY;
    if (door.orientation) this.orientation = door.orientation;
    this.route = null;
    this.lastTeleport = Date.now();
    gs.moveAtLocation(this, fromX, fromY, this.x, this.y);
    this.setProperty('x', this.x);
    this.setProperty('y', this.y);
    this.updatePacket.updatePosition(this.x, this.y);
    this.manageFoes();
    this.endFight();
  }

  revive(): void {
    if (this.alive) return;
    this.life = this.maxLife;
    this.resetPosition();
    this.setProperty('alive', true);
    this.updatePacket.updatePosition(this.x, this.y);
  }
}
