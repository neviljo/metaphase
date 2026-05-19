import Phaser from 'phaser';
import { Human } from './Human';
import { useGameStore } from '../../store/GameStore';

const ACH_TALK = 3;

export class NPC extends Human {
  npcKey = '';
  private dialogue: string[] = [];
  private dialogueIndex = 0;
  private talkCooldown = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    npcKey: string,
    dialogue: string[]
  ) {
    super(scene, x, y, 'atlas1', `${npcKey}_0`);

    this.npcKey = npcKey;
    this.dialogue = dialogue;

    this.bodySprite.setOrigin(0, 0.25);
    this.shadowSprite.setOrigin(0, 0.5);
    this.setDepth(5);

    const animKey = `${npcKey}_idle`;
    if (!scene.anims.exists(animKey)) {
      scene.anims.create({
        key: animKey,
        frames: scene.anims.generateFrameNames('atlas1', {
          prefix: `${npcKey}_`,
          start: 0,
          end: 0,
        }),
        frameRate: 1,
        repeat: -1,
      });
    }
    this.bodySprite.play(animKey);

    this.setInteractive(new Phaser.Geom.Rectangle(-16, -32, 32, 48), Phaser.Geom.Rectangle.Contains);
    this.on('pointerover', () => {
      this.scene.input.setDefaultCursor('pointer');
    });
    this.on('pointerout', () => {
      this.scene.input.setDefaultCursor('default');
    });
    this.on('pointerdown', () => this.talk());
  }

  private talk(): void {
    if (this.talkCooldown || this.dialogue.length === 0) return;
    this.talkCooldown = true;
    this.scene.time.delayedCall(1500, () => { this.talkCooldown = false; });

    const text = this.dialogue[this.dialogueIndex % this.dialogue.length];
    this.dialogueIndex++;
    this.showBubble(text, 3500);

    const store = useGameStore.getState();
    if (!store.achievements[ACH_TALK]) {
      store.unlockAchievement(ACH_TALK);
      try { localStorage.setItem('ach3', '1'); } catch {}
    }
  }
}
