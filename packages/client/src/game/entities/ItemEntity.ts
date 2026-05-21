import Phaser from 'phaser';

export class ItemEntity extends Phaser.GameObjects.Container {
  itemId: number;
  isChest = false;
  private icon: Phaser.GameObjects.Sprite;
  private sparkle: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Sprite;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    itemId: number,
    itemKey: string
  ) {
    super(scene, x * 32, y * 32);

    this.itemId = itemId;

    this.shadow = scene.add.sprite(0, 4, 'atlas1', 'shadow');
    this.shadow.setOrigin(0.25, 0.5);
    this.add(this.shadow);

    this.icon = scene.add.sprite(0, 0, 'atlas3', `${itemKey}_0`);
    this.icon.setOrigin(0, 0.25);
    this.add(this.icon);

    // Small sparkle effect
    this.sparkle = scene.add.sprite(0, -8, 'atlas1', 'sparks_0');
    this.sparkle.setVisible(false);
    this.add(this.sparkle);

    scene.add.existing(this);
    this.setDepth(0);
  }

  showChest(): void {
    this.isChest = true;
    this.icon.setFrame('chest');
    this.icon.setOrigin(0, 0);
    this.shadow.setVisible(false);
  }

  showItem(itemKey: string): void {
    const frame = `${itemKey}_0`;
    if (this.scene.textures.get('atlas3').has(frame)) {
      this.icon.setFrame(frame);
    }
    this.icon.setOrigin(0, 0.25);
    this.shadow.setVisible(true);
  }

  showSparkle(duration = 5000): void {
    this.sparkle.setVisible(true);
    const tw = this.scene.tweens.add({
      targets: this.sparkle,
      alpha: { from: 1, to: 0 },
      duration: 500,
      repeat: 5,
    });
    this.scene.time.delayedCall(duration, () => {
      tw.stop();
      this.sparkle.setVisible(false);
    });
  }
}
