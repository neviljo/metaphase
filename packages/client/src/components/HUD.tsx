interface Props {
  hp: number;
  maxHp: number;
  nbConnected: number;
  latency: number;
}

export default function HUD({ hp, maxHp, nbConnected, latency }: Props) {
  const ratio = Math.max(0, hp / maxHp);
  const barColor = ratio > 0.5 ? '#00ff00' : ratio > 0.25 ? '#ffaa00' : '#ff0000';

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

      <div style={{ position: 'absolute', top: 8, right: 10 }}>
        Players: {nbConnected} | Latency: {latency}ms
      </div>
    </div>
  );
}
