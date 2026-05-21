import type { PlayerState } from './player';
import type { MonsterState } from './monster';
import type { ItemState } from './item';

export interface GlobalUpdate {
  newplayers?: PlayerState[];
  newitems?: ItemState[];
  newmonsters?: MonsterState[];
  disconnected?: number[];
  players?: Record<number, Partial<PlayerState>>;
  monsters?: Record<number, Partial<MonsterState>>;
  items?: Record<number, Partial<ItemState>>;
}

export interface LocalUpdate {
  life?: number;
  x?: number;
  y?: number;
  noPick?: boolean;
  hp?: { target: boolean; hp: number; from: number }[];
  killed?: number[];
  used?: number[];
}

export interface ServerUpdate {
  stamp: number;
  latency: number;
  nbconnected: number;
  global?: GlobalUpdate;
  local?: LocalUpdate;
}

export interface InitPacket {
  stamp: number;
  nbconnected: number;
  nbAOIhorizontal: number;
  lastAOIid: number;
  player: PlayerState;
}
