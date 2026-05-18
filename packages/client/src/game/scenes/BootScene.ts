import Phaser from 'phaser';
import { getPlayerName } from '../GameManager';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    this.load.atlas('atlas1', 'assets/sprites/atlas1.png', 'assets/sprites/atlas1.json');
    this.load.atlas('atlas3', 'assets/sprites/atlas3.png', 'assets/sprites/atlas3.json');
    this.load.atlas('atlas4', 'assets/sprites/atlas4.png', 'assets/sprites/atlas4.json');
    this.load.json('db', 'assets/json/db.json');
    this.load.image('tilesheet', 'assets/tilesets/tilesheet.png');
    this.load.tilemapTiledJSON('map', 'assets/maps/minimap_client.json');
    this.load.audio('intro', ['assets/music/phaser-quest-intro.ogg']);
  }

  create(): void {
    this.scene.start('Game', { playerName: getPlayerName() });
  }
}
