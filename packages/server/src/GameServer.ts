import fs from 'fs';
import PF from 'pathfinding';
const PFGrid = PF.Grid as any;
import rwc from 'random-weighted-choice';
import type { ServerMessage, InitPacket, TileCoord, GameAction, GlobalUpdate } from 'phaserquest-shared';
import { Broadcaster } from './protocol/broadcaster.js';
import { SpaceMap } from './aoi/spaceMap.js';
import { AOIutils } from './aoi/AOIutils.js';
import { AOI } from './aoi/AOI.js';
import { Player } from './entities/Player.js';
import { Monster } from './entities/Monster.js';
import { Item } from './entities/Item.js';
import { ChestArea } from './systems/ChestAreaSystem.js';
import { setUpFight, areFighting, handleKill, dropLoot, spawnHiddenChest, formatLootTable } from './systems/CombatSystem.js';
import { PlayerModel } from './db/models/PlayerModel.js';
import { Types } from 'mongoose';
import clone from 'clone';

function randomInt(low: number, high: number): number {
  return Math.floor(Math.random() * (high - low) + low);
}

function manhattanDistance(xA: number, yA: number, xB: number, yB: number): number {
  return Math.abs(xA - xB) + Math.abs(yA - yB);
}

export class GameServer {
  static instance: GameServer;

  broadcaster: Broadcaster;
  map: any = null;
  mapReady = false;
  updateRate = 1000 / 12;
  regenRate = 1000 * 5;
  itemRespawnDelay = 1000 * 30;
  monsterRespawnDelay = 1000 * 30;
  itemVanishDelay = 1000 * 9;
  retryDelay = 1000 * 3;
  walkUpdateDelay = 80;
  fightUpdateDelay = 200;
  damageDelay = 1000;
  positionCheckDelay = 1000;
  lastItemID = 0;
  lastMonsterID = 0;
  lastPlayerID = 0;
  AOIwidth = 34;
  AOIheight = 20;
  nbConnectedChanged = false;

  players: Record<number, Player> = {};
  socketMap = new Map<string, number>();
  IDmap = new Map<number, string>();
  db: any = {};
  objects: any = {};
  layers: any[] = [];
  tilesets: any = {};
  AOIs: Record<number, AOI> = {};
  dirtyAOIs = new Set<number>();
  AOIfromTiles!: SpaceMap<any>;
  collisionGrid: number[][] = [];
  PFgrid: any;
  pathfinder: any;
  doors!: SpaceMap<any>;
  playersMap!: SpaceMap<any>;
  items!: SpaceMap<any>;
  monsters!: SpaceMap<any>;
  monstersTable: Record<number, Monster> = {};
  chestAreas: Record<number, ChestArea> = {};

  constructor(broadcaster: Broadcaster) {
    this.broadcaster = broadcaster;
    GameServer.instance = this;
  }

  // ── Map reading ──

