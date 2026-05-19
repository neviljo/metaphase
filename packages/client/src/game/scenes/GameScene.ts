import Phaser from 'phaser';
import type {
  InitPacket,
  GlobalUpdate,
  LocalUpdate,
  PlayerState,
  MonsterState,
  ItemState,
} from 'phaserquest-shared';
import { wsClient } from '../../network/WebSocketClient';
import { useGameStore } from '../../store/GameStore';
import { Player } from '../entities/Player';
import { Monster } from '../entities/Monster';
import { ItemEntity } from '../entities/ItemEntity';
import { NPC } from '../entities/NPC';
import {
  createPlayerAnimations,
  createWeaponAnimations,
  createDeathAnimation,
} from '../systems/AnimationSystem';

function buildItemsIDmap(db: any): Record<number, string> {
  const map: Record<number, string> = {};
  if (!db?.items) return map;
  for (const key of Object.keys(db.items)) {
    const item = db.items[key];
    if (typeof item.id === 'number') {
      map[item.id] = key;
    }
  }
  return map;
}

export class GameScene extends Phaser.Scene {
  private playerName = '';
  private db: any = null;
  private selfPlayer: Player | null = null;
  private playerEntities = new Map<number, Player>();
  private monsterEntities = new Map<number, Monster>();
  private itemEntities = new Map<number, ItemEntity>();
  private worldText: Phaser.GameObjects.Text | null = null;
  private selfPlayerId: number | null = null;
  private monstersInfo: Record<string, any> = {};
  private itemsInfo: Record<string, any> = {};
  private itemsIDmap: Record<number, string> = {};

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private lastMoveTime = 0;
  private moveDelay = 150;
  private connected = false;
  private expectedTileX = 0;
  private expectedTileY = 0;
  private serverTileX = 0;
  private serverTileY = 0;

  private notificationText!: Phaser.GameObjects.Text;
  private notificationTimer: Phaser.Time.TimerEvent | null = null;

  private deathOverlay!: Phaser.GameObjects.Rectangle;
  private deathText!: Phaser.GameObjects.Text;
  private reviveButton!: Phaser.GameObjects.Text;
  private isDead = false;

  private chatMessages: string[] = [];
  private chatText!: Phaser.GameObjects.Text;
  private chatInputEl: HTMLInputElement | null = null;
  private monsterHPBars = new Map<number, Phaser.GameObjects.Graphics>();

  constructor() {
    super('Game');
  }

  init(data: { playerName: string }): void {
    this.playerName = data.playerName;
  }

  create(): void {
    this.db = this.cache.json.get('db');

    this.monstersInfo = this.db?.monsters || {};
    this.itemsInfo = this.db?.items || {};
    this.itemsIDmap = buildItemsIDmap(this.db);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    const map = this.make.tilemap({ key: 'map' });
    const tileset = map.addTilesetImage('tilesheet', 'tilesheet')!;

    const mapW = map.widthInPixels;
    const mapH = map.heightInPixels;
    this.cameras.main.setBounds(0, 0, mapW, mapH);

    const layerNames = ['layer0', 'layer1', 'layer2', 'layer3'];
    for (const name of layerNames) {
      const layer = map.createLayer(name, tileset, 0, 0)!;
      layer.setDepth(0);
    }

    const highLayer = map.createLayer('highlayer0', tileset, 0, 0)!;
    highLayer.setDepth(4);

    this.createDeathOverlay();
    this.createChatUI();

    this.worldText = this.add.text(490, 240, 'Connecting...', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 3,
    });
    this.worldText.setOrigin(0.5);
    this.worldText.setScrollFactor(0).setDepth(100);

