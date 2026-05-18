import { create } from 'zustand';

interface GameState {
  playerId: number | null;
  playerName: string;
  hp: number;
  maxHp: number;
  nbConnected: number;
  latency: number;
  weapon: string;
  armor: string;
  alive: boolean;

  setPlayerId: (id: number) => void;
  setPlayerName: (name: string) => void;
  setHp: (hp: number) => void;
  setMaxHp: (hp: number) => void;
  setNbConnected: (n: number) => void;
  setLatency: (ms: number) => void;
  setWeapon: (w: string) => void;
  setArmor: (a: string) => void;
  setAlive: (a: boolean) => void;
  reset: () => void;
}

const initialState = {
  playerId: null as number | null,
  playerName: '',
  hp: 100,
  maxHp: 100,
  nbConnected: 0,
  latency: 0,
  weapon: 'sword1',
  armor: 'clotharmor',
  alive: true,
};

export const useGameStore = create<GameState>((set) => ({
  ...initialState,

  setPlayerId: (id) => set({ playerId: id }),
  setPlayerName: (name) => set({ playerName: name }),
  setHp: (hp) => set({ hp }),
  setMaxHp: (maxHp) => set({ maxHp }),
  setNbConnected: (n) => set({ nbConnected: n }),
  setLatency: (ms) => set({ latency: ms }),
  setWeapon: (w) => set({ weapon: w }),
  setArmor: (a) => set({ armor: a }),
  setAlive: (a) => set({ alive: a }),
  reset: () => set({ ...initialState }),
}));