  readMap(): void {
    this.db = JSON.parse(fs.readFileSync('./assets/json/db.json', 'utf8'));
    this.db.entities = JSON.parse(
      fs.readFileSync('./assets/json/entities_server.json', 'utf8')
    );
    this.db.client_entities = JSON.parse(
      fs.readFileSync('./assets/json/entities_client.json', 'utf8')
    );
    Object.assign(this.db.entities, this.db.client_entities);
    this.db.itemsIDmap = {};
    this.makeIDmap(this.db.items, this.db.itemsIDmap);

    const data = fs.readFileSync('./assets/maps/minimap_server.json', 'utf8');
    this.map = JSON.parse(data);
    this.objects = {};
    this.layers = [];
    this.tilesets = {};

    for (let l = 0; l < this.map.layers.length; l++) {
      const layer = this.map.layers[l];
      if (layer.type === 'objectgroup') {
        this.objects[layer.name] = layer.objects;
      } else if (layer.type === 'tilelayer') {
        this.layers.push(layer.data);
      }
    }
    for (let t = 0; t < this.map.tilesets.length; t++) {
      const tileset = this.map.tilesets[t];
      this.tilesets[tileset.name] = tileset.tileproperties;
    }

    AOIutils.nbAOIhorizontal = Math.ceil(this.map.width / this.AOIwidth);
    this.AOIs = {};
    this.dirtyAOIs = new Set();
    this.AOIfromTiles = new SpaceMap();
    this.collisionGrid = [];

    let aoiIdCounter = 0;
    for (let y = 0; y < this.map.height; y++) {
      const col: number[] = [];
      for (let x = 0; x < this.map.width; x++) {
        if (x % this.AOIwidth === 0 && y % this.AOIheight === 0) {
          const area = new AOI(x, y, this.AOIwidth, this.AOIheight);
          area.id = aoiIdCounter++;
          this.AOIs[area.id] = area;
        }
        AOIutils.lastAOIid = aoiIdCounter;
        this.AOIfromTiles.add(x, y, this.AOIs[this.getIDfromCoords(x, y)]);
        let collide = false;
        for (let l = 0; l < this.layers.length; l++) {
          const tile = this.layers[l][y * this.map.width + x];
          if (tile && this.tilesets['tilesheet']) {
            const tileProperties = this.tilesets['tilesheet'][tile - 1];
            if (tileProperties && tileProperties.hasOwnProperty('c')) {
              collide = true;
              break;
            }
          }
        }
        col.push(+collide);
      }
      this.collisionGrid.push(col);
    }

    this.PFgrid = new PFGrid(this.collisionGrid);
    this.pathfinder = new PF.AStarFinder();
    this.setUpDoors();
    this.setUpEntities();
    this.setUpChests();
    this.setUpRoaming();
    this.setLoops();
    console.log('Map read');
    this.mapReady = true;
  }

  private getIDfromCoords(x: number, y: number): number {
    return (
      Math.floor(x / this.AOIwidth) +
      AOIutils.nbAOIhorizontal * Math.floor(y / this.AOIheight)
    );
  }

  private makeIDmap(collection: any, map: Record<string, any>): void {
    for (const key of Object.keys(collection)) {
      const e = collection[key];
      map[e.id] = key;
    }
  }

  setUpDoors(): void {
    const ORIENTATION_MAP: Record<string, number> = {
      l: 1,  r: 3,
      u: 2,  d: 4,
    };
    this.doors = new SpaceMap();
    for (const door of this.objects.doors || []) {
      const position = this.computeTileCoords(door.x, door.y);
      this.doors.add(position.x, position.y, {
        to: {
          x: Number(door.properties.x),
          y: Number(door.properties.y),
        },
        camera: door.properties.hasOwnProperty('cx')
          ? {
              x: Number(door.properties.cx),
              y: Number(door.properties.cy),
            }
          : null,
        orientation: ORIENTATION_MAP[door.properties.o] || 4,
      });
    }
  }

  setUpEntities(): void {
    this.playersMap = new SpaceMap();
    this.items = new SpaceMap();
    this.monsters = new SpaceMap();
    this.monstersTable = {};
    for (const entity of this.objects.entities || []) {
      if (!this.db.entities.hasOwnProperty(entity.gid - 1961)) continue;
      const entityInfo = this.db.entities[entity.gid - 1961];
      const position = this.computeTileCoords(entity.x, entity.y);
      if (entityInfo.npc) {
        this.collisionGrid[position.y][position.x] = 1;
      } else if (entityInfo.item) {
        const item = new Item(position.x, position.y - 1, entityInfo.sprite, true, false, false);
        this.addAtLocation(item);
      } else if (entityInfo.monster) {
        this.addMonster(position, entityInfo.sprite);
      }
    }
  }

  addMonster(position: TileCoord, sprite: string): void {
    const monster = new Monster(position.x, position.y, sprite);
    this.monstersTable[monster.id] = monster;
    this.addAtLocation(monster);
  }

