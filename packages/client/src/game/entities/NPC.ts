import Phaser from 'phaser';
import { Being } from './Being';

export class NPC extends Being {
  npcKey = '';

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    npcKey: string
  ) {
    super(scene, x, y, 'atlas1', `${npcKey}_0`);

    this.npcKey = npcKey;
    this.bodySprite.setOrigin(0, 0.25);
    this.shadowSprite.setOrigin(0, 0.5);
    this.setDepth(5);

    // Create idle animation for NPC
    const key = `${npcKey}_idle`;
    if (!scene.anims.exists(key)) {
      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNames('atlas1', {
          prefix: `${npcKey}_`,
          start: 0,
          end: 0,
        }),
        frameRate: 1,
        repeat: -1,
      });
    }
    this.playNPCAnim(key);
  }

  playNPCAnim(key: string, force = false): void {
    if (this.scene.anims.exists(key)) {
      this.bodySprite.play(key, force);
    }
  }
}
