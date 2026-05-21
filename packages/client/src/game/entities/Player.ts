import Phaser from 'phaser';
import { Being } from './Being';
import {
  createPlayerAnimations,
  createWeaponAnimations,
  createDeathAnimation,
} from '../systems/AnimationSystem';

export class Player extends Being {
  armorName = 'clotharmor';
  weaponName = 'sword1';

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number
  ) {
    super(scene, x, y, 'atlas3', 'clotharmor_31');

    this.bodySprite.setOrigin(0.25, 0.35);
    this.bodySprite.setFrame('clotharmor_31');

    this.weaponSprite = scene.add.sprite(0, 0, 'atlas3', 'sword1_31');
    this.weaponSprite.setOrigin(0, 0);
    this.add(this.weaponSprite);

    this.nameText.setY(-28);
    this.setDepth(11);
  }

  setUp(armor: string, weapon: string): void {
    this.armorName = armor;
    this.weaponName = weapon;
    this.refreshEquipment();
  }

  refreshEquipment(): void {
    createPlayerAnimations(this.scene, this.armorName);
    createWeaponAnimations(this.scene, this.weaponName);
    createDeathAnimation(this.scene);

    const frame = `${this.armorName}_31`;
    if (this.scene.textures.get('atlas3').has(frame)) {
      this.bodySprite.setFrame(frame);
    }
    this.playAnim(`${this.armorName}_idle_down`, true);
  }

  equipWeapon(weaponKey: string): void {
    this.weaponName = weaponKey;
    createWeaponAnimations(this.scene, weaponKey);
    const frame = `${weaponKey}_31`;
    if (this.weaponSprite && this.scene.textures.get('atlas3').has(frame)) {
      this.weaponSprite.setFrame(frame);
    }
    this.playAnim(`${this.weaponName}_idle_down`, true);
  }

  equipArmor(armorKey: string): void {
    this.armorName = armorKey;
    this.refreshEquipment();
  }

  playAnim(key: string, force = false): void {
    const bodyKey = `${this.armorName}_${key}`;
    if (this.scene.anims.exists(bodyKey)) {
      this.bodySprite.play(bodyKey, force);
    }
    const weaponKey = `${this.weaponName}_${key}`;
    if (this.weaponSprite && this.scene.anims.exists(weaponKey)) {
      this.weaponSprite.play(weaponKey, force);
    }
  }
}