  setUpChests(): void {
    for (const chestObj of this.objects.chests || []) {
      const position = this.computeTileCoords(chestObj.x, chestObj.y);
      const chest = new Item(position.x, position.y, chestObj.properties.items, true, true, false);
      this.addAtLocation(chest);
    }

    this.chestAreas = {};
    for (let d = 0; d < (this.objects.chestareas || []).length; d++) {
      const area = this.objects.chestareas[d];
      const chestAreaObj = new ChestArea(area.properties, spawnHiddenChest);
      this.chestAreas[d] = chestAreaObj;
      const topLeft = this.computeTileCoords(area.x, area.y);
      const bottomRight = this.computeTileCoords(
        area.x + area.width,
        area.y + area.height
      );
      for (let x = topLeft.x; x < bottomRight.x; x++) {
        for (let y = topLeft.y; y < bottomRight.y; y++) {
          const monster = this.monsters.getFirst(x, y) as Monster | undefined;
          if (monster) {
            monster.chestArea = chestAreaObj;
            chestAreaObj.incrementAll();
          }
        }
      }
    }
  }

  setUpRoaming(): void {
    for (const roaming of this.objects.roaming || []) {
      const positions = new Set<string>();
      while (positions.size < roaming.properties.nb) {
        const x = randomInt(roaming.x, roaming.x + roaming.width);
        const y = randomInt(roaming.y, roaming.y + roaming.height);
        const pos = this.computeTileCoords(x, y);
        positions.add(`${pos.x},${pos.y}`);
      }
      for (const key of positions) {
        const [px, py] = key.split(',').map(Number);
        this.addMonster({ x: px, y: py }, roaming.type);
      }
    }
  }

  setLoops(): void {
    setInterval(() => this.update(), this.updateRate);
    setInterval(() => this.regenerate(), this.regenRate);
    setInterval(() => this.updateFights(), this.fightUpdateDelay);
  }

  // ── Player management ──

  checkSocketID(id: string): boolean {
    return this.socketMap.get(id) === undefined;
  }

  checkPlayerID(id: string): boolean {
    return !Object.values(this.players).some(
      (p) => p.getMongoID() === id
    );
  }

  addNewPlayer(socketID: string, name: string, onComplete: (pid: string) => void): void {
    if (!name || name.length === 0) return;
    const player = new Player(name);
    PlayerModel.create(player.dbTrim()).then((doc) => {
      const mongoID = doc._id.toString();
      player.setIDs(mongoID, socketID);
      this.finalizePlayer(socketID, player);
      onComplete(mongoID);
    });
  }

  loadPlayer(socketID: string, id: string, onComplete: () => void): void {
    PlayerModel.findById(id).then((doc) => {
      if (!doc) {
        this.broadcaster.sendTo(socketID, { type: 'dbError' });
        return;
      }
      const player = new Player('');
      const mongoID = doc._id.toString();
      player.setIDs(mongoID, socketID);
      player.getDataFromDb(doc.toObject()).then(() => {
        this.finalizePlayer(socketID, player);
        onComplete();
      });
    });
  }

  finalizePlayer(socketID: string, player: Player): void {
    this.addPlayerID(socketID, player.id);
    this.embedPlayer(player);
    this.broadcaster.sendInit(socketID, this.createInitializationPacket(player.id));
  }

  addPlayerID(socketID: string, playerID: number): void {
    this.socketMap.set(socketID, playerID);
  }

  getPlayerID(socketID: string): number | undefined {
    return this.socketMap.get(socketID);
  }

  getPlayerAOIid(playerID: number): number {
    return this.players[playerID].aoi;
  }

  getPlayer(socketID: string): Player | undefined {
    const pid = this.getPlayerID(socketID);
    return pid !== undefined ? this.players[pid] : undefined;
  }

  deleteSocketID(socketID: string): void {
    this.socketMap.delete(socketID);
  }

  createInitializationPacket(playerID: number): InitPacket {
    return {
      player: this.players[playerID].trim(),
      nbconnected: Object.keys(this.players).length,
      nbAOIhorizontal: AOIutils.nbAOIhorizontal,
      lastAOIid: AOIutils.lastAOIid,
      stamp: this.broadcaster.getShortStamp(),
    };
  }

  embedPlayer(player: Player): void {
    this.players[player.id] = player;
    this.nbConnectedChanged = true;
    this.addAtLocation(player);
    player.setLastSavedPosition();
  }

  savePlayer(player: Player): void {
    PlayerModel.updateOne(
      { _id: new Types.ObjectId(player.getMongoID()) },
      { $set: player.dbTrim() }
    ).catch((err) => console.error(err));
    player.setLastSavedPosition();
  }

