import { GameServer } from '../GameServer.js';
import { GameObject } from './GameObject.js';
import type { ItemState } from 'phaserquest-shared';

export class Item extends GameObject {
  content: string;
  respawn: boolean;
  chest: boolean;
  inChest: boolean;
  loot: boolean;
  itemID: number;
  itemKey: string;
  visible: boolean;

  constructor(
    x: number,
    y: number,
    content: string,
    respawn: boolean,
    chest: boolean,
    loot: boolean
  ) {
    super();
    this.id = GameServer.instance.lastItemID++;
    this.x = x;
    this.y = y;
    this.category = 'item';
    this.content = content;
    this.respawn = respawn;
    this.chest = chest;
    this.inChest = chest;
    this.loot = loot;
    this.visible = false;
    this.itemID = 0;
    this.itemKey = '';
    this.spawn();
  }

  trim(): ItemState {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      itemID: this.itemID,
      visible: this.visible,
      respawn: this.respawn,
      chest: this.chest,
      inChest: this.inChest,
      loot: this.loot,
    };
  }

  pick(): void {
    if (!this.visible) return;
    this.setProperty('visible', false);
    if (this.respawn) {
      GameServer.instance.respawnCount(
        this.x,
        this.y,
        this,
        this.spawn.bind(this),
        GameServer.instance.itemRespawnDelay
      );
    } else {
      GameServer.instance.removeFromLocation(this);
    }
  }

  open(): void {
    this.setProperty('inChest', false);
    this.makeTemporary();
  }

  makeTemporary(): void {
    setTimeout(() => {
      this.pick();
    }, GameServer.instance.itemVanishDelay);
  }

  spawn(): void {
    this.setProperty('inChest', this.chest);
    this.setProperty('visible', true);
    this.setContent();
  }

  setContent(): void {
    let content = this.content || 'item-flask';
    const parts = content.split(',');
    const item = (this.chest ? 'item-' : '') + parts[Math.floor(Math.random() * parts.length)];
    const itemData = GameServer.instance.db.items[item];
    this.itemKey = item;
    this.setProperty('itemID', itemData ? itemData.id : 100);
  }
}
