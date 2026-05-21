import Phaser from 'phaser';

const ORIENTATIONS = ['down', 'up', 'left', 'right'];

export function createPlayerAnimations(scene: Phaser.Scene, armorName: string): void {
  const prefix = armorName;
  const frames: Record<string, [number, number, number?]> = {
    attack_right: [0, 4, 9],
    right: [5, 8],
    idle_right: [9, 10],
    attack_up: [11, 15, 20],
    up: [16, 19],
    idle_up: [20, 21],
    attack_down: [22, 26, 31],
    down: [27, 30],
    idle_down: [31, 32],
    attack_left: [33, 37, 42],
    left: [38, 41],
    idle_left: [42, 43],
  };

  for (const [animName, [start, end, comeback]] of Object.entries(frames)) {
    const key = `${prefix}_${animName}`;
    if (scene.anims.exists(key)) continue;
    const frameArray = scene.anims.generateFrameNames('atlas3', {
      prefix: `${prefix}_`,
      start,
      end,
      zeroPad: 0,
    });
    if (comeback !== undefined) {
      frameArray.push({ key: 'atlas3', frame: `${prefix}_${comeback}` });
    }
    const isAttack = animName.startsWith('attack');
    const isIdle = animName.startsWith('idle');
    const rate = isAttack ? 14 : isIdle ? 2 : 8;
    scene.anims.create({
      key,
      frames: frameArray,
      frameRate: rate,
      repeat: isAttack ? 0 : -1,
    });
  }
}

export function createWeaponAnimations(scene: Phaser.Scene, weaponName: string): void {
  const prefix = weaponName;
  const frames: Record<string, [number, number, number?]> = {
    attack_right: [0, 4, 9],
    right: [5, 8],
    idle_right: [9, 10],
    attack_up: [11, 15, 20],
    up: [16, 19],
    idle_up: [20, 21],
    attack_down: [22, 26, 31],
    down: [27, 30],
    idle_down: [31, 32],
    attack_left: [33, 37, 42],
    left: [38, 41],
    idle_left: [42, 43],
  };

  for (const [animName, [start, end, comeback]] of Object.entries(frames)) {
    const key = `${prefix}_${animName}`;
    if (scene.anims.exists(key)) continue;
    const frameArray = scene.anims.generateFrameNames('atlas3', {
      prefix: `${prefix}_`,
      start,
      end,
      zeroPad: 0,
    });
    if (comeback !== undefined) {
      frameArray.push({ key: 'atlas3', frame: `${prefix}_${comeback}` });
    }
    const isAttack = animName.startsWith('attack');
    const isIdle = animName.startsWith('idle');
    const rate = isAttack ? 14 : isIdle ? 2 : 8;
    scene.anims.create({
      key,
      frames: frameArray,
      frameRate: rate,
      repeat: isAttack ? 0 : -1,
    });
  }
}

export function createDeathAnimation(scene: Phaser.Scene): void {
  if (scene.anims.exists('death')) return;
  scene.anims.create({
    key: 'death',
    frames: scene.anims.generateFrameNames('atlas3', {
      prefix: 'death_',
      start: 0,
      end: 5,
    }),
    frameRate: 8,
    repeat: 0,
  });
}

export function basePlayerAnimationKeys(prefix: string): string[] {
  return [
    `${prefix}_attack_right`,
    `${prefix}_right`,
    `${prefix}_idle_right`,
    `${prefix}_attack_up`,
    `${prefix}_up`,
    `${prefix}_idle_up`,
    `${prefix}_attack_down`,
    `${prefix}_down`,
    `${prefix}_idle_down`,
    `${prefix}_attack_left`,
    `${prefix}_left`,
    `${prefix}_idle_left`,
  ];
}

export function monsterAnimationBaseFrames(
  monsterFrames: Record<string, number[]>
): Record<string, [number, number]> {
  const result: Record<string, [number, number]> = {};
  for (const [key, val] of Object.entries(monsterFrames)) {
    if (key === 'death') continue;
    result[key] = [val[0], val[1]];
  }
  return result;
}

export const ORIENTATION_TO_DIR: Record<number, string> = {
  1: 'left',
  2: 'up',
  3: 'right',
  4: 'down',
};
