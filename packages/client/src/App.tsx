import { useState } from 'react';
import GameCanvas from './components/GameCanvas';
import HomeScreen from './components/HomeScreen';
import HUD from './components/HUD';
import { useGameStore } from './store/GameStore';

export default function App() {
  const [playing, setPlaying] = useState(false);
  const [playerName, setPlayerName] = useState('');

  const hp = useGameStore((s) => s.hp);
  const maxHp = useGameStore((s) => s.maxHp);
  const nbConnected = useGameStore((s) => s.nbConnected);
  const latency = useGameStore((s) => s.latency);

  const handleStart = (name: string) => {
    useGameStore.getState().setPlayerName(name);
    setPlayerName(name);
    setPlaying(true);
  };

  return (
    <div>
      {!playing ? (
        <HomeScreen onStart={handleStart} />
      ) : (
        <div style={{ position: 'relative', width: 980, height: 500 }}>
          <GameCanvas playerName={playerName} />
          <HUD hp={hp} maxHp={maxHp} nbConnected={nbConnected} latency={latency} />
        </div>
      )}
    </div>
  );
}