  deletePlayer(id: string): void {
    PlayerModel.deleteOne({ _id: new Types.ObjectId(id) }).catch((err) =>
      console.error(err)
    );
  }

  removePlayer(socketID: string): void {
    const player = this.getPlayer(socketID);
    if (!player) return;
    this.removeFromLocation(player);
    player.setProperty('connected', false);
    player.die();
    const AOIs = player.listAdjacentAOIs(true) as number[];
    for (const aoi of AOIs) {
      this.addDisconnectToAOI(aoi, player.id);
    }
    delete this.players[player.id];
    this.nbConnectedChanged = true;
    this.deleteSocketID(socketID);
    this.broadcaster.unregister(socketID);
  }

  revivePlayer(playerID: number): void {
    const player = this.players[playerID];
    if (player) player.revive();
  }

  // ── Spatial management ──

  getSpaceMap(entity: { category: string }): SpaceMap<any> {
    switch (entity.category) {
      case 'item':
        return this.items;
      case 'player':
        return this.playersMap;
      case 'monster':
        return this.monsters;
      default:
        return this.items;
    }
  }

  addAtLocation(entity: any): void {
    const map = this.getSpaceMap(entity);
    map.add(entity.x, entity.y, entity);
    this.AOIfromTiles.getFirst(entity.x, entity.y).addEntity(entity, null);
  }

  moveAtLocation(entity: any, fromX: number, fromY: number, toX: number, toY: number): void {
    const map = this.getSpaceMap(entity);
    map.move(fromX, fromY, toX, toY, entity);
    const AOIfrom = this.AOIfromTiles.getFirst(fromX, fromY);
    const AOIto = this.AOIfromTiles.getFirst(toX, toY);
    if (AOIfrom && AOIto && AOIfrom.id !== AOIto.id) {
      entity.setProperty('aoi', AOIto.id);
      const previousAOI = AOIfrom.id;
      AOIfrom.deleteEntity(entity);
      AOIto.addEntity(entity, previousAOI);
    }
  }

  removeFromLocation(entity: any): void {
    const map = this.getSpaceMap(entity);
    map.delete(entity.x, entity.y, entity);
    const aoi = this.AOIfromTiles.getFirst(entity.x, entity.y);
    if (aoi) aoi.deleteEntity(entity);
  }

  determineStartingPosition(): TileCoord {
    const checkpoints = this.objects.checkpoints || [];
    const startArea = checkpoints[Math.floor(Math.random() * checkpoints.length)];
    const x = randomInt(startArea.x, startArea.x + startArea.width);
    const y = randomInt(startArea.y, startArea.y + startArea.height);
    return {
      x: Math.floor(x / this.map.tilewidth),
      y: Math.floor(y / this.map.tileheight),
    };
  }

  computeTileCoords(x: number, y: number): TileCoord {
    return {
      x: Math.ceil(x / this.map.tilewidth),
      y: Math.ceil(y / this.map.tileheight),
    };
  }

  adjacentNoDiagonal(a: TileCoord, b: TileCoord): number {
    const Xdiff = a.x - b.x;
    const Ydiff = a.y - b.y;
    if (Xdiff === 1 && Ydiff === 0) return 1;
    if (Xdiff === 0 && Ydiff === 1) return 2;
    if (Xdiff === -1 && Ydiff === 0) return 3;
    if (Xdiff === 0 && Ydiff === -1) return 4;
    if (Xdiff === 0 && Ydiff === 0) return -1;
    return 0;
  }

  findFreeAdjacentCell(x: number, y: number): TileCoord | undefined {
    const adj = [[-1, 0], [1, -1], [1, 1], [-1, 1]];
    for (const [dx, dy] of adj) {
      const nx = x + dx;
      const ny = y + dy;
      if (this.collisionGrid[ny] && this.collisionGrid[ny][nx] === 0) {
        return { x: nx, y: ny };
      }
    }
    return undefined;
  }

  getCurrentPosition(socketID: string): TileCoord | null {
    const player = this.getPlayer(socketID);
    if (!player) return null;
    return { x: player.x, y: player.y };
  }

  // ── Path handling ──

