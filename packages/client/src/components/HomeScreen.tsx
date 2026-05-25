import { useState, useEffect } from 'react';

interface CharacterInfo {
  name: string;
  weapon: string;
  armor: string;
  playerID: string;
}

function loadCharacterInfo(): CharacterInfo | null {
  try {
    const name = localStorage.getItem('playerName');
    const playerID = localStorage.getItem('playerID');
    const weapon = localStorage.getItem('weapon');
    const armor = localStorage.getItem('armor');
    if (name && playerID) {
      return { name, playerID, weapon: weapon || 'sword1', armor: armor || 'clotharmor' };
    }
  } catch {}
  return null;
}

interface Props {
  onStart: (name: string, isNew: boolean, existingID?: string) => void;
}

const styles = {
  page: {
    width: '100vw',
    height: '100vh',
    background: 'radial-gradient(ellipse at 30% 20%, #1a1a2e 0%, #0a0a12 50%, #05050a 100%)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Advocut', monospace",
    color: '#e8dcc8',
    position: 'relative' as const,
    overflow: 'hidden',
  } as React.CSSProperties,

  particles: {
    position: 'absolute' as const,
    inset: 0,
    pointerEvents: 'none' as const,
    overflow: 'hidden',
  } as React.CSSProperties,

  particle: (x: number, y: number, size: number, delay: number, duration: number): React.CSSProperties => ({
    position: 'absolute',
    left: `${x}%`,
    top: `${y}%`,
    width: size,
    height: size,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(244,212,66,0.6), transparent)',
    animation: `floatParticle ${duration}s ease-in-out ${delay}s infinite`,
    pointerEvents: 'none',
  }),

  hero: {
    position: 'relative' as const,
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 8,
  },

  subtitle: {
    fontSize: 14,
    letterSpacing: 6,
    textTransform: 'uppercase' as const,
    color: '#8a7e6a',
    fontWeight: 400,
    marginBottom: 4,
  },

  title: {
    fontSize: 72,
    fontWeight: 400,
    background: 'linear-gradient(180deg, #f4d442 0%, #d4a017 50%, #b8860b 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 0 60px rgba(244,212,66,0.3), 0 0 120px rgba(244,212,66,0.1)',
    letterSpacing: 8,
    lineHeight: 1,
    marginBottom: 8,
    filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.5))',
    animation: 'titleGlow 3s ease-in-out infinite',
  },

  tagline: {
    fontSize: 16,
    color: '#6b5d4a',
    letterSpacing: 4,
    marginBottom: 32,
  },

  playBtn: {
    padding: '16px 64px',
    fontSize: 20,
    fontFamily: "'Advocut', monospace",
    letterSpacing: 4,
    background: 'linear-gradient(180deg, #f4d442 0%, #c9940e 100%)',
    border: '2px solid #f4d442',
    borderRadius: 4,
    color: '#1a1200',
    cursor: 'pointer',
    textTransform: 'uppercase' as const,
    fontWeight: 700,
    transition: 'all 0.3s ease',
    boxShadow: '0 0 30px rgba(244,212,66,0.2), inset 0 1px 0 rgba(255,255,255,0.3)',
    position: 'relative' as const,
    overflow: 'hidden',
  },

  playBtnHover: {
    boxShadow: '0 0 60px rgba(244,212,66,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
    transform: 'translateY(-2px)',
  },

  spriteContainer: {
    position: 'absolute' as const,
    pointerEvents: 'none' as const,
    zIndex: 1,
  },

  sprite: (img: string, x: number, y: number, w: number, h: number, bx: number, by: number): React.CSSProperties => ({
    position: 'absolute',
    left: x,
    bottom: y,
    width: w,
    height: h,
    backgroundImage: `url(${img})`,
    backgroundPosition: `${bx}px ${by}px`,
    backgroundSize: '2048px 2048px',
    imageRendering: 'pixelated' as any,
    opacity: 0.7,
  }),

  floatingSprite: (img: string, x: number, y: number, w: number, h: number, bx: number, by: number, anim: string, delay: number): React.CSSProperties => ({
    position: 'absolute',
    left: `${x}%`,
    top: `${y}%`,
    width: w,
    height: h,
    backgroundImage: `url(${img})`,
    backgroundPosition: `${bx}px ${by}px`,
    backgroundSize: '2048px 2048px',
    imageRendering: 'pixelated' as any,
    opacity: 0.5,
    animation: `${anim} ${6 + Math.random() * 4}s ease-in-out ${delay}s infinite`,
  }),

  charSelect: {
    position: 'absolute' as const,
    inset: 0,
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(5,5,10,0.85)',
    backdropFilter: 'blur(8px)',
    animation: 'fadeIn 0.4s ease-out',
  },

  charPanel: {
    background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)',
    border: '1px solid rgba(244,212,66,0.2)',
    borderRadius: 8,
    padding: '48px 64px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 24,
    maxWidth: 500,
    width: '90%',
    boxShadow: '0 0 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(244,212,66,0.1)',
    position: 'relative' as const,
    animation: 'slideUp 0.5s ease-out',
  } as React.CSSProperties,

  charTitle: {
    fontSize: 28,
    letterSpacing: 4,
    color: '#f4d442',
    fontWeight: 400,
    marginBottom: 8,
  },

  existingChar: {
    width: '100%',
    padding: '16px 20px',
    background: 'rgba(244,212,66,0.05)',
    border: '1px solid rgba(244,212,66,0.15)',
    borderRadius: 4,
    textAlign: 'center' as const,
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  } as React.CSSProperties,

  existingCharSprite: {
    width: 64,
    height: 64,
    backgroundImage: 'url(/assets/sprites/atlas3.png)',
    backgroundPosition: '-1651px -1879px',
    backgroundSize: '2048px 2048px',
    imageRendering: 'pixelated' as any,
    flexShrink: 0,
  },

  input: {
    width: '100%',
    padding: '14px 20px',
    fontSize: 16,
    fontFamily: "'Advocut', monospace",
    background: 'rgba(232,220,200,0.08)',
    border: '1px solid rgba(244,212,66,0.2)',
    borderRadius: 4,
    color: '#e8dcc8',
    textAlign: 'center' as const,
    letterSpacing: 2,
    outline: 'none',
    transition: 'border-color 0.3s ease',
  },

  inputFocus: {
    borderColor: '#f4d442',
  },

  btnRow: {
    display: 'flex',
    gap: 12,
    width: '100%',
  },

  btnPrimary: (disabled?: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '14px 24px',
    fontSize: 16,
    fontFamily: "'Advocut', monospace",
    letterSpacing: 2,
    background: disabled ? 'rgba(244,212,66,0.1)' : 'linear-gradient(180deg, #f4d442 0%, #c9940e 100%)',
    border: '1px solid rgba(244,212,66,0.3)',
    borderRadius: 4,
    color: disabled ? '#555' : '#1a1200',
    cursor: disabled ? 'default' : 'pointer',
    textTransform: 'uppercase' as const,
    transition: 'all 0.3s ease',
  }),

  btnSecondary: {
    flex: 1,
    padding: '14px 24px',
    fontSize: 16,
    fontFamily: "'Advocut', monospace",
    letterSpacing: 2,
    background: 'rgba(68,170,68,0.1)',
    border: '1px solid rgba(68,170,68,0.3)',
    borderRadius: 4,
    color: '#4a4',
    cursor: 'pointer',
    textTransform: 'uppercase' as const,
    transition: 'all 0.3s ease',
  },

  btnDanger: {
    padding: '14px 16px',
    fontSize: 14,
    fontFamily: "'Advocut', monospace",
    letterSpacing: 1,
    background: 'rgba(170,50,50,0.1)',
    border: '1px solid rgba(170,50,50,0.3)',
    borderRadius: 4,
    color: '#a33',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },

  features: {
    position: 'absolute' as const,
    bottom: 40,
    zIndex: 2,
    display: 'flex',
    gap: 60,
  } as React.CSSProperties,

  featureItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 8,
    color: '#6b5d4a',
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  },
};

