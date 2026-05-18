import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';

let currentPlayerName = '';

export function createGame(parent: HTMLElement, playerName: string): Phaser.Game {
  currentPlayerName = playerName;

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    width: 980,
    height: 500,
    parent,
    backgroundColor: '#000000',
    scene: [BootScene, GameScene],
  });

  return game;
}

export function getPlayerName(): string {
  return currentPlayerName;
}
