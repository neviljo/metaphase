import Phaser from 'phaser';
import { Being } from './Being';

export class Human extends Being {
  private bubble: Phaser.GameObjects.Container | null = null;

  showBubble(text: string, duration = 4000): void {
    this.clearBubble();

    const padX = 8;
    const padY = 4;
    const maxWidth = 160;

    const label = this.scene.add.text(0, 0, text, {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#000',
      wordWrap: { width: maxWidth - padX * 2 },
      align: 'center',
    });
    label.setOrigin(0.5);

    const bg = this.scene.add.graphics();
    const bw = Math.min(maxWidth, label.width + padX * 2);
    const bh = label.height + padY * 2;
    bg.fillStyle(0xffffff, 0.9);
    bg.fillRoundedRect(-bw / 2, -bh - 8, bw, bh, 4);
    bg.lineStyle(1, 0x000000, 1);
    bg.strokeRoundedRect(-bw / 2, -bh - 8, bw, bh, 4);

    this.bubble = this.scene.add.container(0, -40, [bg, label]);
    this.bubble.setDepth(50);
    this.add(this.bubble);

    this.scene.time.delayedCall(duration, () => this.clearBubble());
  }

  clearBubble(): void {
    if (this.bubble) {
      this.bubble.destroy();
      this.bubble = null;
    }
  }
}
