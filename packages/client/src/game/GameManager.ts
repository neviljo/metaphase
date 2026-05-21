import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';

let currentPlayerName = '';
let currentIsNew = true;
let currentExistingID: string | undefined;

export function createGame(parent: HTMLElement, playerName: string, isNew = true, existingID?: string): Phaser.Game {
  currentPlayerName = playerName;
  currentIsNew = isNew;
  currentExistingID = existingID;

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    width: 980,
    height: 500,
    parent,
    backgroundColor: '#000000',
    scene: [BootScene, GameScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  });

  return game;
}

export function getPlayerName(): string {
  return currentPlayerName;
}

export function getIsNew(): boolean {
  return currentIsNew;
}

export function getExistingID(): string | undefined {
  return currentExistingID;
}
