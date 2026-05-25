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
import { Human } from '../entities/Human';
import {
  createPlayerAnimations,
  createWeaponAnimations,
  createDeathAnimation,
} from '../systems/AnimationSystem';
import { playSound, SFX, initAudio, setIntroMusic } from '../systems/AudioManager';

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
  private isNew = true;
  private existingID: string | undefined;
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
  private npcEntities: NPC[] = [];
  private entitiesClientData: any = {};
  private highLayer!: Phaser.Tilemaps.TilemapLayer;
  private revealedTiles: { x: number; y: number; alpha: number }[] = [];
  private collisionGrid: boolean[][] = [];

  private readonly ACH_WEAPON = 0;
  private readonly ACH_OUTDOOR = 1;
  private readonly ACH_RATS = 2;
  private readonly ACH_TALK = 3;
  private readonly ACH_ARMOR = 4;
  private readonly ACH_SKELETONS = 5;
  private readonly ACH_SOUTH = 6;
  private readonly ACH_TOMB = 7;

  constructor() {
    super('Game');
  }

  init(data: { playerName: string; isNew: boolean; existingID?: string }): void {
    this.playerName = data.playerName;
    this.isNew = data.isNew;
    this.existingID = data.existingID;
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

    this.highLayer = map.createLayer('highlayer0', tileset, 0, 0)!;
    this.highLayer.setDepth(1000);

    this.buildCollisionGrid(map);

    this.entitiesClientData = this.cache.json.get('entities_client') || {};
    this.restoreAchievements();
    this.spawnNPCs(map);

    this.createDeathOverlay();
    this.createChatUI();

    initAudio(this);
    if (this.cache.audio.exists('intro')) {
      const music = this.sound.add('intro', { loop: true, volume: 0.3 });
      music.play();
      setIntroMusic(music);
    }

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
        if (this.isNew) {
          wsClient.send({
            type: 'init_world',
            new: true,
            name: this.playerName,
            clientTime: Date.now(),
          });
        } else if (this.existingID) {
          wsClient.send({
            type: 'init_world',
            new: false,
            id: this.existingID,
            clientTime: Date.now(),
          });
        }
      } else if (status === 'error') this.worldText?.setText(`Error: ${err}`);
      else if (status === 'disconnected') {
        this.connected = false;
        this.worldText?.setText('Disconnected, retrying...');
      }
    });

    wsClient.onMessage((msg) => this.handleMessage(msg));
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    wsClient.connect(`${proto}://${location.host}`);

    this.events.on('shutdown', () => this.cleanupChat());
    this.events.on('destroy', () => this.cleanupChat());

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
      this.showTargetMarker(tileX, tileY);
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

    if (this.collisionGrid[tileY]?.[tileX]) return;

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

  private buildCollisionGrid(map: Phaser.Tilemaps.Tilemap): void {
    const cacheEntry = (this.cache.tilemap.get('map') as any);
    const mapData = cacheEntry?.data || cacheEntry;
    if (!mapData?.tilesets?.[0]?.tileproperties) return;

    const tileProperties = mapData.tilesets[0].tileproperties as Record<string, any>;
    const collidableGIDs = new Set<number>();
    for (const [tileIdStr, props] of Object.entries(tileProperties)) {
      if (props && (props as any).c !== undefined) {
        collidableGIDs.add(parseInt(tileIdStr) + 1);
      }
    }

    const tileLayers = mapData.layers.filter((l: any) => l.type === 'tilelayer');
    const width = mapData.width;
    for (let y = 0; y < mapData.height; y++) {
      const row: boolean[] = [];
      for (let x = 0; x < width; x++) {
        let blocked = false;
        for (const layer of tileLayers) {
          const gid = layer.data[y * width + x];
          if (gid && collidableGIDs.has(gid)) {
            blocked = true;
            break;
          }
        }
        row.push(blocked);
      }
      this.collisionGrid.push(row);
    }
  }

  private sortEntities(): void {
    const all: { obj: Phaser.GameObjects.Container; y: number }[] = [];
    this.playerEntities.forEach((p) => all.push({ obj: p, y: p.y }));
    this.monsterEntities.forEach((m) => all.push({ obj: m, y: m.y }));
    for (const npc of this.npcEntities) all.push({ obj: npc, y: npc.y });
    this.itemEntities.forEach((item) => all.push({ obj: item, y: item.y }));
    all.sort((a, b) => a.y - b.y);
    all.forEach((item, i) => item.obj.setDepth(i + 4));
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
        useGameStore.getState().setPlayerId(msg.playerID);
        try { localStorage.setItem('playerID', msg.playerID); } catch {}
        break;
      case 'chat':
        this.addChatMessage(msg.data.id, msg.data.text);
        break;
      case 'wait':
        this.worldText?.setText('Waiting for server...');
        break;
      case 'dbError':
        this.worldText?.setText('Error: ' + (msg.message || 'Database error'));
        this.connected = false;
        break;
      case 'reset':
        if (this.selfPlayer) {
          this.selfPlayer.setPositionTile(msg.data.x, msg.data.y, true);
          this.expectedTileX = msg.data.x;
          this.expectedTileY = msg.data.y;
          this.serverTileX = msg.data.x;
          this.serverTileY = msg.data.y;
          this.snapCameraToTile(msg.data.x, msg.data.y);
          this.updateRoofVisibility(msg.data.x, msg.data.y);
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
    try {
      localStorage.setItem('playerName', this.playerName);
      localStorage.setItem('weapon', 'sword1');
      localStorage.setItem('armor', 'clotharmor');
    } catch {}
  }

  private handleUpdate(data: any): void {
    if (data.nbconnected !== undefined) {
      useGameStore.getState().setNbConnected(data.nbconnected);
    }
    if (data.latency !== undefined) {
      useGameStore.getState().setLatency(data.latency);
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
        const currentLatency = useGameStore.getState().latency;
        if (id === this.selfPlayerId) {
          if (update.alive === false && this.selfPlayer && this.selfPlayer.alive !== false) {
            this.selfPlayer.alive = false;
            this.isDead = true;
            this.selfPlayer.bodySprite.play('death');
            this.showDeathOverlay();
          } else if (update.alive === true && this.selfPlayer && !this.selfPlayer.alive) {
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
            this.checkLocationAchievements(update.x, update.y);
          } else {
            ent.setPositionTile(update.x, update.y, false, currentLatency);
          }
        }
        if (update.route && update.route.orientation) {
          ent.orient(update.route.orientation);
        }
        if (update.weapon !== undefined) {
          const weaponKey = this.itemsIDmap[update.weapon] || 'sword1';
          ent.equipWeapon(weaponKey);
          if (id === this.selfPlayerId) {
            useGameStore.getState().setWeapon(weaponKey);
            try { localStorage.setItem('weapon', weaponKey); } catch {}
          }
        }
        if (update.armor !== undefined) {
          const armorKey = this.itemsIDmap[update.armor] || 'clotharmor';
          ent.equipArmor(armorKey);
          if (id === this.selfPlayerId) {
            useGameStore.getState().setArmor(armorKey);
            try { localStorage.setItem('armor', armorKey); } catch {}
          }
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
          ent.hitPoints = ent.maxHitPoints;
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
          if (ent.isChest || update.chest === true) {
            playSound(SFX.CHEST);
          }
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
          // Monster attacked the player
          if (this.selfPlayer) {
            this.showFloatingHP(
              this.selfPlayer.x / 32,
              this.selfPlayer.y / 32,
              -h.hp,
              false
            );
          }
          if (this.selfPlayer && h.from !== this.selfPlayerId && this.selfPlayer.alive) {
            this.selfPlayer.attack();
          }
          playSound(SFX.HURT);
        } else if (this.selfPlayer) {
          // Player attacked the monster
          const monster = this.monsterEntities.get(h.from);
          if (monster) {
            monster.hitPoints = (monster.hitPoints || 100) - h.hp;
            if (monster.hitPoints < 0) monster.hitPoints = 0;
            this.addMonsterHPBar(h.from, monster);
            if (monster.alive) {
              this.showFloatingHP(monster.x / 32, monster.y / 32, -h.hp, true);
            }
            monster.target = this.selfPlayer;
            monster.attack();
          }
          playSound(SFX.HIT);
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
      playSound(SFX.KILL);
      this.checkKillAchievements(monsterId);
    }
    if (local.used && local.used.length > 0) {
      for (const itemId of local.used) {
        const itemKey = this.itemsIDmap[itemId];
        if (itemKey && this.itemsInfo[itemKey]) {
          this.showNotification(`You picked up ${this.itemsInfo[itemKey].name || itemKey}`, 2000);
          this.checkEquipAchievements(itemId);
        } else {
          this.showNotification('You picked up an item', 2000);
        }
      }
    }
    if (local.noPick) {
      this.showNotification('You already have a better item', 2000);
      playSound(SFX.NOLOOT);
    }
    if (local.x !== undefined && local.y !== undefined && this.selfPlayer) {
      this.selfPlayer.setPositionTile(local.x, local.y, true);
      this.expectedTileX = local.x;
      this.expectedTileY = local.y;
      this.checkLocationAchievements(local.x, local.y);
      this.snapCameraToTile(local.x, local.y);
      this.updateRoofVisibility(local.x, local.y);
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
      this.updateRoofVisibility(player.x, player.y);
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
    ent.maxHitPoints = hp;
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
    playSound(SFX.DEATH);
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

  private snapCameraToTile(tileX: number, tileY: number): void {
    this.cameras.main.stopFollow();
    this.cameras.main.centerOn(tileX * 32, tileY * 32);
    if (this.selfPlayer) {
      this.cameras.main.startFollow(this.selfPlayer, true, 0.08, 0.08);
    }
  }

  private updateRoofVisibility(tileX: number, tileY: number): void {
    if (!this.highLayer) return;
    // Restore previously revealed tiles
    for (const prev of this.revealedTiles) {
      const t = this.highLayer.getTileAt(prev.x, prev.y);
      if (t) t.alpha = prev.alpha;
    }
    this.revealedTiles = [];
    // Fade out highlayer tiles in a 3x3 area around the player
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const tile = this.highLayer.getTileAt(tileX + dx, tileY + dy);
        if (tile) {
          this.revealedTiles.push({ x: tileX + dx, y: tileY + dy, alpha: tile.alpha });
          tile.alpha = 0.3;
        }
      }
    }
  }

  private createChatUI(): void {
    this.chatText = this.add.text(10, 410, '', {
      fontSize: '14px',
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
      zIndex: '1000',
    });
    document.body.appendChild(this.chatInputEl);

    const el = this.chatInputEl;
    el.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        const text = el.value.trim();
        if (text.length > 0) {
          wsClient.send({ type: 'chat', text });
        }
        el.value = '';
        el.blur();
      }
      if (e.key === 'Escape') {
        el.value = '';
        el.blur();
      }
    });
  }

  private addChatMessage(senderId: number, text: string): void {
    playSound(SFX.CHAT);
    const name = this.playerEntities.get(senderId)?.nameText.text || `Player${senderId}`;
    this.chatMessages.push(`${name}: ${text}`);
    if (this.chatMessages.length > 50) this.chatMessages.shift();
    this.chatText.setText(this.chatMessages.slice(-8).join('\n'));
    this.time.delayedCall(10000, () => {
      this.chatMessages.shift();
      this.chatText.setText(this.chatMessages.slice(-8).join('\n'));
    });
  }

  private showTargetMarker(tileX: number, tileY: number): void {
    const marker = this.add.graphics();
    marker.setDepth(50);
    const cx = tileX * 32 + 16;
    const cy = tileY * 32 + 16;
    marker.lineStyle(2, 0xffff00, 0.7);
    marker.strokeCircle(cx, cy, 6);
    marker.lineBetween(cx - 10, cy, cx - 4, cy);
    marker.lineBetween(cx + 4, cy, cx + 10, cy);
    marker.lineBetween(cx, cy - 10, cx, cy - 4);
    marker.lineBetween(cx, cy + 4, cx, cy + 10);
    this.tweens.add({
      targets: marker,
      alpha: 0,
      duration: 800,
      delay: 400,
      onComplete: () => marker.destroy(),
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
    const maxHP = being.maxHitPoints || 100;
    const lifePct = being.hitPoints !== undefined ? being.hitPoints / maxHP : 1;
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

  private spawnNPCs(map: Phaser.Tilemaps.Tilemap): void {
    const npcInfo = this.db?.npc || {};
    const entitiesLayer = map.getObjectLayer('entities');
    if (!entitiesLayer) return;

    for (const obj of entitiesLayer.objects as any[]) {
      const gid = obj.gid as number;
      if (!gid) continue;
      const entityKey = gid - 1961;
      const entityInfo = this.entitiesClientData[entityKey];
      if (!entityInfo?.npc) continue;

      const spriteKey = entityInfo.sprite as string;
      const npcData = npcInfo[spriteKey];
      if (!npcData) continue;

      const tileX = Math.ceil(obj.x / map.tileWidth);
      const tileY = Math.ceil(obj.y / map.tileHeight);
      const dialogue: string[] = npcData.dialogue || [];

      const npc = new NPC(this, tileX, tileY, spriteKey, dialogue);
      if (npcData.customAnchor) {
        npc.bodySprite.setOrigin(npcData.customAnchor.x, npcData.customAnchor.y);
      }
      this.npcEntities.push(npc);
    }
  }

  private checkLocationAchievements(tileX: number, tileY: number): void {
    const ach = this.db?.achievements;
    if (!ach) return;
    const store = useGameStore.getState();

    for (const key of Object.keys(ach)) {
      const a = ach[key];
      if (!a.locationAchievement) continue;
      const achId = parseInt(key);
      if (store.achievements[achId]?.unlocked) continue;

      const r = a.rect;
      const inside = tileX >= r.x && tileX < r.x + r.w && tileY >= r.y && tileY < r.y + r.h;
      const triggered = a.criterion === 'out' ? !inside : inside;
      if (triggered) {
        store.unlockAchievement(achId);
        this.showNotification(`Achievement: ${a.name}!`, 3000);
        playSound(SFX.ACHIEVEMENT);
        this.saveAchievements();
      }
    }
  }

  private checkKillAchievements(monsterId: number): void {
    const monsterKey = Object.keys(this.monstersInfo).find(
      (k) => this.monstersInfo[k].id === monsterId
    );
    if (!monsterKey) return;
    const store = useGameStore.getState();
    store.incrementKillCounter(monsterKey);

    const ratCount = store.killCounters['rat'] || 0;
    if (ratCount >= 10 && !store.achievements[this.ACH_RATS]?.unlocked) {
      store.unlockAchievement(this.ACH_RATS);
      this.showNotification('Achievement: Angry Rats!', 3000);
      playSound(SFX.ACHIEVEMENT);
      this.saveAchievements();
    }
    const skelCount = store.killCounters['skeleton'] || 0;
    if (skelCount >= 10 && !store.achievements[this.ACH_SKELETONS]?.unlocked) {
      store.unlockAchievement(this.ACH_SKELETONS);
      this.showNotification('Achievement: Bones Collector!', 3000);
      playSound(SFX.ACHIEVEMENT);
      this.saveAchievements();
    }
  }

  private checkEquipAchievements(itemId: number): void {
    const itemKey = this.itemsIDmap[itemId];
    if (!itemKey) return;
    const info = this.itemsInfo[itemKey];
    if (!info) return;
    const store = useGameStore.getState();

    if (info.type === 1 && !store.achievements[this.ACH_WEAPON]?.unlocked) {
      store.unlockAchievement(this.ACH_WEAPON);
      this.showNotification('Achievement: A True Warrior!', 3000);
      playSound(SFX.ACHIEVEMENT);
      this.saveAchievements();
    }
    if (info.type === 2 && !store.achievements[this.ACH_ARMOR]?.unlocked) {
      store.unlockAchievement(this.ACH_ARMOR);
      this.showNotification('Achievement: Fat Loot!', 3000);
      playSound(SFX.ACHIEVEMENT);
      this.saveAchievements();
    }
  }

  private restoreAchievements(): void {
    const store = useGameStore.getState();
    for (let i = 0; i < 8; i++) {
      if (localStorage.getItem('ach' + i)) {
        store.unlockAchievement(i);
      }
    }
  }

  private saveAchievements(): void {
    const store = useGameStore.getState();
    for (const [id, state] of Object.entries(store.achievements)) {
      if (state.unlocked) {
        localStorage.setItem('ach' + id, '1');
      }
    }
  }
}
