import Phaser from 'phaser';
import { ORIENTATION_TO_DIR } from '../systems/AnimationSystem';

export class Being extends Phaser.GameObjects.Container {
  orientation = 4;
  speed = 120;
  alive = true;
  inFight = false;
  isPlayer = false;
  target: Being | null = null;
  deathmark = false;
  moveTween: Phaser.Tweens.Tween | null = null;
  fightTween: Phaser.Tweens.Tween | null = null;
  bodySprite: Phaser.GameObjects.Sprite;
  weaponSprite?: Phaser.GameObjects.Sprite;
  shadowSprite: Phaser.GameObjects.Sprite;
  nameText: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    atlas: string,
    frame: string
  ) {
    super(scene, x * 32, y * 32);

    this.shadowSprite = scene.add.sprite(0, 5, 'atlas1', 'shadow');
    this.shadowSprite.setOrigin(0.25, 0.5);
    this.add(this.shadowSprite);

    this.bodySprite = scene.add.sprite(0, 0, atlas, frame);
    this.bodySprite.setOrigin(0.25, 0.35);
    this.add(this.bodySprite);

    this.nameText = scene.add.text(0, -30, '', {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    });
    this.nameText.setOrigin(0.5);
    this.add(this.nameText);

    this.scene.add.existing(this);
    this.setDepth(10);
  }

  playAnim(key: string, force = false): void {
    this.bodySprite.play(key, force);
    if (this.weaponSprite) {
      this.weaponSprite.play(key, force);
    }
  }

  idle(force = false): void {
    this.playAnim(`idle_${ORIENTATION_TO_DIR[this.orientation]}`, force);
  }

  attack(): void {
    this.playAnim(`attack_${ORIENTATION_TO_DIR[this.orientation]}`, false);
    this.scene?.time.delayedCall(300, () => { if (this.alive) this.idle(); });
  }

  orient(orientation: number): void {
    if (this.orientation !== orientation) this.orientation = orientation;
  }

  endFight(): void {
    if (this.fightTween) this.fightTween.stop();
    this.fightTween = null;
    this.inFight = false;
    this.deathmark = false;
    this.idle(false);
  }

  flagForDeath(): void {
    this.deathmark = true;
  }

  setDisplayName(name: string): void {
    this.nameText.setText(name);
    if (this.isPlayer) {
      this.nameText.setColor('#ffd700');
    }
  }

  setPositionTile(tx: number, ty: number, instant = false, latency = 0): void {
    const targetX = tx * 32;
    const targetY = ty * 32;
    const dist = Math.abs(this.x - targetX) + Math.abs(this.y - targetY);
    if (instant || dist > 64) {
      if (this.moveTween) {
        this.moveTween.stop();
        this.moveTween = null;
      }
      this.setPosition(targetX, targetY);
      return;
    }
    if (this.moveTween) {
      this.moveTween.stop();
      this.moveTween = null;
    }
    const baseDuration = 120;
    const duration = Math.max(50, baseDuration - latency);
    const dir = ORIENTATION_TO_DIR[this.orientation] || 'down';
    this.playAnim(dir, false);
    this.moveTween = this.scene.tweens.add({
      targets: this,
      x: targetX,
      y: targetY,
      duration,
      ease: 'Linear',
      onComplete: () => {
        this.moveTween = null;
        this.idle(true);
      },
    });
  }
}
