import { useState } from 'react';
import GameCanvas from './components/GameCanvas';
import HomeScreen from './components/HomeScreen';
import HUD from './components/HUD';
import { useGameStore } from './store/GameStore';

export default function App() {
  const [playing, setPlaying] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [gameOptions, setGameOptions] = useState<{ playerName: string; isNew: boolean; existingID?: string }>({ playerName: '', isNew: true });

  const hp = useGameStore((s) => s.hp);
  const maxHp = useGameStore((s) => s.maxHp);
  const nbConnected = useGameStore((s) => s.nbConnected);
  const latency = useGameStore((s) => s.latency);

  const handleStart = (name: string, isNew: boolean, existingID?: string) => {
    useGameStore.getState().setPlayerName(name);
    setGameOptions({ playerName: name, isNew, existingID });
    setFadeOut(true);
    setTimeout(() => {
      setPlaying(true);
      setFadeOut(false);
    }, 400);
  };

  const handleBack = () => {
    setFadeOut(true);
    setTimeout(() => {
      setPlaying(false);
      setFadeOut(false);
    }, 300);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#000', overflow: 'hidden' }}>
      {!playing && (
        <div style={{
          position: 'absolute',
          inset: 0,
          opacity: fadeOut ? 0 : 1,
          transition: 'opacity 0.4s ease-out',
          zIndex: fadeOut ? 1 : 10,
        }}>
          <HomeScreen onStart={handleStart} />
        </div>
      )}

      {playing && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          opacity: fadeOut ? 0 : 1,
          transition: 'opacity 0.4s ease-out',
        }}>
          <div style={{ position: 'relative', width: 980, height: 500 }}>
            <GameCanvas playerName={gameOptions.playerName} isNew={gameOptions.isNew} existingID={gameOptions.existingID} />
            <HUD hp={hp} maxHp={maxHp} nbConnected={nbConnected} latency={latency} onBack={handleBack} />
          </div>
        </div>
      )}
    </div>
  );
}
