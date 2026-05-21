export interface MonsterRoute {
  path: { x: number; y: number }[];
  delta: number;
}

export interface MonsterState {
  id: number;
  x: number;
  y: number;
  monster: number;
  inFight: boolean;
  alive: boolean;
  targetID?: number;
  route?: MonsterRoute;
}
