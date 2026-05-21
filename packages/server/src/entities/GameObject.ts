import { GameServer } from '../GameServer.js';
import { AOIutils } from '../aoi/AOIutils.js';

export abstract class GameObject {
  id: number = 0;
  x: number = 0;
  y: number = 0;
  category: 'player' | 'monster' | 'item' = 'item';

  setProperty(property: string, value: any): void {
    (this as any)[property] = value;
    if (this.id !== undefined) this.updateAOIs(property, value);
  }

  updateAOIs(property: string, value: any): void {
    const AOIs = this.listAdjacentAOIs(true) as number[];
    const category = this.category;
    const id = this.id;
    for (const aoi of AOIs) {
      GameServer.instance.updateAOIProperty(aoi, category, id, property, value);
    }
  }

  getAOIid(): number {
    return GameServer.instance.AOIfromTiles.getFirst(this.x, this.y)!.id;
  }

  listAdjacentAOIs(onlyIDs: boolean): number[] | string[] {
    const current = this.getAOIid();
    const AOIs = AOIutils.listAdjacentAOIs(current);
    if (!onlyIDs) {
      return AOIs.map((a) => 'AOI' + a);
    }
    return AOIs;
  }

  abstract trim(): Record<string, any>;
}