  extendRoute(
    player: Player,
    dest: TileCoord,
    orientation: number,
    action: GameAction
  ): boolean {
    const routeEnd = player.getPathEnd();
    if (!routeEnd) return false;
    if (routeEnd.x === dest.x && routeEnd.y === dest.y) return true;

    if (
      dest.x < 0 || dest.x >= this.map.width ||
      dest.y < 0 || dest.y >= this.map.height ||
      routeEnd.x < 0 || routeEnd.x >= this.map.width ||
      routeEnd.y < 0 || routeEnd.y >= this.map.height
    ) {
      return false;
    }

    // Don't extend if destination reverses direction
    const path = player.route!.path;
    if (path.length >= 2) {
      const prev = path[path.length - 2];
      const dirX = routeEnd.x - prev.x;
      const dirY = routeEnd.y - prev.y;
      const newDirX = dest.x - routeEnd.x;
      const newDirY = dest.y - routeEnd.y;
      if (dirX * newDirX + dirY * newDirY < 0) return false;
    }

    const gridClone = this.PFgrid.clone();
    for (const key of Object.keys(this.monstersTable)) {
      const m = this.monstersTable[Number(key)];
      if (m.alive && !(m.x === player.x && m.y === player.y)) {
        gridClone.setWalkableAt(m.x, m.y, false);
      }
    }
    const rawPath = this.pathfinder.findPath(routeEnd.x, routeEnd.y, dest.x, dest.y, gridClone);
    if (!rawPath || rawPath.length < 2) return false;

    const extension = rawPath.slice(1).map((p: number[]) => ({ x: p[0], y: p[1] }));
    for (const tile of extension) {
      if (this.collisionGrid[tile.y]?.[tile.x]) return false;
      const monstersOnTile = this.monsters.getFirstFiltered(tile.x, tile.y, ['alive']);
      if (monstersOnTile) return false;
    }

    if (path.length + extension.length > 60) return false;

    const start = path[0];
    const newLast = extension[extension.length - 1];
    if (manhattanDistance(start.x, start.y, newLast.x, newLast.y) > this.AOIheight + 8) return false;

    path.push(...extension);
    player.route!.orientation = orientation;
    if (action) player.route!.action = action;

    const routeAOIs = player.listAdjacentAOIs(true) as number[];
    const routeData = player.route!.trim('player');
    for (const aoi of routeAOIs) {
      this.updateAOIRoute(aoi, 'player', player.id, routeData);
    }
    if (action && action.action === 3) {
      const monster = this.monstersTable[action.id!];
      if (monster && monster.alive) player.setTarget(monster);
    }
    return true;
  }

  handlePath(
    path: TileCoord[],
    action: GameAction,
    orientation: number,
    socketID: string,
    latency = 0
  ): boolean {
    const player = this.getPlayer(socketID);
    if (!player || !player.alive) return false;

    // Single destination — try extending existing route first, else compute full path
    if (path.length === 1) {
      const dest = path[0];
      if (
        dest.x < 0 || dest.x >= this.map.width ||
        dest.y < 0 || dest.y >= this.map.height ||
        player.x < 0 || player.x >= this.map.width ||
        player.y < 0 || player.y >= this.map.height
      ) {
        return false;
      }
      if (player.route && this.extendRoute(player, dest, orientation, action)) {
        return true;
      }
      const gridClone = this.PFgrid.clone();
      for (const key of Object.keys(this.monstersTable)) {
        const m = this.monstersTable[Number(key)];
        if (m.alive && !(m.x === player.x && m.y === player.y)) {
          gridClone.setWalkableAt(m.x, m.y, false);
        }
      }
      const rawPath = this.pathfinder.findPath(player.x, player.y, dest.x, dest.y, gridClone);
      if (!rawPath || rawPath.length === 0) {
        return false;
      }
      path = rawPath.map((p: number[]) => ({ x: p[0], y: p[1] }));
    }

    if (path.length > 60) {
      return false;
    }

    if (path[0].x !== player.x || path[0].y !== player.y) {
      path.unshift({ x: player.x, y: player.y });
    }

    if (
      manhattanDistance(
        path[0].x,
        path[0].y,
        path[path.length - 1].x,
        path[path.length - 1].y
      ) > this.AOIheight + 8
    ) {
      return false;
    }

    for (let p = 1; p < path.length; p++) {
      if (Math.abs(path[p].x - path[p - 1].x) > 1 || Math.abs(path[p].y - path[p - 1].y) > 1) {
        return false;
      }
      if (this.collisionGrid[path[p].y]?.[path[p].x]) {
        return false;
      }
      const monstersOnTile = this.monsters.getFirstFiltered(path[p].x, path[p].y, ['alive']);
      if (monstersOnTile) {
        return false;
      }
    }

    const departureTime = Date.now() - latency;
    player.latency = latency;
    player.setRoute(path, departureTime, latency, action, orientation);
    const routeAOIs = player.listAdjacentAOIs(true) as number[];
    const routeData = player.route!.trim('player');
    for (const aoi of routeAOIs) {
      this.updateAOIRoute(aoi, 'player', player.id, routeData);
    }
    if (action && action.action === 3) {
      const monster = this.monstersTable[action.id!];
      if (monster && monster.alive) player.setTarget(monster);
    }
    return true;
  }

