import { GameServer } from '../GameServer.js';
import { MovingEntity } from '../entities/MovingEntity.js';
import { Item } from '../entities/Item.js';

export function setUpFight(A: MovingEntity, B: MovingEntity): void {
  if (!B || !A) return;
  const alreadyInFightA = A.inFight;
  const alreadyInFightB = B.inFight;
  A.startFight(B);
  B.startFight(A);
  if (!alreadyInFightA) A.damage();
  if (!alreadyInFightB) B.damage();
}

export function areFighting(A: MovingEntity, B: MovingEntity): boolean {
  return A.hasFoe(B) && B.hasFoe(A) && A.inFight && B.inFight;
}

export function handleKill(killer: MovingEntity, target: MovingEntity): void {
  setTimeout(() => {
    const gs = GameServer.instance;
    const monsterKey = Object.keys(gs.db.monsters).find(
      (k) => gs.db.monsters[k].id === (target as any).monster
    );
    if (monsterKey && 'updatePacket' in killer) {
      (killer as any).updatePacket.addKilled(gs.db.monsters[monsterKey].id);
    }
  }, 400);
}

export function formatLootTable(table: Record<string, number> | undefined): any[] | undefined {
  if (!table) return undefined;
  const lootTable: { weight: number; id: string }[] = [];
  let sum = 0;
  for (const [id, weight] of Object.entries(table)) {
    lootTable.push({ weight, id });
    sum += weight;
  }
  if (sum < 10) {
    lootTable.push({ weight: 10 - sum, id: 'none' });
  }
  return lootTable;
}

import rwc from 'random-weighted-choice';

export function dropLoot(table: any[] | undefined, x: number, y: number): void {
  const defaultTable = [
    { weight: 5, id: 'none' },
    { weight: 4, id: 'item-flask' },
    { weight: 1, id: 'item-burger' },
  ];
  const lootTable = table || defaultTable;
  const itm = rwc(lootTable) as string;
  if (itm && itm !== 'none') {
    const item = new Item(x, y, itm, false, false, true);
    item.makeTemporary();
    GameServer.instance.addAtLocation(item);
  }
}

export function spawnHiddenChest(properties: any): void {
  const gs = GameServer.instance;
  if (gs.items.getFirstFiltered(properties.x, properties.y, ['visible'])) return;
  const chest = new Item(properties.x, properties.y, properties.items, false, true, false);
  setTimeout(() => {
    gs.addAtLocation(chest);
  }, 500);
}
