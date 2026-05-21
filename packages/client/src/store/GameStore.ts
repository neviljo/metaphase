import { create } from 'zustand';

interface AchievementState {
  unlocked: boolean;
  unlockedAt?: number;
}

interface GameState {
  playerId: string | null;
  playerName: string;
  hp: number;
  maxHp: number;
  nbConnected: number;
  latency: number;
  weapon: string;
  armor: string;
  alive: boolean;

  achievements: Record<number, AchievementState>;
  killCounters: Record<string, number>;
  chestOpens: number;

  setPlayerId: (id: string) => void;
  setPlayerName: (name: string) => void;
  setHp: (hp: number) => void;
  setMaxHp: (maxHp: number) => void;
  setNbConnected: (n: number) => void;
  setLatency: (ms: number) => void;
  setWeapon: (w: string) => void;
  setArmor: (a: string) => void;
  setAlive: (a: boolean) => void;
  reset: () => void;

  unlockAchievement: (id: number) => void;
  incrementKillCounter: (monsterKey: string) => void;
  incrementChestOpens: () => void;
}

const initialState = {
  playerId: null as string | null,
  playerName: '',
  hp: 100,
  maxHp: 100,
  nbConnected: 0,
  latency: 0,
  weapon: 'sword1',
  armor: 'clotharmor',
  alive: true,

  achievements: {} as Record<number, AchievementState>,
  killCounters: {} as Record<string, number>,
  chestOpens: 0,
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

  unlockAchievement: (id) =>
    set((state) => ({
      achievements: {
        ...state.achievements,
        [id]: { unlocked: true, unlockedAt: Date.now() },
      },
    })),

  incrementKillCounter: (monsterKey) =>
    set((state) => ({
      killCounters: {
        ...state.killCounters,
        [monsterKey]: (state.killCounters[monsterKey] || 0) + 1,
      },
    })),

  incrementChestOpens: () =>
    set((state) => ({ chestOpens: state.chestOpens + 1 })),
}));