  // ── Game loop ──

  update(): void {
    for (const key of Object.keys(this.players)) {
      const player = this.players[Number(key)];
      if (!player.alive) continue;
      player.updateWalk();
      this.checkItem(player);
      this.checkMonster(player);
      this.checkDoor(player);
      this.checkAction(player);
      this.checkSave(player);
    }
    for (const key of Object.keys(this.monstersTable)) {
      const monster = this.monstersTable[Number(key)];
      if (!monster.alive) continue;
      monster.updateWalk();
      monster.checkPosition();
    }
  }

  private updateFights(): void {
    for (const key of Object.keys(this.players)) {
      const player = this.players[Number(key)];
      if (player.alive && player.inFight) player.updateFight();
    }
    for (const key of Object.keys(this.monstersTable)) {
      const monster = this.monstersTable[Number(key)];
      if (monster.alive && monster.inFight) monster.updateFight();
    }
  }

  regenerate(): void {
    for (const key of Object.keys(this.players)) {
      const player = this.players[Number(key)];
      if (player.alive && player.life < player.maxLife) player.regenerate();
    }
  }

  updatePlayers(): void {
    for (const key of Object.keys(this.players)) {
      const player = this.players[Number(key)];
      const localPkg = player.getIndividualUpdatePackage();
      const aoi = this.AOIs[player.aoi];
      if (!aoi) continue;
      const globalPkg = aoi.getUpdatePacket();
      const individualGlobalPkg = clone(globalPkg, false);

      for (let i = 0; i < player.newAOIs.length; i++) {
        const neighborAOI = this.AOIs[player.newAOIs[i]];
        if (neighborAOI) individualGlobalPkg.synchronize(neighborAOI);
      }
      individualGlobalPkg.removeEcho(player.id);

      const isEmpty = individualGlobalPkg.isEmpty();
      if (isEmpty && localPkg === null && !this.nbConnectedChanged) continue;

      const finalPackage: any = {};
      if (!isEmpty) finalPackage.global = individualGlobalPkg.clean();
      if (localPkg) finalPackage.local = localPkg.clean();
      if (this.nbConnectedChanged) finalPackage.nbconnected = Object.keys(this.players).length;

      const msg: ServerMessage = {
        type: 'update',
        data: {
          stamp: this.broadcaster.getShortStamp(),
          latency: player.latency ?? 0,
          nbconnected: Object.keys(this.players).length,
          ...finalPackage,
        },
      };

      this.broadcaster.sendTo(player.socketID, msg);
      player.newAOIs = [];
    }
    this.nbConnectedChanged = false;
    this.clearAOIs();
  }

  // ── Respawn ──

  respawnCount(
    x: number,
    y: number,
    object: any,
    callback: () => void,
    delay: number
  ): void {
    setTimeout(() => this.respawnSomething(x, y, object, callback), delay);
  }

  respawnSomething(x: number, y: number, object: any, callback: () => void): void {
    if (
      this.monsters.getFirstFiltered(x, y, ['alive']) ||
      this.playersMap.getFirstFiltered(x, y, ['alive']) ||
      this.items.getFirstFiltered(x, y, ['visible'])
    ) {
      this.respawnCount(x, y, object, callback, this.retryDelay);
      return;
    }
    callback.call(object);
  }

