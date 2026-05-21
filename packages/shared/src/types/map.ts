import type { TileCoord } from './protocol';

export interface TileProperties {
  c?: number;
}

export interface DoorTarget {
  to: TileCoord;
  camera: { x: number; y: number } | null;
  orientation: number;
}

export interface ChestAreaProperties {
  x: number;
  y: number;
  items: string;
}
