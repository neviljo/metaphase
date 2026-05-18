export interface PlayerRoute {
  orientation: number;
  end: { x: number; y: number };
  delta: number;
}

export interface PlayerState {
  id: number;
  name: string;
  x: number;
  y: number;
  weapon: number;
  armor: number;
  aoi: number;
  targetID: number | null;
  inFight: boolean;
  alive: boolean;
  route?: PlayerRoute;
}
