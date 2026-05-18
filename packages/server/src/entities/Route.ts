import type { TileCoord } from 'phaserquest-shared';

export class Route {
  id: number;
  path: TileCoord[];
  departureTime: number;
  delta: number;
  action: any;
  orientation: number;

  constructor(
    entityId: number,
    path: TileCoord[],
    departureTime: number,
    latency: number,
    action: any,
    orientation: number
  ) {
    this.id = entityId;
    this.path = path;
    this.departureTime = departureTime;
    this.delta = Math.floor(latency);
    this.action = action;
    this.orientation = orientation;
  }

  trim(type: string): any {
    if (type === 'player') {
      return {
        orientation: this.orientation,
        end: this.path[this.path.length - 1],
        delta: this.delta,
      };
    } else if (type === 'monster') {
      return {
        path: this.path,
        delta: this.delta,
      };
    }
    return null;
  }
}