    this.notificationText = this.add.text(490, 40, '', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#ffff00',
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center',
    });
    this.notificationText.setOrigin(0.5, 0);
    this.notificationText.setScrollFactor(0).setDepth(200);

    wsClient.onStatus((status, err) => {
      if (status === 'connecting') this.worldText?.setText('Connecting...');
      else if (status === 'connected') {
        this.connected = true;
        this.worldText?.setText('Connected! Requesting world...');
        wsClient.send({
          type: 'init_world',
          new: true,
          name: this.playerName,
          clientTime: Date.now(),
        });
      } else if (status === 'error') this.worldText?.setText(`Error: ${err}`);
      else if (status === 'disconnected') {
        this.connected = false;
        this.worldText?.setText('Disconnected, retrying...');
      }
    });

    wsClient.onMessage((msg) => this.handleMessage(msg));
    wsClient.connect(`ws://${location.hostname}:8081`);

    this.events.on('shutdown', () => this.cleanupChat());

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.selfPlayer || !this.connected) return;
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const tileX = Math.floor(worldPoint.x / 32);
      const tileY = Math.floor(worldPoint.y / 32);
      wsClient.send({
        type: 'path',
        path: [{ x: tileX, y: tileY }],
        action: { action: 0 },
        or: 4,
      });
    });
  }

  update(_time: number, delta: number): void {
    if (this.selfPlayer) {
      this.sortEntities();
    }

    if (!this.selfPlayer || !this.connected || this.isDead) return;

    this.lastMoveTime += delta;
    if (this.lastMoveTime < this.moveDelay) return;

    let dx = 0;
    let dy = 0;
    let or = this.selfPlayer.orientation;

    if (this.cursors.left.isDown || this.wasd.left.isDown) {
      dx = -1; dy = 0; or = 1;
    } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
      dx = 1; dy = 0; or = 3;
    } else if (this.cursors.up.isDown || this.wasd.up.isDown) {
      dx = 0; dy = -1; or = 2;
    } else if (this.cursors.down.isDown || this.wasd.down.isDown) {
      dx = 0; dy = 1; or = 4;
    } else {
      if (this.selfPlayer.moveTween === null) this.selfPlayer.idle(true);
      return;
    }

    this.lastMoveTime = 0;
    this.selfPlayer.orient(or);
    const curX = this.expectedTileX;
    const curY = this.expectedTileY;
    const tileX = curX + dx;
    const tileY = curY + dy;
    this.expectedTileX = tileX;
    this.expectedTileY = tileY;
    this.selfPlayer.setPositionTile(tileX, tileY);
    wsClient.send({
      type: 'path',
      path: [{ x: tileX, y: tileY }],
      action: { action: 0 },
      or,
    });
  }

  private sortEntities(): void {
    const all: { obj: Phaser.GameObjects.Container; y: number }[] = [];
    this.playerEntities.forEach((p) => all.push({ obj: p, y: p.y }));
    this.monsterEntities.forEach((m) => all.push({ obj: m, y: m.y }));
    all.sort((a, b) => a.y - b.y);
    all.forEach((item, i) => item.obj.setDepth(i + 5));
  }

  private handleMessage(msg: any): void {
    switch (msg.type) {
      case 'init':
        this.worldText?.setText('Connected!');
        this.handleInit(msg.data);
        break;
      case 'update':
        this.handleUpdate(msg.data);
        break;
      case 'pid':
        this.selfPlayerId = parseInt(msg.playerID, 10);
        useGameStore.getState().setPlayerId(msg.playerID);
        break;
      case 'chat':
        this.addChatMessage(msg.data.id, msg.data.text);
        break;
      case 'wait':
        this.worldText?.setText('Waiting for server...');
        break;
      case 'reset':
        if (this.selfPlayer) {
          this.selfPlayer.setPositionTile(msg.data.x, msg.data.y);
          this.expectedTileX = msg.data.x;
          this.expectedTileY = msg.data.y;
          this.serverTileX = msg.data.x;
          this.serverTileY = msg.data.y;
        }
        break;
    }
  }

  private handleInit(data: InitPacket): void {
    this.selfPlayerId = data.player.id;
    useGameStore.getState().setHp(100);
    useGameStore.getState().setNbConnected(data.nbconnected);
    this.worldText?.setText('');
    this.addPlayer(data.player, true);
  }

  private handleUpdate(data: any): void {
    if (data.nbconnected !== undefined) {
      useGameStore.getState().setNbConnected(data.nbconnected);
    }
    if (data.global) this.handleGlobalUpdate(data.global);
    if (data.local) this.handleLocalUpdate(data.local);
  }

  private handleGlobalUpdate(global: GlobalUpdate): void {
    if (global.newplayers) {
      for (const p of global.newplayers) {
        if (!this.playerEntities.has(p.id)) {
          this.addPlayer(p, p.id === this.selfPlayerId);
        }
      }
    }
    if (global.newmonsters) {
      for (const m of global.newmonsters) {
        if (!this.monsterEntities.has(m.id)) {
          this.addMonster(m);
        }
      }
    }
    if (global.newitems) {
      for (const item of global.newitems) {
        if (!this.itemEntities.has(item.id)) {
          this.addItem(item);
        }
      }
    }
    if (global.disconnected) {
      for (const id of global.disconnected) {
        const ent = this.playerEntities.get(id);
        if (ent) {
          ent.destroy();
          this.playerEntities.delete(id);
        }
      }
    }
    if (global.players) {
      for (const [idStr, update] of Object.entries(global.players)) {
        const id = Number(idStr);
        const ent = this.playerEntities.get(id);
        if (!ent) continue;
        if (id === this.selfPlayerId) {
          if (update.alive === false && this.selfPlayer && this.selfPlayer.alive !== false) {
            this.selfPlayer.alive = false;
            this.selfPlayer.bodySprite.play('death');
            this.time.delayedCall(1500, () => this.showDeathOverlay());
          } else if (update.alive === true && this.isDead && this.selfPlayer) {
            this.hideDeathOverlay();
            this.selfPlayer.alive = true;
            this.selfPlayer.setVisible(true);
            this.selfPlayer.idle(true);
          }
        } else {
          if (update.alive === false && ent.alive) {
            ent.alive = false;
            ent.bodySprite.play('death');
            this.time.delayedCall(600, () => ent.setVisible(false));
          } else if (update.alive === true && !ent.alive) {
            ent.alive = true;
            ent.setVisible(true);
            ent.idle(true);
          }
        }
        if (update.x !== undefined && update.y !== undefined) {
          if (id === this.selfPlayerId) {
            this.serverTileX = update.x;
            this.serverTileY = update.y;
          } else {
            ent.setPositionTile(update.x, update.y);
          }
        }
        if (update.route && update.route.orientation) {
          ent.orient(update.route.orientation);
        }
        if (update.weapon !== undefined) {
          const weaponKey = this.itemsIDmap[update.weapon] || 'sword1';
          ent.equipWeapon(weaponKey);
        }
        if (update.armor !== undefined) {
          const armorKey = this.itemsIDmap[update.armor] || 'clotharmor';
          ent.equipArmor(armorKey);
        }
        if (update.route) {
          const r = update.route as any;
          if (r.end && id !== this.selfPlayerId) {
            ent.setPositionTile(r.end.x, r.end.y);
          }
        }
      }
    }
    if (global.monsters) {
      const seenMonsterIds = new Set<number>();
      for (const [idStr, update] of Object.entries(global.monsters)) {
        const id = Number(idStr);
        seenMonsterIds.add(id);
        const ent = this.monsterEntities.get(id);
        if (!ent) continue;
        if (update.x !== undefined && update.y !== undefined) {
          if (id === this.selfPlayerId) {
            this.expectedTileX = update.x;
            this.expectedTileY = update.y;
          } else {
            const dist = Math.abs(ent.x - update.x * 32) + Math.abs(ent.y - update.y * 32);
            if (dist > 64) {
              ent.setPositionTile(update.x, update.y, true);
            }
          }
        }
        if (update.route && (update.route as any).path) {
          const path = (update.route as any).path;
          const last = path[path.length - 1];
          if (last) ent.setPositionTile(last.x, last.y);
        }
        if (update.alive === false) {
          if (ent.alive) {
            ent.alive = false;
            ent.bodySprite.play(ent.monsterName + '_death');
            this.time.delayedCall(600, () => {
              ent.setVisible(false);
              this.removeMonsterHPBar(id);
            });
          }
        } else if (update.alive === true) {
          ent.alive = true;
          ent.setVisible(true);
          this.addMonsterHPBar(id, ent);
          ent.idle(true);
        }
        if (update.inFight !== undefined && id !== this.selfPlayerId) {
          ent.inFight = update.inFight;
          if (update.inFight && update.targetID) {
            const targetEnt = this.playerEntities.get(update.targetID) || this.monsterEntities.get(update.targetID);
            if (targetEnt) ent.target = targetEnt;
            ent.attack();
          }
        }
      }
    }
    if (global.items) {
      for (const [idStr, update] of Object.entries(global.items)) {
        const id = Number(idStr);
        const ent = this.itemEntities.get(id);
        if (ent && update.visible === false) {
          ent.setVisible(false);
          this.time.delayedCall(9000, () => {
            ent.destroy();
            this.itemEntities.delete(id);
          });
        }
      }
    }
  }

  private handleLocalUpdate(local: LocalUpdate): void {
    if (local.life !== undefined) {
      useGameStore.getState().setHp(local.life);
    }
    if (local.hp) {
      for (const h of local.hp) {
        if (h.target) {
          const monster = this.monsterEntities.get(h.from);
          if (monster) {
            if (monster.alive) this.showFloatingHP(monster.x / 32, monster.y / 32, -h.hp, true);
            monster.hitPoints = (monster.hitPoints || 100) - h.hp;
            if (monster.hitPoints < 0) monster.hitPoints = 0;
            this.addMonsterHPBar(h.from, monster);
          }
          if (this.selfPlayer && h.from !== this.selfPlayerId) {
            this.selfPlayer.attack();
          }
        } else if (this.selfPlayer) {
          this.showFloatingHP(
            this.selfPlayer.x / 32,
            this.selfPlayer.y / 32,
            h.hp > 0 ? h.hp : -h.hp,
            false
          );
          const attacker = this.monsterEntities.get(h.from);
          if (attacker) {
            attacker.target = this.selfPlayer;
            attacker.attack();
          }
        }
      }
    }
    if (local.killed && local.killed.length > 0) {
      const monsterId = local.killed[0];
      const monsterKey = Object.keys(this.monstersInfo).find(
        (k) => this.monstersInfo[k].id === monsterId
      );
      const name = monsterKey ? (this.monstersInfo[monsterKey].name || monsterKey) : 'Monster';
      this.showNotification(`Killed ${name}!`, 2000);
    }
    if (local.used && local.used.length > 0) {
      for (const itemId of local.used) {
        const itemKey = this.itemsIDmap[itemId];
        if (itemKey && this.itemsInfo[itemKey]) {
          this.showNotification(`You picked up ${this.itemsInfo[itemKey].name || itemKey}`, 2000);
        } else {
          this.showNotification('You picked up an item', 2000);
        }
      }
    }
    if (local.noPick) {
      this.showNotification('You already have a better item', 2000);
    }
    if (local.x !== undefined && local.y !== undefined && this.selfPlayer) {
      this.selfPlayer.setPositionTile(local.x, local.y, true);
      this.expectedTileX = local.x;
      this.expectedTileY = local.y;
    }
  }

  private addPlayer(player: PlayerState, isSelf: boolean): void {
    const armorKey = this.itemsIDmap[player.armor] || 'clotharmor';
    const weaponKey = this.itemsIDmap[player.weapon] || 'sword1';

    createPlayerAnimations(this, armorKey);
    createWeaponAnimations(this, weaponKey);
    createDeathAnimation(this);

    const ent = new Player(this, player.x, player.y);
    ent.setUp(armorKey, weaponKey);
    ent.setDisplayName(player.name);
    ent.isPlayer = isSelf;
    if (isSelf) {
      this.selfPlayer = ent;
      this.expectedTileX = player.x;
      this.expectedTileY = player.y;
      this.serverTileX = player.x;
      this.serverTileY = player.y;
      this.cameras.main.startFollow(ent, true, 0.08, 0.08);
    }
    this.playerEntities.set(player.id, ent);
  }

  private addMonster(monster: MonsterState): void {
    const monsterKey = Object.keys(this.monstersInfo).find(
      (k) => this.monstersInfo[k].id === monster.monster
    );
    if (!monsterKey) return;
    const info = this.monstersInfo[monsterKey];
    const hp = info.life || 100;

    const ent = new Monster(this, monster.x, monster.y, monsterKey);
    ent.monsterName = monsterKey;
    ent.hitPoints = hp;
    ent.setUp(info.frames, info.customAnchor);
    if (monster.alive === false) {
      ent.setVisible(false);
    } else {
      this.addMonsterHPBar(monster.id, ent);
    }
    this.monsterEntities.set(monster.id, ent);
  }

  private showNotification(msg: string, duration = 2500): void {
    this.notificationText.setText(msg);
    if (this.notificationTimer) this.notificationTimer.destroy();
    this.notificationTimer = this.time.delayedCall(duration, () => {
      this.notificationText.setText('');
    });
  }

  private createDeathOverlay(): void {
    this.deathOverlay = this.add.rectangle(490, 250, 980, 500, 0x000000, 0.6);
    this.deathOverlay.setScrollFactor(0).setDepth(300);
    this.deathOverlay.setVisible(false);

    this.deathText = this.add.text(490, 220, 'You Died', {
      fontSize: '32px',
      fontFamily: 'monospace',
      color: '#ff0000',
      stroke: '#000000',
      strokeThickness: 4,
    });
    this.deathText.setOrigin(0.5);
    this.deathText.setScrollFactor(0).setDepth(301);
    this.deathText.setVisible(false);

    this.reviveButton = this.add.text(490, 280, '[ Revive ]', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#ffffff',
      backgroundColor: '#444444',
      padding: { x: 12, y: 6 },
    });
    this.reviveButton.setOrigin(0.5);
    this.reviveButton.setScrollFactor(0).setDepth(302);
    this.reviveButton.setVisible(false);
    this.reviveButton.setInteractive({ useHandCursor: true });
    this.reviveButton.on('pointerdown', () => {
      wsClient.send({ type: 'revive' });
      this.hideDeathOverlay();
    });
    this.reviveButton.on('pointerover', () => this.reviveButton.setColor('#ffff00'));
    this.reviveButton.on('pointerout', () => this.reviveButton.setColor('#ffffff'));
  }

  private showDeathOverlay(): void {
    this.isDead = true;
    this.deathOverlay.setVisible(true);
    this.deathText.setVisible(true);
    this.reviveButton.setVisible(false);
    this.time.delayedCall(3000, () => {
      this.reviveButton.setVisible(true);
    });
  }

  private hideDeathOverlay(): void {
    this.isDead = false;
    this.deathOverlay.setVisible(false);
    this.deathText.setVisible(false);
    this.reviveButton.setVisible(false);
  }

  private createChatUI(): void {
    this.chatText = this.add.text(10, 420, '', {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 1,
      wordWrap: { width: 400 },
      maxLines: 8,
    });
    this.chatText.setScrollFactor(0).setDepth(200);

    this.chatInputEl = document.createElement('input');
    this.chatInputEl.type = 'text';
    this.chatInputEl.placeholder = 'Press Enter to chat...';
    Object.assign(this.chatInputEl.style, {
      position: 'absolute',
      bottom: '5px',
      left: '10px',
      width: '300px',
      padding: '4px 8px',
      fontSize: '13px',
      fontFamily: 'monospace',
      border: '1px solid #666',
      background: 'rgba(0,0,0,0.7)',
      color: '#fff',
      outline: 'none',
      display: 'none',
      zIndex: '1000',
    });
    document.body.appendChild(this.chatInputEl);

    this.chatInputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this.chatInputEl) {
        const text = this.chatInputEl.value.trim();
        if (text.length > 0) {
          wsClient.send({ type: 'chat', text });
        }
        this.chatInputEl.value = '';
        this.chatInputEl.style.display = 'none';
      }
      if (e.key === 'Escape' && this.chatInputEl) {
        this.chatInputEl.value = '';
        this.chatInputEl.style.display = 'none';
      }
    });

    this.input.keyboard!.on('keydown-ENTER', () => {
      if (!this.chatInputEl) return;
      if (this.chatInputEl.style.display === 'none') {
        this.chatInputEl.style.display = 'block';
        this.chatInputEl.focus();
      }
    });
  }

  private addChatMessage(senderId: number, text: string): void {
    const name = this.playerEntities.get(senderId)?.nameText.text || `Player${senderId}`;
    this.chatMessages.push(`${name}: ${text}`);
    if (this.chatMessages.length > 50) this.chatMessages.shift();
    this.chatText.setText(this.chatMessages.slice(-8).join('\n'));
    this.time.delayedCall(10000, () => {
      this.chatMessages.shift();
      this.chatText.setText(this.chatMessages.slice(-8).join('\n'));
    });
  }

  private showFloatingHP(x: number, y: number, hp: number, isMonster: boolean): void {
    const color = isMonster ? '#ff0000' : '#ffff00';
    const text = this.add.text(x * 32, y * 32 - 16, hp > 0 ? `+${hp}` : `${hp}`, {
      fontSize: '13px',
      fontFamily: 'monospace',
      color,
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(50);
    this.tweens.add({
      targets: text,
      y: text.y - 24,
      alpha: 0,
      duration: 800,
      onComplete: () => text.destroy(),
    });
  }

  private addMonsterHPBar(monsterId: number, being: Monster): void {
    let hpBar = this.monsterHPBars.get(monsterId);
    if (!hpBar) {
      hpBar = this.add.graphics();
      hpBar.setDepth(15);
      this.monsterHPBars.set(monsterId, hpBar);
    }
    const lifePct = being.hitPoints !== undefined ? being.hitPoints / 100 : 1;
    hpBar.clear();
    hpBar.fillStyle(0x000000, 0.6);
    hpBar.fillRect(being.x - 16, being.y - 36, 32, 4);
    hpBar.fillStyle(0xff0000, 1);
    hpBar.fillRect(being.x - 16, being.y - 36, 32 * lifePct, 4);
  }

  private removeMonsterHPBar(monsterId: number): void {
    const hpBar = this.monsterHPBars.get(monsterId);
    if (hpBar) {
      hpBar.destroy();
      this.monsterHPBars.delete(monsterId);
    }
  }

  private cleanupChat(): void {
    if (this.chatInputEl && this.chatInputEl.parentNode) {
      this.chatInputEl.parentNode.removeChild(this.chatInputEl);
    }
    this.chatInputEl = null;
  }

  private addItem(item: ItemState): void {
    const itemKey = Object.keys(this.itemsInfo).find(
      (k) => this.itemsInfo[k].id === item.itemID
    );
    if (!itemKey) {
      const ent = new ItemEntity(this, item.x, item.y, item.id, 'item-flask');
      if (item.chest) ent.showChest();
      if (!item.visible) ent.setVisible(false);
      this.itemEntities.set(item.id, ent);
      return;
    }

    const ent = new ItemEntity(this, item.x, item.y, item.id, itemKey);
    if (item.chest) ent.showChest();
    if (!item.visible) ent.setVisible(false);
    if (item.loot) ent.showSparkle();
    this.itemEntities.set(item.id, ent);
  }
}
