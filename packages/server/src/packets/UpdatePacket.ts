import type { GameObject } from '../entities/GameObject.js';
import type { GlobalUpdate, PlayerState, MonsterState, ItemState } from 'phaserquest-shared';
import { AOI } from '../aoi/AOI.js';

export class UpdatePacket {
  newplayers: PlayerState[] = [];
  newitems: ItemState[] = [];
  newmonsters: MonsterState[] = [];
  disconnected: number[] = [];
  players: Record<number, Partial<PlayerState>> = {};
  items: Record<number, Partial<ItemState>> = {};
  monsters: Record<number, Partial<MonsterState>> = {};

  addObject(object: GameObject): void {
    let arr: any[];
    switch (object.category) {
      case 'player': arr = this.newplayers; break;
      case 'item': arr = this.newitems; break;
      case 'monster': arr = this.newmonsters; break;
      default: return;
    }
    for (let i = 0; i < arr.length; i++) {
      if (arr[i].id === object.id) return;
    }
    arr.push(object.trim());
  }

  addDisconnect(playerID: number): void {
    this.disconnected.push(playerID);
  }

  updateRoute(type: string, entityID: number, route: any): void {
    const map = type === 'player' ? this.players : this.monsters;
    if (!map[entityID]) map[entityID] = {};
    (map[entityID] as any).route = route;
  }

  updateProperty(type: string, id: number, property: string, value: any): void {
    let map: Record<number, any>;
    switch (type) {
      case 'item': map = this.items; break;
      case 'player': map = this.players; break;
      case 'monster': map = this.monsters; break;
      default: return;
    }
    if (!map[id]) map[id] = {};
    if (map[id][property] !== value) map[id][property] = value;
  }

  removeEcho(playerID: number): void {
    if (this.players[playerID]) {
      delete this.players[playerID].route;
      if (Object.keys(this.players[playerID]).length === 0) {
        delete this.players[playerID];
      }
    }
    let i = this.newplayers.length;
    while (i--) {
      const n = this.newplayers[i];
      if (n.id === playerID) {
        this.newplayers.splice(i, 1);
      } else {
        for (const key of Object.keys(this.players)) {
          if (n.id === Number(key)) {
            delete this.players[Number(key)];
          }
        }
      }
    }
  }

  synchronize(AOI: AOI): void {
    for (const entity of AOI.entities) {
      this.addObject(entity);
    }
  }

  isEmpty(): boolean {
    return (
      Object.keys(this.players).length === 0 &&
      Object.keys(this.monsters).length === 0 &&
      Object.keys(this.items).length === 0 &&
      this.newplayers.length === 0 &&
      this.newitems.length === 0 &&
      this.newmonsters.length === 0 &&
      this.disconnected.length === 0
    );
  }

  clean(): GlobalUpdate {
    const result: GlobalUpdate = {};
    if (Object.keys(this.players).length) result.players = this.players;
    if (Object.keys(this.monsters).length) result.monsters = this.monsters;
    if (Object.keys(this.items).length) result.items = this.items;
    if (this.newplayers.length) result.newplayers = this.newplayers;
    if (this.newitems.length) result.newitems = this.newitems;
    if (this.newmonsters.length) result.newmonsters = this.newmonsters;
    if (this.disconnected.length) result.disconnected = this.disconnected;
    return result;
  }
}
