import { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface ChatMessage {
  id: number;
  text: string;
  name?: string;
}

interface Props {
  messages: ChatMessage[];
  onSend: (text: string) => void;
}

export default function ChatBox({ messages, onSend }: Props) {
  const [input, setInput] = useState('');
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e as any).key === 'Enter' && !visible) {
        setVisible(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    };
    window.addEventListener('keydown', handler as any);
    return () => window.removeEventListener('keydown', handler as any);
  }, [visible]);

  const handleSend = () => {
    const text = input.trim();
    if (text) {
      onSend(text);
      setInput('');
    }
    setVisible(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSend();
    if (e.key === 'Escape') {
      setVisible(false);
      setInput('');
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: 400,
        pointerEvents: 'none',
        fontFamily: 'monospace',
        fontSize: 11,
      }}
    >
      <div
        ref={listRef}
        style={{
          maxHeight: 120,
          overflow: 'hidden',
          padding: '4px 10px',
          color: '#fff',
          textShadow: '1px 1px 0 #000',
        }}
      >
        {messages.slice(-8).map((msg, i) => (
          <div key={i}>
            <span style={{ color: '#f4d442' }}>{msg.name || `Player${msg.id}`}:</span> {msg.text}
          </div>
        ))}
      </div>

      {visible && (
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown as any}
          placeholder="Type a message..."
          style={{
            width: 300,
            padding: '4px 8px',
            margin: '0 0 5px 10px',
            fontSize: 13,
            fontFamily: 'monospace',
            border: '1px solid #666',
            background: 'rgba(0,0,0,0.7)',
            color: '#fff',
            outline: 'none',
            pointerEvents: 'auto',
          }}
        />
      )}
    </div>
  );
}
