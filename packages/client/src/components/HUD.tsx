import { useState } from 'react';
import { isMuted, setMuted } from '../game/systems/AudioManager';
import { useGameStore } from '../store/GameStore';

interface Props {
  hp: number;
  maxHp: number;
  nbConnected: number;
  latency: number;
  onBack?: () => void;
}

export default function HUD({ hp, maxHp, nbConnected, latency, onBack }: Props) {
  const [muted, setMutedState] = useState(isMuted());
  const weapon = useGameStore((s) => s.weapon);
  const armor = useGameStore((s) => s.armor);
  const ratio = Math.max(0, hp / maxHp);
  const barColor = ratio > 0.5 ? '#00ff00' : ratio > 0.25 ? '#ffaa00' : '#ff0000';

  const toggleMute = () => {
    const next = !isMuted();
    setMuted(next);
    setMutedState(next);
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 980,
        height: 500,
        pointerEvents: 'none',
        fontFamily: 'monospace',
        fontSize: 12,
        color: '#fff',
      }}
    >
      <div style={{ position: 'absolute', top: 8, left: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>HP</span>
        <div style={{ width: 100, height: 10, background: '#333', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: `${ratio * 100}%`, height: '100%', background: barColor, transition: 'width 0.3s' }} />
        </div>
        <span>{Math.max(0, hp)}/{maxHp}</span>
      </div>

      <div style={{ position: 'absolute', top: 28, left: 10, fontSize: 11, color: '#aaa' }}>
        Wpn: {weapon} | Arm: {armor}
      </div>

      <div style={{ position: 'absolute', top: 8, right: 10, pointerEvents: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
        <span>Players: {nbConnected} | Latency: {latency}ms</span>
        <button
          onClick={toggleMute}
          style={{
            background: 'none',
            border: '1px solid #666',
            color: '#fff',
            cursor: 'pointer',
            padding: '2px 6px',
            fontSize: 11,
            fontFamily: 'monospace',
          }}
          title={muted ? 'Unmute sounds' : 'Mute sounds'}
        >
          {muted ? 'Unmute' : 'Mute'}
        </button>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: '1px solid #a33',
              color: '#a33',
              cursor: 'pointer',
              padding: '2px 8px',
              fontSize: 11,
              fontFamily: 'monospace',
            }}
            title="Return to menu"
          >
            Exit
          </button>
        )}
      </div>
    </div>
  );
}