  // ── Checks ──

  checkDoor(player: Player): void {
    if (Date.now() - player.lastTeleport < 1000) return;
    const door = this.doors.getFirst(player.x, player.y) as any;
    if (door) player.teleport(door);
  }

  checkItem(player: Player): void {
    const item = this.items.getFirstFiltered(
      player.x,
      player.y,
      ['visible'],
      ['inChest']
    ) as Item | undefined;
    if (item && player.applyItem(item)) item.pick();
  }

  checkMonster(player: Player): void {
    const adj = [[-1, -1], [0, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
    for (const [dx, dy] of adj) {
      const x = player.x + dx;
      const y = player.y + dy;
      const monster = this.monsters.getFirstFiltered(x, y, ['alive', 'aggro']) as Monster | undefined;
      if (monster && !areFighting(monster, player)) {
        setUpFight(player, monster);
      }
    }
  }

  checkAction(player: Player): void {
    if (!player.route?.action) return;
    const action = player.route.action;
    if (action.action === 3) {
      const monster = this.monstersTable[action.id!];
      if (!areFighting(player, monster)) setUpFight(player, monster);
    } else if (action.action === 4) {
      const chest = this.items.getFirstFiltered(
        action.x!,
        action.y!,
        ['visible', 'chest']
      ) as Item | undefined;
      if (!chest) return;
      if (!this.adjacentNoDiagonal(chest, player)) return;
      chest.open();
    }
  }

  checkSave(player: Player): void {
    if (
      player.x < 92 &&
      manhattanDistance(
        player.x,
        player.y,
        player.lastSavedPosition.x,
        player.lastSavedPosition.y
      ) > 30
    ) {
      this.savePlayer(player);
    }
  }

  // ── AOI management ──

  clearAOIs(): void {
    for (const aoi of this.dirtyAOIs) {
      this.AOIs[aoi]?.clear();
    }
    this.dirtyAOIs.clear();
  }

  listAOIsFromSocket(socketID: string): string[] {
    const player = this.getPlayer(socketID);
    if (!player) return [];
    return player.listAdjacentAOIs(false) as string[];
  }

  handleAOITransition(entity: any, previous: number | null): void {
    let AOIs = entity.listAdjacentAOIs(true) as number[];
    if (previous !== null) {
      const previousAOIs = AOIutils.listAdjacentAOIs(previous);
      AOIs = AOIs.filter((a) => previousAOIs.indexOf(a) < 0);
    }
    for (const aoi of AOIs) {
      if (entity.category === 'player') entity.newAOIs.push(aoi);
      this.addObjectToAOI(aoi, entity);
    }
  }

  addObjectToAOI(aoi: number, entity: any): void {
    this.AOIs[aoi].updatePacket.addObject(entity);
    this.dirtyAOIs.add(aoi);
  }

  updateAOIProperty(
    aoi: number,
    category: string,
    id: number,
    property: string,
    value: any
  ): void {
    this.AOIs[aoi].updatePacket.updateProperty(category, id, property, value);
    this.dirtyAOIs.add(aoi);
  }

  updateAOIRoute(
    aoi: number,
    category: string,
    id: number,
    route: any
  ): void {
    this.AOIs[aoi].updatePacket.updateRoute(category, id, route);
    this.dirtyAOIs.add(aoi);
  }

  addDisconnectToAOI(aoi: number, playerID: number): void {
    this.AOIs[aoi].updatePacket.addDisconnect(playerID);
    this.dirtyAOIs.add(aoi);
  }

  // ── Combat helpers ──

  areFighting = areFighting;
  setUpFight = setUpFight;
  handleKill = handleKill;
  formatLootTable = formatLootTable;
  dropLoot = dropLoot;
  spawnHiddenChest = spawnHiddenChest;

  // ── Entity state helpers ──

  convertPath(p: number[][]): TileCoord[] {
    return p.map(([x, y]) => ({ x, y }));
  }

  getNbConnected(): number {
    return Object.keys(this.players).length;
  }
}
