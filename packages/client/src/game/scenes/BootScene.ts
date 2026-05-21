import Phaser from 'phaser';
import { getPlayerName, getIsNew, getExistingID } from '../GameManager';
import { initAudio } from '../systems/AudioManager';

export class BootScene extends Phaser.Scene {
  private loadingBar!: Phaser.GameObjects.Graphics;
  private progressBar!: Phaser.GameObjects.Graphics;
  private loadingText!: Phaser.GameObjects.Text;

  constructor() {
    super('Boot');
  }

  preload(): void {
    this.loadingBar = this.add.graphics();
    this.progressBar = this.add.graphics();
    this.loadingBar.setScrollFactor(0).setDepth(200);
    this.progressBar.setScrollFactor(0).setDepth(201);

    this.loadingText = this.add.text(490, 280, 'Loading...', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ffffff',
    });
    this.loadingText.setOrigin(0.5);
    this.loadingText.setScrollFactor(0).setDepth(202);

    this.load.on('progress', (value: number) => {
      this.progressBar.clear();
      this.progressBar.fillStyle(0xf4d442, 1);
      this.progressBar.fillRect(290, 260, 400 * value, 16);
    });

    this.load.on('complete', () => {
      this.progressBar.destroy();
      this.loadingBar.destroy();
      this.loadingText.destroy();
    });

    this.loadingBar.fillStyle(0x333333, 1);
    this.loadingBar.fillRect(290, 260, 400, 16);

    this.load.atlas('atlas1', 'assets/sprites/atlas1.png', 'assets/sprites/atlas1.json');
    this.load.atlas('atlas3', 'assets/sprites/atlas3.png', 'assets/sprites/atlas3.json');
    this.load.atlas('atlas4', 'assets/sprites/atlas4.png', 'assets/sprites/atlas4.json');
    this.load.json('db', 'assets/json/db.json');
    this.load.json('entities_client', 'assets/json/entities_client.json');
    this.load.image('tilesheet', 'assets/tilesets/tilesheet.png');
    this.load.tilemapTiledJSON('map', 'assets/maps/minimap_client.json');
    this.load.audio('intro', ['assets/music/phaser-quest-intro.ogg']);
    this.load.audioSprite('sounds', 'assets/audio/sounds.json', [
      'assets/audio/sounds.ogg',
      'assets/audio/sounds.mp3',
    ]);
  }

  create(): void {
    initAudio(this);
    this.scene.start('Game', {
      playerName: getPlayerName(),
      isNew: getIsNew(),
      existingID: getExistingID(),
    });
  }
}
