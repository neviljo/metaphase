import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

interface Props {
  playerName: string;
  isNew: boolean;
  existingID?: string;
}

export default function GameCanvas({ playerName, isNew, existingID }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    import('../game/GameManager').then(({ createGame }) => {
      if (containerRef.current) {
        gameRef.current = createGame(containerRef.current, playerName, isNew, existingID);
      }
    });

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
      // Clean up stray chat input that may persist after game destroy
      const chatInput = document.querySelector<HTMLInputElement>('input[placeholder="Press Enter to chat..."]');
      chatInput?.remove();
    };
  }, [playerName]);

  return <div ref={containerRef} />;
}
