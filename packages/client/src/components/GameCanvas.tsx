import { useEffect, useRef } from 'react';

interface Props {
  playerName: string;
}

export default function GameCanvas({ playerName }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    import('../game/GameManager').then(({ createGame }) => {
      if (containerRef.current) {
        createGame(containerRef.current, playerName);
      }
    });
  }, [playerName]);

  return <div ref={containerRef} />;
}
