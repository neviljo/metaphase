import { useState } from 'react';

interface Props {
  onStart: (name: string) => void;
}

export default function HomeScreen({ onStart }: Props) {
  const [name, setName] = useState('');

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
      <button
        disabled={!name.trim()}
        onClick={() => onStart(name.trim())}
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
        Play
      </button>
    </div>
  );
}
