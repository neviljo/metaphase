import Phaser from 'phaser';
import { Being } from './Being';

export class Monster extends Being {
  monsterName = '';
  hitPoints = 100;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    monsterName: string
  ) {
    super(scene, x, y, 'atlas4', `${monsterName}_0`);

    this.monsterName = monsterName;
    this.bodySprite.setOrigin(0.25, 0.2);
    this.shadowSprite.setOrigin(0.25, 0.5);
    this.setDepth(5);
  }

  setUp(frames: Record<string, number[]>, anchor?: { x: number; y: number }): void {
    if (anchor) {
      this.bodySprite.setOrigin(anchor.x, anchor.y);
    }
    this.createAnimations(frames);
    this.idle(true);
  }

  private createAnimations(frames: Record<string, any>): void {
    const prefix = this.monsterName;
    const idleRate = typeof frames.idle_rate === 'number' ? frames.idle_rate : 2;

    for (const animName of Object.keys(frames)) {
      if (animName === 'idle_rate' || animName === 'death') continue;
      const range = frames[animName] as number[];
      if (!Array.isArray(range) || range.length < 2) continue;
      const [start, end] = range;

      const key = `${prefix}_${animName}`;
      if (this.scene.anims.exists(key)) continue;

      const frameArray = this.scene.anims.generateFrameNames('atlas4', {
        prefix: `${prefix}_`,
        start,
        end,
      });

      const isAttack = animName.startsWith('attack');
      const isIdle = animName.startsWith('idle');
      const rate = isAttack ? 14 : isIdle ? idleRate : 8;

      this.scene.anims.create({
        key,
        frames: frameArray,
        frameRate: rate,
        repeat: isAttack ? 0 : -1,
      });
    }

    // Create death animation using at last 5 frames or generic
    const deathKey = `${prefix}_death`;
    if (!this.scene.anims.exists(deathKey)) {
      if (frames.death) {
        const deathFrames = this.scene.anims.generateFrameNames('atlas4', {
          prefix: `${prefix}_`,
          start: frames.death[0],
          end: frames.death[1],
        });
        this.scene.anims.create({
          key: deathKey,
          frames: deathFrames,
          frameRate: 8,
          repeat: 0,
        });
      }
    }
  }

  playAnim(key: string, force = false): void {
    const fullKey = `${this.monsterName}_${key}`;
    if (this.scene.anims.exists(fullKey)) {
      this.bodySprite.play(fullKey, force);
    }
  }
}
