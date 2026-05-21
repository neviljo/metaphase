import { GameServer } from '../GameServer.js';
import { MovingEntity } from './MovingEntity.js';
import type { MonsterState, TileCoord } from 'phaserquest-shared';
import { chestarea } from '../systems/ChestAreaSystem.js';

export class Monster extends MovingEntity {
  startX: number;
  startY: number;
  monster: number;
  aggro: boolean;
  name: string;
  lootTable: any;
  chestArea: any = null;
  lastPositionCheck: number;

  constructor(x: number, y: number, monsterKey: string) {
    super();
    this.id = GameServer.instance.lastMonsterID++;
    this.x = x;
    this.y = y;
    this.startX = x;
    this.startY = y;
    this.category = 'monster';
    const info = GameServer.instance.db.monsters[monsterKey];
    this.monster = info.id;
    this.aggro = info.aggressive !== undefined ? info.aggressive : true;
    this.maxLife = info.life;
    this.life = this.maxLife;
    this.speed = info.speed;
    this.atk = info.atk;
    this.def = info.def;
    this.name = info.name;
    this.lootTable = GameServer.instance.formatLootTable(info.lootTable);
    this.lastPositionCheck = Date.now();
    this.orientation = 4;
  }

  trim(): MonsterState {
    const trimmed: MonsterState = {
      id: this.id,
      x: this.x,
      y: this.y,
      monster: this.monster,
      inFight: this.inFight,
      alive: this.alive,
    };
    if (this.route) trimmed.route = this.route.trim('monster') as any;
    if (this.target) trimmed.targetID = this.target.id;
    return trimmed;
  }

  respawn(): void {
    this.life = this.maxLife;
    GameServer.instance.moveAtLocation(this, this.x, this.y, this.startX, this.startY);
    this.x = this.startX;
    this.y = this.startY;
    this.setProperty('alive', true);
    if (this.chestArea) this.chestArea.increment();
  }

  updateFight(): void {
    this.lastFightUpdate = Date.now();
    if (!this.alive || !this.target || !this.target.alive) return;
    const direction = GameServer.instance.adjacentNoDiagonal(this, this.target);
    let end: TileCoord | undefined;
    if (direction === -1) {
      end = GameServer.instance.findFreeAdjacentCell(this.x, this.y);
    } else if (direction === 0) {
      const pathEnd = this.target.getPathEnd();
      end = this.target.route
        ? (pathEnd ?? { x: this.target.x, y: this.target.y })
        : { x: this.target.x, y: this.target.y };
    }
    if (direction > 0) {
      this.damage();
    } else if (end) {
      this.move(end, true);
    }
  }

  getPathEnd(): TileCoord | null {
    if (!this.route || !this.route.path) return null;
    return this.route.path[this.route.path.length - 1];
  }

  updateWalk(): void {
    if (!this.route) return;
    const now = Date.now();
    if (now - this.lastWalkUpdate < 80) return;
    this.lastWalkUpdate = now;
    const elapsed = now - this.route.departureTime;
    const cellDuration = this.speed;
    const idx = Math.floor(elapsed / cellDuration);
    const previousX = this.x;
    const previousY = this.y;
    if (idx >= this.route.path.length) {
      this.x = this.route.path[this.route.path.length - 1].x;
      this.y = this.route.path[this.route.path.length - 1].y;
      this.route = null;
    } else {
      this.x = this.route.path[idx].x;
      this.y = this.route.path[idx].y;
    }
    if (this.x !== previousX || this.y !== previousY) {
      this.setProperty('x', this.x);
      this.setProperty('y', this.y);
      GameServer.instance.moveAtLocation(this, previousX, previousY, this.x, this.y);
    }
  }

  checkPosition(): void {
    this.lastPositionCheck = Date.now();
    if (!this.inFight && !this.route && (this.x !== this.startX || this.y !== this.startY)) {
      this.move({ x: this.startX, y: this.startY }, false);
    }
  }

  move(end: TileCoord, fight: boolean): void {
    const grid = GameServer.instance.PFgrid.clone();
    const rawPath = GameServer.instance.pathfinder.findPath(
      this.x,
      this.y,
      end.x,
      end.y,
      grid
    );
    if (fight && rawPath.length > 0) rawPath.pop();
    if (!rawPath.length) return;
    const path = rawPath.map((p: number[]) => ({ x: p[0], y: p[1] }));
    if (this.route) {
      const currentEnd = this.getPathEnd();
      if (
        currentEnd &&
        path[path.length - 1].x === currentEnd.x &&
        path[path.length - 1].y === currentEnd.y
      ) {
        return;
      }
    }
    this.setRoute(path, Date.now(), 0, undefined, 4);
  }
}
