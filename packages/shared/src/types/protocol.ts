import type { InitPacket, ServerUpdate } from './update';

export interface TileCoord {
  x: number;
  y: number;
}

export interface GameAction {
  action: number;
  id?: number;
  x?: number;
  y?: number;
}

export type ClientMessage =
  | { type: 'init_world'; new: boolean; name?: string; id?: string; clientTime: number }
  | { type: 'path'; path: TileCoord[]; action: GameAction; or: number }
  | { type: 'revive' }
  | { type: 'chat'; text: string }
  | { type: 'delete'; id: string }
  | { type: 'ponq'; stamp: number };

export type ServerMessage =
  | { type: 'init'; data: InitPacket }
  | { type: 'update'; data: ServerUpdate }
  | { type: 'pid'; playerID: string }
  | { type: 'reset'; data: { x: number; y: number } }
  | { type: 'dbError'; message?: string }
  | { type: 'wait' }
  | { type: 'chat'; data: { id: number; text: string } };
