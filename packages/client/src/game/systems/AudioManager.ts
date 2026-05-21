let scene: Phaser.Scene | null = null;
let muted = false;
let introMusic: Phaser.Sound.BaseSound | null = null;

export function initAudio(s: Phaser.Scene): void {
  scene = s;
}

export function setIntroMusic(sound: Phaser.Sound.BaseSound): void {
  introMusic = sound;
  if (muted) {
    introMusic.pause();
  }
}

export function setMuted(m: boolean): void {
  muted = m;
  if (introMusic) {
    if (m) {
      introMusic.pause();
    } else {
      introMusic.resume();
    }
  }
}

export function isMuted(): boolean {
  return muted;
}

export function playSound(key: string): void {
  if (muted || !scene) return;
  try {
    scene.sound.playAudioSprite('sounds', key);
  } catch {
    // ignore if audio sprite not yet ready
  }
}

export const SFX = {
  ACHIEVEMENT: 'achievement',
  CHAT: 'chat',
  CHEST: 'chest',
  DEATH: 'death',
  HEAL: 'heal',
  HIT: 'hit1',
  HURT: 'hurt',
  KILL: 'kill2',
  NOLOOT: 'noloot',
};