export default function HomeScreen({ onStart }: Props) {
  const [view, setView] = useState<'landing' | 'charselect'>('landing');
  const [name, setName] = useState('');
  const [existingChar, setExistingChar] = useState<CharacterInfo | null>(null);
  const [btnHover, setBtnHover] = useState(false);

  useEffect(() => {
    setExistingChar(loadCharacterInfo());
  }, []);

  const handleNewGame = () => {
    if (!name.trim()) return;
    localStorage.setItem('playerName', name.trim());
    onStart(name.trim(), true);
  };

  const handleLoadGame = () => {
    if (existingChar) {
      onStart(existingChar.name, false, existingChar.playerID);
    }
  };

  const handleReset = () => {
    if (!existingChar) return;
    const ok = confirm(`Delete character "${existingChar.name}"? This cannot be undone.`);
    if (!ok) return;
    try {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      const ws = new WebSocket(`${proto}://${location.host}`);
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'delete', id: existingChar.playerID }));
        ws.close();
      };
    } catch {}
    localStorage.removeItem('playerName');
    localStorage.removeItem('playerID');
    localStorage.removeItem('weapon');
    localStorage.removeItem('armor');
    for (let i = 0; i < 8; i++) localStorage.removeItem('ach' + i);
    setExistingChar(null);
  };

  const sprites = [
    { img: '/assets/sprites/atlas3.png', x: 1651, y: 1879, w: 64, h: 64, l: 15, t: 60, anim: 'floatDrift1', d: 0 },
    { img: '/assets/sprites/atlas4.png', x: 750, y: 322, w: 105, h: 105, l: 75, t: 55, anim: 'floatDrift2', d: 1 },
    { img: '/assets/sprites/atlas4.png', x: 730, y: 912, w: 79, h: 79, l: 80, t: 25, anim: 'floatDrift1', d: 2 },
    { img: '/assets/sprites/atlas4.png', x: 1, y: 1068, w: 71, h: 73, l: 10, t: 30, anim: 'floatDrift2', d: 1.5 },
    { img: '/assets/sprites/atlas4.png', x: 269, y: 1143, w: 65, h: 59, l: 85, t: 70, anim: 'floatDrift1', d: 3 },
    { img: '/assets/sprites/atlas4.png', x: 403, y: 1204, w: 55, h: 57, l: 5, t: 50, anim: 'floatDrift2', d: 0.5 },
  ];

  const particles = Array.from({ length: 30 }, (_, i) => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 2 + Math.random() * 4,
    delay: Math.random() * 5,
    duration: 3 + Math.random() * 4,
    id: i,
  }));

  const features = [
    { icon: '⚔️', label: 'Fight Monsters' },
    { icon: '🛡️', label: 'Loot Treasure' },
    { icon: '🌍', label: 'Explore World' },
    { icon: '👥', label: 'Play Together' },
  ];

  if (view === 'charselect') {
    return (
      <div style={styles.charSelect} onClick={(e) => { if (e.target === e.currentTarget) setView('landing'); }}>
        <div style={styles.charPanel}>
          <div style={styles.charTitle}>Choose Your Hero</div>

          {existingChar && (
            <div style={styles.existingChar}>
              <div style={styles.existingCharSprite} />
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: 18, color: '#f4d442', marginBottom: 2 }}>
                  {existingChar.name}
                </div>
                <div style={{ fontSize: 11, color: '#6b5d4a', letterSpacing: 1 }}>
                  Weapon: {existingChar.weapon} &middot; Armor: {existingChar.armor}
                </div>
              </div>
              <button
                onClick={handleReset}
                style={styles.btnDanger}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(170,50,50,0.2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(170,50,50,0.1)'; }}
              >
                ✕
              </button>
            </div>
          )}

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name your character"
            maxLength={20}
            style={styles.input}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#f4d442'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(244,212,66,0.2)'; }}
            onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) handleNewGame(); }}
            autoFocus
          />

          <div style={styles.btnRow}>
            <button
              disabled={!name.trim()}
              onClick={handleNewGame}
              style={styles.btnPrimary(!name.trim())}
              onMouseEnter={(e) => { if (name.trim()) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 0 30px rgba(244,212,66,0.3)'; } }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              New Hero
            </button>

            {existingChar && (
              <button
                onClick={handleLoadGame}
                style={styles.btnSecondary}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(68,170,68,0.2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(68,170,68,0.1)'; }}
              >
                Continue
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes floatParticle {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0; }
          20% { opacity: 0.6; }
          50% { transform: translateY(-30px) scale(1.5); opacity: 0.3; }
          80% { opacity: 0.6; }
        }
        @keyframes titleGlow {
          0%, 100% { filter: drop-shadow(0 0 30px rgba(244,212,66,0.3)); }
          50% { filter: drop-shadow(0 0 60px rgba(244,212,66,0.5)); }
        }
        @keyframes floatDrift1 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(10px, -15px) rotate(3deg); }
          50% { transform: translate(-5px, -25px) rotate(-2deg); }
          75% { transform: translate(8px, -10px) rotate(4deg); }
        }
        @keyframes floatDrift2 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(-12px, -10px) rotate(-3deg); }
          50% { transform: translate(8px, -20px) rotate(2deg); }
          75% { transform: translate(-5px, -8px) rotate(-1deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={styles.particles}>
        {particles.map((p) => (
          <div key={p.id} style={styles.particle(p.x, p.y, p.size, p.delay, p.duration)} />
        ))}
      </div>

      {sprites.map((s, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${s.l}%`,
          top: `${s.t}%`,
          width: s.w * 1.5,
          height: s.h * 1.5,
          backgroundImage: `url(${s.img})`,
          backgroundPosition: `${-s.x}px ${-s.y}px`,
          backgroundSize: '2048px 2048px',
          imageRendering: 'pixelated' as any,
          opacity: 0.4,
          animation: `${s.anim} ${8 + s.d * 2}s ease-in-out ${s.d}s infinite`,
          zIndex: 1,
          pointerEvents: 'none',
        }} />
      ))}

      <div style={styles.hero}>
        <div style={styles.subtitle}>A browser-based MMORPG</div>
        <h1 style={styles.title}>META PHASE</h1>
        <div style={styles.tagline}>— An Epic Multiplayer Adventure —</div>
        <button
          style={{ ...styles.playBtn, ...(btnHover ? styles.playBtnHover : {}) }}
          onClick={() => setView('charselect')}
          onMouseEnter={() => setBtnHover(true)}
          onMouseLeave={() => setBtnHover(false)}
        >
          Play Now
        </button>
      </div>

      <div style={styles.features}>
        {features.map((f, i) => (
          <div key={i} style={styles.featureItem}>
            <span style={{ fontSize: 28, filter: 'grayscale(0.5)' }}>{f.icon}</span>
            <span>{f.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
