import { GameServer } from '../GameServer.js';
import { GameObject } from './GameObject.js';
import { Route } from './Route.js';
import type { TileCoord } from 'phaserquest-shared';

function randomInt(low: number, high: number): number {
  return Math.floor(Math.random() * (high - low) + low);
}

export abstract class MovingEntity extends GameObject {
  inFight = false;
  targetID: number | null = null;
  alive = true;
  foes: number[] = [];
  lastFightUpdate = Date.now();
  lastDamage = Date.now();
  route: Route | null = null;
  speed: number = 0;
  atk: number = 0;
  def: number = 0;
  life: number = 0;
  maxLife: number = 0;
  target: MovingEntity | null = null;
  lastHitter: MovingEntity | null = null;
  lastWalkUpdate = Date.now();
  orientation: number = 4;

  setTarget(entity: MovingEntity): void {
    this.target = entity;
    if (entity) this.targetID = entity.id;
  }

  hasFoe(entity: MovingEntity): boolean {
    return this.foes.indexOf(entity.id) >= 0;
  }

  addFoe(entity: MovingEntity): void {
    if (this.foes.indexOf(entity.id) < 0) this.foes.push(entity.id);
  }

  removeFoe(entity: MovingEntity): void {
    const idx = this.foes.indexOf(entity.id);
    if (idx >= 0) this.foes.splice(idx, 1);
  }

  manageFoes(): void {
    for (const id of this.foes) {
      const entity =
        GameServer.instance.players[id] ||
        GameServer.instance.monstersTable[id];
      if (entity) entity.removeFoe(this);
    }
    this.foes = [];
  }

  startFight(target: MovingEntity): void {
    this.inFight = true;
    this.setTarget(target);
    this.addFoe(target);
    target.addFoe(this);
  }

  endFight(): void {
    if (!this.inFight) return;
    this.inFight = false;
    this.setProperty('inFight', false);
    if (this.target) {
      this.removeFoe(this.target);
      this.target.removeFoe(this);
    }
    this.target = null;
    this.targetID = null;
  }

  takeDamage(from: MovingEntity): void {
    if (!this.alive) return;
    const now = Date.now();
    if (now - this.lastDamage < 1000) return;
    this.lastDamage = now;
    this.lastHitter = from;
    const damage = Math.max(1, from.atk - this.def);
    this.updateLife(-damage);
    this.setProperty('inFight', true);

    if (this.category === 'player' && 'updatePacket' in this) {
      (this as any).updatePacket.addHP(true, Math.abs(damage), from.id);
    }
    if (from.category === 'player' && 'updatePacket' in from) {
      (from as any).updatePacket.addHP(false, Math.abs(damage), this.id);
    }

    if (this.life <= 0) {
      this.life = 0;
      this.die();
    }
  }

  updateLife(amount: number): number {
    const oldLife = this.life;
    this.life = Math.max(0, Math.min(this.maxLife, this.life + amount));
    return this.life - oldLife;
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
      this.setProperty('x', this.route.path[this.route.path.length - 1].x);
      this.setProperty('y', this.route.path[this.route.path.length - 1].y);
      this.route = null;
    } else {
      this.setProperty('x', this.route.path[idx].x);
      this.setProperty('y', this.route.path[idx].y);
    }
    if (this.x !== previousX || this.y !== previousY) {
      GameServer.instance.moveAtLocation(this, previousX, previousY, this.x, this.y);
    }
  }

  setRoute(
    path: TileCoord[],
    departureTime: number,
    latency: number,
    action: any,
    orientation: number = 4
  ): void {
    this.route = new Route(this.id, path, departureTime, latency, action, orientation);
  }

  damage(): void {
    if (!this.target || !this.target.alive) return;
    this.target.takeDamage(this);
  }

  die(): void {
    this.alive = false;
    this.setProperty('alive', false);
    if (this.route) this.route = null;
    this.manageFoes();
    this.endFight();

    if (this.lastHitter && 'updatePacket' in this.lastHitter) {
      GameServer.instance.handleKill(this.lastHitter, this);
    }

    if (this.category === 'monster') {
      const monster = this as any;
      if (monster.lootTable) {
        GameServer.instance.dropLoot(monster.lootTable, this.x, this.y);
      }
      GameServer.instance.respawnCount(
        this.x, this.y, this,
        () => monster.respawn(),
        GameServer.instance.monsterRespawnDelay
      );
    }
  }

  abstract updateFight(): void;
  abstract getPathEnd(): TileCoord | null | undefined;

  protected rollForLoot(): void {
    // Override in Monster
  }
}
