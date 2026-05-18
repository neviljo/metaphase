import Phaser from 'phaser';
import { Being } from '../entities/Being';
import { ORIENTATION_TO_DIR } from './AnimationSystem';

export interface MoveCommand {
  path: { x: number; y: number }[];
  orientation: number;
  action?: any;
  delta?: number;
  speed?: number;
}

export function executeMove(
  being: Being,
  command: MoveCommand,
  onComplete?: () => void
): Phaser.Tweens.Tween | null {
  if (!command.path || command.path.length < 2) {
    return null;
  }

  const start = command.path[0];
  const end = command.path[command.path.length - 1];
  const cellSize = 32;
  const speed = command.speed || 120;
  const delta = command.delta || 0;
  const totalDist = Math.abs(end.x - start.x) + Math.abs(end.y - start.y);
  const duration = Math.max(50, totalDist * speed - delta);

  const dir = ORIENTATION_TO_DIR[command.orientation] || 'down';
  being.orient(command.orientation);
  being.playAnim(dir, false);

  if (being.moveTween) {
    being.moveTween.stop();
  }

  being.moveTween = being.scene.tweens.add({
    targets: being,
    x: end.x * cellSize,
    y: end.y * cellSize,
    duration,
    ease: 'Linear',
    onComplete: () => {
      being.moveTween = null;
      being.idle(true);
      onComplete?.();
    },
  });

  return being.moveTween;
}

export function stopMovement(being: Being): void {
  if (being.moveTween) {
    being.moveTween.stop();
    being.moveTween = null;
  }
  if (being.fightTween) {
    being.fightTween.stop();
    being.fightTween = null;
  }
}
