import type { LocalUpdate } from 'phaserquest-shared';

export class PersonalUpdatePacket {
  life?: number;
  x?: number;
  y?: number;
  noPick?: boolean;
  hp: { target: boolean; hp: number; from: number }[] = [];
  killed: number[] = [];
  used: number[] = [];

  isEmpty(): boolean {
    if (this.life !== undefined) return false;
    if (this.x !== undefined) return false;
    if (this.y !== undefined) return false;
    if (this.noPick !== undefined) return false;
    if (this.hp.length > 0) return false;
    if (this.killed.length > 0) return false;
    if (this.used.length > 0) return false;
    return true;
  }

  clean(): LocalUpdate {
    const result: LocalUpdate = {};
    if (this.life !== undefined) result.life = this.life;
    if (this.x !== undefined) result.x = this.x;
    if (this.y !== undefined) result.y = this.y;
    if (this.noPick !== undefined) result.noPick = this.noPick;
    if (this.hp.length) result.hp = this.hp;
    if (this.killed.length) result.killed = this.killed;
    if (this.used.length) result.used = this.used;
    return result;
  }

  updatePosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  updateLife(life: number): void {
    this.life = life;
  }

  addHP(target: boolean, hp: number, from: number): void {
    this.hp.push({ target, hp, from });
  }

  addKilled(id: number): void {
    this.killed.push(id);
  }

  addUsed(id: number): void {
    this.used.push(id);
  }

  addNoPick(): void {
    this.noPick = true;
  }
}
