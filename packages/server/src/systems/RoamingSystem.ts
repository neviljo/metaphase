import type { TileCoord } from 'phaserquest-shared';

function randomInt(low: number, high: number): number {
  return Math.floor(Math.random() * (high - low) + low);
}

export interface RoamingZone {
  x: number;
  y: number;
  width: number;
  height: number;
  nb: number;
  type: string;
}

export interface RoamingPosition {
  x: number;
  y: number;
  type: string;
}

export class RoamingSystem {
  generatePositions(zones: RoamingZone[], tileWidth: number, tileHeight: number): RoamingPosition[] {
    const positions: RoamingPosition[] = [];

    for (const zone of zones) {
      const seen = new Set<string>();
      while (seen.size < zone.nb) {
        const px = randomInt(zone.x, zone.x + zone.width);
        const py = randomInt(zone.y, zone.y + zone.height);
        const tx = Math.ceil(px / tileWidth);
        const ty = Math.ceil(py / tileHeight);
        const key = `${tx},${ty}`;
        if (!seen.has(key)) {
          seen.add(key);
          positions.push({ x: tx, y: ty, type: zone.type });
        }
      }
    }

    return positions;
  }
}
