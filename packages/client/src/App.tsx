import { useState } from 'react';
import GameCanvas from './components/GameCanvas';
import HomeScreen from './components/HomeScreen';
import HUD from './components/HUD';
import { useGameStore } from './store/GameStore';

export default function App() {
  const [playing, setPlaying] = useState(false);
  const [gameOptions, setGameOptions] = useState<{ playerName: string; isNew: boolean; existingID?: string }>({ playerName: '', isNew: true });

  const hp = useGameStore((s) => s.hp);
  const maxHp = useGameStore((s) => s.maxHp);
  const nbConnected = useGameStore((s) => s.nbConnected);
  const latency = useGameStore((s) => s.latency);

  const handleStart = (name: string, isNew: boolean, existingID?: string) => {
    useGameStore.getState().setPlayerName(name);
    setGameOptions({ playerName: name, isNew, existingID });
    setPlaying(true);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#000' }}>
      {!playing ? (
        <HomeScreen onStart={handleStart} />
      ) : (
        <div style={{ position: 'relative', width: 980, height: 500 }}>
          <GameCanvas playerName={gameOptions.playerName} isNew={gameOptions.isNew} existingID={gameOptions.existingID} />
          <HUD hp={hp} maxHp={maxHp} nbConnected={nbConnected} latency={latency} />
        </div>
      )}
    </div>
  );
}
