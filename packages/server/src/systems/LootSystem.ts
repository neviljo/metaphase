import rwc from 'random-weighted-choice';
import { GameServer } from '../GameServer.js';
import { Item } from '../entities/Item.js';

const DEFAULT_LOOT_TABLE = [
  { weight: 5, id: 'none' },
  { weight: 4, id: 'item-flask' },
  { weight: 1, id: 'item-burger' },
];

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

export function dropLoot(table: any[] | undefined, x: number, y: number): void {
  const lootTable = table || DEFAULT_LOOT_TABLE;
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
