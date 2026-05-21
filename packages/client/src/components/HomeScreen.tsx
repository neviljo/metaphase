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

export default function HomeScreen({ onStart }: Props) {
  const [name, setName] = useState('');
  const [existingChar, setExistingChar] = useState<CharacterInfo | null>(null);

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
      const ws = new WebSocket(`ws://${location.hostname}:8081`);
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'delete', id: existingChar.playerID }));
        ws.close();
      };
    } catch {}
    localStorage.removeItem('playerName');
    localStorage.removeItem('playerID');
    localStorage.removeItem('weapon');
    localStorage.removeItem('armor');
    for (let i = 0; i < 8; i++) {
      localStorage.removeItem('ach' + i);
    }
    setExistingChar(null);
  };

  return (
    <div
      style={{
        width: 980,
        height: 500,
        background: '#111',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace',
        color: '#fff',
      }}
    >
      <h1 style={{ color: '#f4d442', marginBottom: 40, fontSize: 32 }}>
        Phaser Quest
      </h1>

      {existingChar && (
        <div
          style={{
            marginBottom: 20,
            padding: '12px 24px',
            background: '#222',
            border: '1px solid #444',
            borderRadius: 4,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 14, marginBottom: 4 }}>
            Character: <strong style={{ color: '#f4d442' }}>{existingChar.name}</strong>
          </div>
          <div style={{ fontSize: 11, color: '#999' }}>
            Weapon: {existingChar.weapon} | Armor: {existingChar.armor}
          </div>
        </div>
      )}

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name your character"
        maxLength={20}
        style={{
          padding: '10px 20px',
          fontSize: 18,
          fontFamily: 'monospace',
          background: '#d0cdba',
          border: '2px solid #b2af9b',
          borderRadius: 4,
          marginBottom: 20,
          width: 300,
          textAlign: 'center',
        }}
      />

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          disabled={!name.trim()}
          onClick={handleNewGame}
          style={{
            padding: '12px 40px',
            fontSize: 18,
            fontFamily: 'monospace',
            background: name.trim() ? '#f4d442' : '#555',
            border: 'none',
            borderRadius: 4,
            color: '#000',
            cursor: name.trim() ? 'pointer' : 'default',
          }}
        >
          New Character
        </button>

        {existingChar && (
          <>
            <button
              onClick={handleLoadGame}
              style={{
                padding: '12px 40px',
                fontSize: 18,
                fontFamily: 'monospace',
                background: '#4a4',
                border: 'none',
                borderRadius: 4,
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Load {existingChar.name}
            </button>

            <button
              onClick={handleReset}
              style={{
                padding: '12px 20px',
                fontSize: 14,
                fontFamily: 'monospace',
                background: '#a33',
                border: 'none',
                borderRadius: 4,
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Reset
            </button>
          </>
        )}
      </div>
    </div>
  );
}
