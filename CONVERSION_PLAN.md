# PhaserQuest → Modern TypeScript Conversion Plan

## Overview

Convert the BrowserQuest-clone MMO game from **JavaScript (Phaser 2 + Socket.io + Express + MongoDB)** to **TypeScript (Phaser 3 + React + `ws` WebSocket + Express + MongoDB with Mongoose)**.

The original codebase is stored as a flat-file snapshot in `jerenaux-phaserquest-8a5edab282632443.txt`. Each file in that snapshot is delimited by `=== FILE: <path> ===`.

---

## Repository structure (target)

```
phaserquest/
├── package.json                  # Root workspace config
├── tsconfig.base.json            # Shared TS config
├── .gitignore
├── packages/
│   ├── shared/                   # Shared types & constants
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── types/
│   │       │   ├── player.ts
│   │       │   ├── monster.ts
│   │       │   ├── item.ts
│   │       │   ├── map.ts
│   │       │   ├── update.ts          # Update packet types (global + local)
│   │       │   ├── protocol.ts        # WebSocket message types
│   │       │   └── aoi.ts
│   │       ├── constants.ts
│   │       └── schema.ts              # CoDec → type-level message schemas
│   │
│   ├── server/                   # Game server
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts               # Entry: Express + WS server setup
│   │       ├── GameServer.ts          # Main game loop & world state
│   │       ├── entities/
│   │       │   ├── GameObject.ts       # Base class
│   │       │   ├── MovingEntity.ts     # Base class for Players & Monsters
│   │       │   ├── Player.ts
│   │       │   ├── Monster.ts
│   │       │   ├── Item.ts
│   │       │   └── NPC.ts             # (static, server-side)
│   │       ├── aoi/
│   │       │   ├── AOI.ts
│   │       │   ├── AOIutils.ts
│   │       │   └── spaceMap.ts
│   │       ├── packets/
│   │       │   ├── UpdatePacket.ts
│   │       │   └── PersonalUpdatePacket.ts
│   │       ├── systems/
│   │       │   ├── CombatSystem.ts
│   │       │   ├── PathfindingSystem.ts
│   │       │   ├── LootSystem.ts
│   │       │   ├── ChestAreaSystem.ts
│   │       │   └── RoamingSystem.ts
│   │       ├── db/
│   │       │   ├── connection.ts
│   │       │   ├── models/
│   │       │   │   └── PlayerModel.ts  # Mongoose schema
│   │       │   └── migrations/
│   │       ├── protocol/
│   │       │   ├── MessageHandler.ts   # WS message dispatch
│   │       │   ├── messages.ts         # Message type definitions
│   │       │   └── broadcaster.ts      # Sending updates to clients
│   │       ├── config.ts
│   │       ├── format.ts               # Map format utility (carried over)
│   │       └── types.ts
│   │
│   └── client/                   # React + Phaser 3 client
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── index.html
│       └── src/
│           ├── main.tsx               # React entry point
│           ├── App.tsx                # Root React component
│           ├── game/
│           │   ├── GameManager.ts      # Phaser game bootstrap & lifecycle
│           │   ├── scenes/
│           │   │   ├── BootScene.ts    # Asset preloading
│           │   │   ├── HomeScene.ts    # Main menu / character select
│           │   │   └── GameScene.ts    # Main gameplay scene
│           │   ├── entities/
│           │   │   ├── Being.ts        # Base sprite class
│           │   │   ├── Human.ts
│           │   │   ├── Player.ts
│           │   │   ├── Monster.ts
│           │   │   ├── NPC.ts
│           │   │   └── Item.ts
│           │   ├── systems/
│           │   │   ├── AnimationSystem.ts
│           │   │   ├── MovementSystem.ts
│           │   │   ├── PathfindingSystem.ts  # EasyStar wrapper
│           │   │   └── AOUtils.ts
│           │   └── UI/
│           │       ├── HUD.ts              # Health bar, XP, etc.
│           │       ├── ChatOverlay.ts
│           │       └── InventoryDisplay.ts
│           ├── network/
│           │   ├── WebSocketClient.ts      # WS connection manager
│           │   ├── MessageHandler.ts       # Incoming message dispatch
│           │   └── Protocol.ts             # Message building/parsing
│           ├── store/
│           │   ├── GameStore.ts            # Zustand or Context store
│           │   ├── PlayerStore.ts
│           │   └── WorldStore.ts
│           ├── components/
│           │   ├── GameCanvas.tsx          # React wrapper for Phaser canvas
│           │   ├── HomeScreen.tsx          # Pre-game UI (React)
│           │   ├── HUD.tsx                # In-game HUD overlay (React)
│           │   ├── ChatBox.tsx
│           │   └── AchievementsPanel.tsx
│           ├── assets/                     # Copied from original
│           │   ├── sprites/
│           │   ├── audio/
│           │   ├── fonts/
│           │   └── json/
│           └── types.ts
```

---

## Phase 1 — Project scaffold & shared types

### Step 1.1: Initialize monorepo

Create root `package.json` with npm workspaces:
```json
{
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "npm -w packages/server run dev",
    "dev:client": "npm -w packages/client run dev",
    "build": "npm -w packages/shared run build && npm -w packages/server run build && npm -w packages/client run build",
    "lint": "eslint packages/*/src",
    "typecheck": "tsc --build packages/*"
  }
}
```

Install root dev dependencies: `typescript`, `eslint`, `prettier`, `concurrently`, `tsx`.

### Step 1.2: Create shared types package

**`packages/shared/src/types/player.ts`** — Port from `Player.js`, `Player_client.js`:
```typescript
export interface PlayerState {
  id: number;
  name: string;
  x: number;
  y: number;
  weapon: number;
  armor: number;
  aoi: number;
  targetID: number | null;
  inFight: boolean;
  alive: boolean;
  route?: PlayerRoute;
}

export interface PlayerRoute {
  orientation: number; // 1-4
  end: { x: number; y: number };
  delta: number; // latency
}
```

**`packages/shared/src/types/monster.ts`** — Port from server `Monster.js`:
```typescript
export interface MonsterState {
  id: number;
  x: number;
  y: number;
  monster: number; // monster type id
  inFight: boolean;
  alive: boolean;
  targetID?: number;
  route?: MonsterRoute;
}

export interface MonsterRoute {
  path: { x: number; y: number }[];
  delta: number;
}
```

**`packages/shared/src/types/item.ts`** — Port from server `Item.js`:
```typescript
export interface ItemState {
  id: number;
  x: number;
  y: number;
  itemID: number;
  visible: boolean;
  respawn: boolean;
  chest: boolean;
  inChest: boolean;
  loot: boolean;
}
```

**`packages/shared/src/types/update.ts`** — Port from `UpdatePacket.js`, `PersonalUpdatePacket.js`:
```typescript
export interface GlobalUpdate {
  newplayers?: PlayerState[];
  newitems?: ItemState[];
  newmonsters?: MonsterState[];
  disconnected?: number[];
  players?: Record<number, Partial<PlayerState>>;
  monsters?: Record<number, Partial<MonsterState>>;
  items?: Record<number, Partial<ItemState>>;
}

export interface LocalUpdate {
  life?: number;
  x?: number;
  y?: number;
  noPick?: boolean;
  hp?: { target: boolean; hp: number; from: number }[];
  killed?: number[];
  used?: number[];
}

export interface ServerUpdate {
  stamp: number;
  latency: number;
  nbconnected: number;
  global?: GlobalUpdate;
  local?: LocalUpdate;
}

export interface InitPacket {
  stamp: number;
  nbconnected: number;
  nbAOIhorizontal: number;
  lastAOIid: number;
  player: PlayerState;
}
```

**`packages/shared/src/types/protocol.ts`** — All WS message types:
```typescript
// Client → Server
export type ClientMessage =
  | { type: 'init_world'; new: boolean; name?: string; id?: string; clientTime: number }
  | { type: 'path'; path: TileCoord[]; action: GameAction; or: number }
  | { type: 'revive' }
  | { type: 'chat'; text: string }
  | { type: 'delete'; id: string }
  | { type: 'ponq'; stamp: number };

// Server → Client
export type ServerMessage =
  | { type: 'init'; data: InitPacket }
  | { type: 'update'; data: ServerUpdate }
  | { type: 'pid'; playerID: string }
  | { type: 'reset'; data: { x: number; y: number } }
  | { type: 'dbError' }
  | { type: 'wait' }
  | { type: 'chat'; data: { id: number; text: string } };

export interface TileCoord { x: number; y: number; }
export interface GameAction { action: number; id?: number; x?: number; y?: number; }
```

**`packages/shared/src/constants.ts`** — Port from `GameServer.js` constants:
```typescript
export const CONST = {
  UPDATE_RATE: 1000 / 12,
  CLIENT_UPDATE_RATE: 1000 / 5,
  REGEN_RATE: 1000 * 2,
  ITEM_RESPAWN_DELAY: 1000 * 30,
  MONSTER_RESPAWN_DELAY: 1000 * 30,
  ITEM_VANISH_DELAY: 1000 * 9,
  RETRY_DELAY: 1000 * 3,
  WALK_UPDATE_DELAY: 80,
  FIGHT_UPDATE_DELAY: 200,
  DAMAGE_DELAY: 1000,
  POSITION_CHECK_DELAY: 1000,
  AOI_WIDTH: 34,
  AOI_HEIGHT: 20,
  PLAYER_MAX_LIFE: 100,
  PLAYER_SPEED: 120,
  MAX_PATH_LENGTH: 60,
  MAX_CHAT_LENGTH: 300,
} as const;
```

**`packages/shared/src/types/aoi.ts`**:
```typescript
export interface AOIConfig {
  nbAOIhorizontal: number;
  lastAOIid: number;
}
```

### Step 1.3: Build shared package

Add `tsconfig.json` with `"declaration": true`, `"outDir": "./dist"`.  
Set `"main": "dist/index.js"` in `package.json`.  
Create `src/index.ts` that re-exports everything.

---

## Phase 2 — Server

### Step 2.1: Server project setup

```json
// packages/server/package.json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.18",
    "ws": "^8",
    "mongoose": "^8",
    "pathfinding": "^0.4",
    "clone": "^2.1",
    "random-weighted-choice": "^0.1",
    "quickselect": "^1.0"
  },
  "devDependencies": {
    "@types/express": "*",
    "@types/ws": "*",
    "@types/clone": "*",
    "tsx": "*",
    "typescript": "*"
  }
}
```

**`packages/server/src/config.ts`** — Port CLI args + defaults:
```typescript
export const config = {
  port: parseInt(process.env.PORT || '8081'),
  mongoServer: process.env.MONGO_SERVER || 'localhost',
  mongoPort: parseInt(process.env.MONGO_PORT || '27017'),
  mongoDbName: process.env.MONGO_DB || 'phaserQuest',
  waitForDatabase: parseInt(process.env.WAIT_FOR_DB || '0'),
};
```

### Step 2.2: Server entry point — `packages/server/src/index.ts`

Port `server.js` with these changes:
- Replace `require('socket.io')` with `require('ws')` (native `ws` library)
- Replace `io.on('connection', socket => ...)` with `wss.on('connection', ws => ...)`
- Replace `socket.emit('event', data)` with `ws.send(JSON.stringify({type: 'event', ...data}))`
- Replace `socket.on('event', cb)` with message type dispatch on `ws.on('message', raw => { const msg = JSON.parse(raw); switch(msg.type) {...} })`
- Remove binary protocol (`Encoder.encode` / `Decoder.decode`) — use JSON for the initial rewrite
- Keep `GameServer.readMap()` and `GameServer.setLoops()` logic

**Key structural changes from original `server.js`** (`offset 384–600`):

| Original | Replacement |
|----------|-------------|
| `io = require('socket.io').listen(server)` | `new WebSocketServer({ server })` |
| `socket.emit('init', packet)` | `ws.send(JSON.stringify({ type: 'init', data: packet }))` |
| `socket.on('init-world', cb)` | `switch(msg.type) { case 'init_world': ... }` |
| `io.in(socketID).emit('update', pkg)` | Direct `ws.send` to specific connection |
| `socket.join(room)` / `socket.leave(room)` | Internal AOI room tracking (maintain a `Map<roomId, Set<WebSocket>>`) |
| Binary `Encoder.encode(pkg, schema)` | JSON serialization (drop binary for now) |
| `CoDec.initializationSchema` | TypeScript type `InitPacket` |

```typescript
// Pseudocode for index.ts
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import mongoose from 'mongoose';
import { GameServer } from './GameServer';
import { config } from './config';
import { MessageHandler } from './protocol/MessageHandler';

const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

app.use(express.static('../../packages/client/dist'));
app.get('/', (req, res) => res.sendFile('index.html'));

const gs = new GameServer();

wss.on('connection', (ws, req) => {
  const handler = new MessageHandler(ws, gs);
  ws.on('message', (raw) => handler.handle(raw));
  ws.on('close', () => handler.onDisconnect());
});

httpServer.listen(config.port, async () => {
  await mongoose.connect(`mongodb://${config.mongoServer}:${config.mongoPort}/${config.mongoDbName}`);
  gs.readMap();
  gs.setLoops();
  console.log(`Server listening on ${config.port}`);
});
```

### Step 2.3: GameServer — `packages/server/src/GameServer.ts`

Port `js/server/GameServer.js` (offset 5617–6367) to TypeScript class.

**Key changes:**
- Convert `GameServer = { ... }` object literal to a TypeScript `class GameServer`
- Replace `module.exports.GameServer = GameServer` with `export class GameServer`
- Replace closure references (`GameServer.X = function()`) with class methods
- Keep same constants, data structures, and algorithms
- Add proper typing for all fields

**Required properties:**
```typescript
class GameServer {
  map: any; mapReady = false;
  updateRate = 1000/12;
  regenRate = 2000;
  itemRespawnDelay = 30000;
  monsterRespawnDelay = 30000;
  itemVanishDelay = 9000;
  retryDelay = 3000;
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
  socketMap: Map<string, number> = new Map();
  IDmap: Map<number, string> = new Map();
  // ... spaceMaps, AOIs, collisionGrid, pathfinder, etc.
}
```

**Required methods (all from original, re-typed):**
- `readMap()`, `setUpDoors()`, `setUpEntities()`, `addMonster()`, `setUpChests()`, `setUpRoaming()`, `setLoops()`
- `addNewPlayer()`, `loadPlayer()`, `finalizePlayer()`, `createInitializationPacket()`, `embedPlayer()`
- `savePlayer()`, `deletePlayer()`, `removePlayer()`, `revivePlayer()`
- `update()`, `regenerate()`, `updatePlayers()`
- `handlePath()`, `checkDoor()`, `checkItem()`, `checkMonster()`, `checkAction()`, `checkSave()`
- `getSpaceMap()`, `addAtLocation()`, `moveAtLocation()`, `removeFromLocation()`
- Combat: `areFighting()`, `setUpFight()`, `handleKill()`, `dropLoot()`, `spawnHiddenChest()`
- AOI: `clearAOIs()`, `listAOIsFromSocket()`, `handleAOItransition()`, `addObjectToAOI()`, `updateAOIproperty()`, `updateAOIroute()`, `addDisconnectToAOI()`
- `determineStartingPosition()`, `computeTileCoords()`, `adjacentNoDiagonal()`, `findFreeAdjacentCell()`, `convertPath()`, `respawnCount()`, `respawnSomething()`

**Add a `broadcaster` dependency** — instead of `GameServer.server = server`, inject a `Broadcaster` instance:
```typescript
interface Broadcaster {
  sendTo(socketID: string, msg: ServerMessage): void;
  sendInit(socketID: string, packet: InitPacket): void;
  addToRoom(socketID: string, room: string): void;
  leaveRoom(socketID: string, room: string): void;
  getShortStamp(): number;
}
```

The `Broadcaster` is implemented in `packages/server/src/protocol/broadcaster.ts` and handles the WebSocket → JSON serialization layer.

### Step 2.4: Entity classes

Each is a direct TypeScript port with added type annotations.

**`packages/server/src/entities/GameObject.ts`** — Port from `js/server/GameObject.js`:
```typescript
export abstract class GameObject {
  id: number;
  x: number;
  y: number;
  category: 'player' | 'monster' | 'item';

  setProperty(property: string, value: any): void;
  updateAOIs(property: string, value: any): void;
  getAOIid(): number;
  listAdjacentAOIs(onlyIDs: boolean): number[] | string[];
  abstract trim(): Record<string, any>;
}
```

**`packages/server/src/entities/MovingEntity.ts`** — Port from `js/server/MovingEntity.js`:
```typescript
export abstract class MovingEntity extends GameObject {
  inFight = false;
  targetID: number | null = null;
  alive = true;
  foes: number[] = [];
  lastFightUpdate = Date.now();
  lastDamage = Date.now();
  route: Route | null = null;
  speed: number;
  atk: number;
  def: number;
  life: number;
  maxLife: number;

  setTarget(entity: MovingEntity): void;
  hasFoe(entity: MovingEntity): boolean;
  addFoe(entity: MovingEntity): void;
  removeFoe(entity: MovingEntity): void;
  manageFoes(): void;
  startFight(target: MovingEntity): void;
  endFight(): void;
  takeDamage(from: MovingEntity): void;
  updateLife(amount: number): number;
  updateWalk(): void;
  setRoute(path: TileCoord[], departureTime: number, latency: number, action: any, orientation: number): void;
  damage(): void;
  die(): void;
  abstract updateFight(): void;
  abstract getPathEnd(): TileCoord | null;
}
```

**`packages/server/src/entities/Player.ts`** — Port from `js/server/Player.js`:
```typescript
export class Player extends MovingEntity {
  name: string;
  socketID: string;
  mongoID: string;
  weapon: number;
  armor: number;
  aoi: number;
  lastSavedPosition: TileCoord;
  updatePacket: PersonalUpdatePacket;
  newAOIs: number[];

  constructor(name: string);
  setIDs(dbId: string, socketId: string): void;
  trim(): PlayerState;
  dbTrim(): any;
  getDataFromDb(doc: any): void;
  getIndividualUpdatePackage(): LocalUpdate | null;
  updateFight(): void;
  regenerate(): void;
  equip(type: number, item: string): void;
  applyItem(item: Item): boolean;
  teleport(door: any): void;
  revive(): void;
}
```

**`packages/server/src/entities/Monster.ts`** — Port from `js/server/Monster.js`:
```typescript
export class Monster extends MovingEntity {
  startX: number;
  startY: number;
  monster: number;
  aggro: boolean;
  name: string;
  lootTable: any;
  chestArea: ChestArea | null;
  lastPositionCheck: number;

  constructor(x: number, y: number, monster: string);
  trim(): MonsterState;
  respawn(): void;
  updateFight(): void;
  getPathEnd(): TileCoord | null;
  checkPosition(): void;
  move(end: TileCoord, fight: boolean): void;
}
```

**`packages/server/src/entities/Item.ts`** — Port from `js/server/Item.js`:
```typescript
export class Item extends GameObject {
  content: string;
  respawn: boolean;
  chest: boolean;
  inChest: boolean;
  loot: boolean;
  itemID: number;
  itemKey: string;

  constructor(x: number, y: number, content: string, respawn: boolean, chest: boolean, loot: boolean);
  trim(): ItemState;
  pick(): void;
  open(): void;
  spawn(): void;
  setContent(): void;
}
```

### Step 2.5: Port AOI system

**`packages/server/src/aoi/AOI.ts`** — Port from `js/server/AOI.js`:
```typescript
export class AOI {
  id: number;
  x: number; y: number; width: number; height: number;
  entities: GameObject[];
  updatePacket: UpdatePacket;

  constructor(x: number, y: number, w: number, h: number);
  getUpdatePacket(): UpdatePacket;
  clear(): void;
  addEntity(entity: GameObject, previous: number | null): void;
  deleteEntity(entity: GameObject): void;
}
```

**`packages/server/src/aoi/AOIutils.ts`** — Port from `js/AOIutils.js`:
```typescript
export const AOIutils = {
  nbAOIhorizontal: 0,
  lastAOIid: 0,
  listAdjacentAOIs(current: number): number[],
};
```

**`packages/server/src/aoi/spaceMap.ts`** — Port from `js/spaceMap.js`:
```typescript
export class SpaceMap<T> {
  data: Map<string, T[]>;
  add(x: number, y: number, entity: T): void;
  getFirst(x: number, y: number): T | undefined;
  getFirstFiltered(x: number, y: number, mustHave: string[], mustNotHave?: string[]): T | undefined;
  move(fromX: number, fromY: number, toX: number, toY: number, entity: T): void;
  delete(x: number, y: number, entity: T): void;
}
```

### Step 2.6: Port packet classes

**`packages/server/src/packets/UpdatePacket.ts`** — Port from `js/server/UpdatePacket.js`, but output typed `GlobalUpdate`:
```typescript
export class UpdatePacket {
  newplayers: PlayerState[] = [];
  newitems: ItemState[] = [];
  newmonsters: MonsterState[] = [];
  disconnected: number[] = [];
  players: Record<number, Partial<PlayerState>> = {};
  items: Record<number, Partial<ItemState>> = {};
  monsters: Record<number, Partial<MonsterState>> = {};

  addObject(object: GameObject): void;
  addDisconnect(playerID: number): void;
  updateRoute(type: string, entityID: number, route: any): void;
  updateProperty(type: string, id: number, property: string, value: any): void;
  removeEcho(playerID: number): void;
  synchronize(AOI: AOI): void;
  isEmpty(): boolean;
  clean(): GlobalUpdate;
}
```

**`packages/server/src/packets/PersonalUpdatePacket.ts`** — Port from `js/server/PersonalUpdatePacket.js`:
```typescript
export class PersonalUpdatePacket {
  life?: number;
  x?: number;
  y?: number;
  noPick?: boolean;
  hp: { target: boolean; hp: number; from: number }[] = [];
  killed: number[] = [];
  used: number[] = [];

  isEmpty(): boolean;
  clean(): LocalUpdate;
  updatePosition(x: number, y: number): void;
  updateLife(life: number): void;
  addHP(target: boolean, hp: number, from: number): void;
  addKilled(id: number): void;
  addUsed(id: number): void;
  addNoPick(): void;
}
```

### Step 2.7: Port game systems

**`packages/server/src/systems/PathfindingSystem.ts`** — Port pathfinding logic from `GameServer.js`:
- Initialize `PF.Grid` from collision grid
- `findPath(start, end)` using `PF.AStarFinder`
- `validatePath(path, player)` — port the anti-cheat checks (max length, manhattan distance, adjacency continuity, collision check)

**`packages/server/src/systems/CombatSystem.ts`** — Port combat logic:
- `setUpFight(A, B)` — port from `GameServer.setUpFight`
- `handleKill(killer, target)` — port from `GameServer.handleKill`
- `formatLootTable(table)` — port from `GameServer.formatLootTable`
- `dropLoot(table, x, y)` — port from `GameServer.dropLoot`
- `spawnHiddenChest(properties)` — port from `GameServer.spawnHiddenChest`

**`packages/server/src/systems/ChestAreaSystem.ts`** — Port from `js/server/chestarea.js`:
```typescript
export class ChestArea {
  actualN: number;
  maxN: number;
  properties: any;
  active: boolean;
  callback: (props: any) => void;

  incrementAll(): void;
  increment(): void;
  decrement(): void;
}
```

**`packages/server/src/systems/RoamingSystem.ts`** — Port `GameServer.setUpRoaming()`.

### Step 2.8: MongoDB models

**`packages/server/src/db/models/PlayerModel.ts`** — Mongoose schema for player persistence:
```typescript
import { Schema, model } from 'mongoose';

const playerSchema = new Schema({
  name: { type: String, required: true },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  weapon: { type: String, default: 'sword1' },
  armor: { type: String, default: 'clotharmor' },
}, { timestamps: true });

export const PlayerModel = model('Player', playerSchema);
```

### Step 2.9: WebSocket protocol

**`packages/server/src/protocol/MessageHandler.ts`**:
```typescript
export class MessageHandler {
  constructor(private ws: WebSocket, private gs: GameServer) {}

  handle(raw: Buffer | string): void {
    const msg: ClientMessage = JSON.parse(raw.toString());
    switch (msg.type) {
      case 'init_world': this.handleInitWorld(msg); break;
      case 'path': this.handlePath(msg); break;
      case 'revive': this.handleRevive(); break;
      case 'chat': this.handleChat(msg.text); break;
      case 'delete': this.handleDelete(msg.id); break;
      case 'ponq': this.handlePonq(msg.stamp); break;
    }
  }

  onDisconnect(): void {
    this.gs.removePlayer(this.socketID);
  }
}
```

**`packages/server/src/protocol/broadcaster.ts`**:
```typescript
export class Broadcaster {
  private connections = new Map<string, WebSocket>();
  private rooms = new Map<string, Set<string>>();

  register(socketID: string, ws: WebSocket): void;
  unregister(socketID: string): void;
  sendTo(socketID: string, msg: ServerMessage): void;
  addToRoom(socketID: string, room: string): void;
  leaveRoom(socketID: string, room: string): void;
  sendInit(socketID: string, packet: InitPacket): void;
  getShortStamp(): number;
}
```

### Step 2.10: Database connection

**`packages/server/src/db/connection.ts`**:
```typescript
import mongoose from 'mongoose';
import { config } from '../config';

export async function connectDatabase(): Promise<void> {
  const uri = `mongodb://${config.mongoServer}:${config.mongoPort}/${config.mongoDbName}`;
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');
}
```

---

## Phase 3 — Client

### Step 3.1: Client project setup

```json
// packages/client/package.json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "phaser": "^3.80",
    "react": "^18",
    "react-dom": "^18",
    "easystarjs": "^0.4"
  },
  "devDependencies": {
    "@types/react": "*",
    "@types/react-dom": "*",
    "@vitejs/plugin-react": "*",
    "typescript": "*",
    "vite": "*"
  }
}
```

### Step 3.2: Vite config — `packages/client/vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 3000, proxy: { '/socket': { target: 'ws://localhost:8081', ws: true } } },
  build: { outDir: 'dist' },
});
```

### Step 3.3: Entry points

**`packages/client/index.html`**:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Phaser Quest</title>
  <link rel="stylesheet" href="/src/styles.css">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

**`packages/client/src/main.tsx`**:
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**`packages/client/src/App.tsx`**:
```tsx
import { useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { HomeScreen } from './components/HomeScreen';
import { HUD } from './components/HUD';

export function App() {
  const [gamePhase, setGamePhase] = useState<'home' | 'playing'>('home');
  const [playerName, setPlayerName] = useState('');

  return (
    <div>
      {gamePhase === 'home' ? (
        <HomeScreen onStart={(name) => { setPlayerName(name); setGamePhase('playing'); }} />
      ) : (
        <>
          <GameCanvas playerName={playerName} />
          <HUD />
        </>
      )}
    </div>
  );
}
```

### Step 3.4: WebSocket client — `packages/client/src/network/WebSocketClient.ts`

Port from `js/client/client.js`:
```typescript
export class WebSocketClient {
  private ws: WebSocket;
  private eventQueue: any[] = [];
  private initialized = false;

  constructor() {
    this.ws = new WebSocket(`ws://${location.hostname}:8081`);
    this.ws.onmessage = (event) => {
      const msg: ServerMessage = JSON.parse(event.data);
      this.dispatch(msg);
    };
  }

  private dispatch(msg: ServerMessage): void {
    switch (msg.type) {
      case 'init': GameScene.initWorld(msg.data); break;
      case 'update': this.handleUpdate(msg.data); break;
      case 'pid': Client.setLocalData(msg.playerID); break;
      // ...
    }
  }

  send(data: ClientMessage): void {
    this.ws.send(JSON.stringify(data));
  }
}
```

### Step 3.5: Phaser game manager — `packages/client/src/game/GameManager.ts`

Port from `js/client/main.js` (Phaser 2 → Phaser 3 migration):

```typescript
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { HomeScene } from './scenes/HomeScene';
import { GameScene } from './scenes/GameScene';

export function createGame(canvas: HTMLCanvasElement, playerName: string): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    width: 980,
    height: 500,
    parent: canvas,
    canvas,
    scene: [BootScene, HomeScene, GameScene],
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 } } },
  });
}
```

**Phaser 2 → 3 key differences to handle:**
- `Phaser.Game` constructor changed: scenes are class-based now, not object-based
- `Phaser.Sprite.call(this, ...)` → `extends Phaser.GameObjects.Sprite` + `super(scene, x, y, texture)`
- `game.add.sprite(...)` → `scene.add.sprite(...)` — scene reference must be passed
- `game.add.tween(...)` → `scene.tweens.add({...})`
- `game.load.atlasJSONHash(...)` → `this.load.atlas(...)` in scene preload
- `Phaser.Animation.generateFrameNames(...)` → manual frame config in `this.anims.create()`
- `this.animations.play(...)` → `this.play('animName')`
- Input: `sprite.events.onInputUp` → `sprite.on('pointerup', ...)`
- `game.input.onDown.add(...)` → `this.input.on('pointerdown', ...)`
- `sprite.inputEnabled = true` → `sprite.setInteractive()`
- `game.camera` → `this.cameras.main`
- `game.add.button(...)` → `scene.add.image(...).setInteractive()`
- `game.add.text(...)` → `scene.add.text(...)` (but Phaser 3 text API is slightly different)

### Step 3.6: Game scenes

**`packages/client/src/game/scenes/BootScene.ts`** — Port from `js/client/home.js` preload section:
```typescript
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload(): void {
    this.load.atlas('atlas1', 'assets/sprites/atlas1.png', 'assets/sprites/atlas1.json');
    this.load.atlas('atlas3', 'assets/sprites/atlas3.png', 'assets/sprites/atlas3.json');
    this.load.json('db', 'assets/json/db.json');
    this.load.audio('intro', ['assets/music/phaser-quest-intro.ogg']);
  }

  create(): void {
    this.scene.start('Home');
  }
}
```

**`packages/client/src/game/scenes/HomeScene.ts`** — Port from `js/client/home.js`:
- Display logo, scroll, input field (using Phaser 3's input plugin or a React overlay)
- "Play" button → emit `init-world` via WebSocket then start `GameScene`

**`packages/client/src/game/scenes/GameScene.ts`** — Port the bulk from `Game` (the missing `game.js` state object referenced by home.js and client.js):
- `create()`: Set up world, request init data from server
- `initWorld(data: InitPacket)`: Parse initialization data, create player/monsters/items sprites
- `updateWorld(global: GlobalUpdate)`: Apply global updates (new players, moved entities, disconnections)
- `updateSelf(local: LocalUpdate)`: Apply local updates (HP, position, items picked)
- Handle click-to-move pathfinding using EasyStar
- Handle combat, items, chat, achievements

### Step 3.7: Client entity classes

**`packages/client/src/game/entities/Being.ts`** — Port from `js/client/Being.js`:
- `Phaser.GameObjects.Sprite` subclass
- `setAnimations()` — Migrate from Phaser 2 `animations.add()` pattern to Phaser 3 `this.anims.create()` global anims
- `idle()`, `attack()`, `attackAndDisplay(hp)`, `displayHP(hp)`, `endFight()`
- `move(path, finalOrientation, action, delta)` — Phaser 3 tweens instead of Phaser 2 tweens
- `pathfindingCallback()`, `stopMovement()`, `finishMovement()`
- `animate(animation, force)` — animation state machine

**`packages/client/src/game/entities/Human.ts`** — Port from `js/client/Human.js`:
- Speech bubble generation via `Game.makeBubble()` → render to a Phaser 3 container

**`packages/client/src/game/entities/Player.ts`** — Port from `js/client/Player_client.js`:
- Character appearance (weapon + armor overlay)
- Name display
- Default animation frames
- `prepareMovement(end, finalOrientation, action, delta, sendToServer)` — use EasyStar for pathfinding

**`packages/client/src/game/entities/Monster.ts`** — Port from `js/client/Monster_client.js`:
- Hover cursors, click handling → `setInteractive()` + cursor styling
- `fight()`, `fightAction()`, `die()`, `respawn()`

**`packages/client/src/game/entities/NPC.ts`** — Port from `js/client/NPC.js`:
- Add to collision grid so players walk around them
- Click handler for dialogue

**`packages/client/src/game/entities/Item.ts`** — Port from `js/client/Item_client.js`:
- Chest open animation, loot blinking tween
- `setUp()`, `display()`, `remove()`, `respawn()`, `open()`

### Step 3.8: Client systems

**`packages/client/src/game/systems/AnimationSystem.ts`** — Define Phaser 3 animations matching the original frame data from `db.json`:
```typescript
export function createAnimations(scene: Phaser.Scene): void {
  // For each monster/NPC/player, create global anims
  scene.anims.create({ key: 'skeleton_attack_right', frames: [/*...*/], frameRate: 14, repeat: 0 });
  // ...
}
```
Note: In Phaser 3, animations are global (`scene.anims.create()`), unlike Phaser 2 where they were per-sprite.

**`packages/client/src/game/systems/MovementSystem.ts`** — Port movement logic:
- Path following via `Phaser.Tweens.Tween` with `onUpdateCallback` for orientation changes
- Speed + latency compensation (`duration = path.length * speed - delta`)

**`packages/client/src/game/systems/PathfindingSystem.ts`** — EasyStar wrapper:
```typescript
import EasyStar from 'easystarjs';

export class ClientPathfinder {
  private easystar = new EasyStar.js();

  constructor(grid: number[][]) {
    this.easystar.setGrid(grid);
    this.easystar.setAcceptableTiles([0]);
  }

  findPath(start: TileCoord, end: TileCoord): Promise<TileCoord[]> {
    return new Promise(resolve => {
      this.easystar.findPath(start.x, start.y, end.x, end.y, (path) => {
        resolve(path ? path.map(p => ({ x: p.x, y: p.y })) : []);
      });
      this.easystar.calculate();
    });
  }
}
```

### Step 3.9: React components

**`packages/client/src/components/GameCanvas.tsx`**:
```tsx
import { useEffect, useRef } from 'react';
import { createGame } from '../game/GameManager';

interface Props { playerName: string; }

export function GameCanvas({ playerName }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (containerRef.current && !gameRef.current) {
      const canvas = document.createElement('canvas');
      containerRef.current.appendChild(canvas);
      gameRef.current = createGame(canvas, playerName);
    }
    return () => { gameRef.current?.destroy(true); };
  }, [playerName]);

  return <div ref={containerRef} id="game-container" />;
}
```

**`packages/client/src/components/HomeScreen.tsx`** — React-ified version of `Home` state:
- Logo, name input, play/load character buttons
- Character preview showing armor/weapon from localStorage
- Calls WS to request new/load player

**`packages/client/src/components/HUD.tsx`** — React overlay for in-game info:
- Health bar, connected player count, latency
- Chat input box
- Achievement notifications

### Step 3.10: Client store

**`packages/client/src/store/GameStore.ts`** — Zustand store for shared game state between Phaser and React:
```typescript
import { create } from 'zustand';

interface GameState {
  playerId: number | null;
  playerName: string;
  hp: number;
  maxHp: number;
  nbConnected: number;
  latency: number;
  // ...
}

export const useGameStore = create<GameState>(() => ({
  playerId: null,
  playerName: '',
  hp: 100,
  maxHp: 100,
  nbConnected: 0,
  latency: 0,
}));
```

### Step 3.11: Copy static assets

Copy these files from the snapshot into `packages/client/src/assets/`:
- `assets/sprites/` (all atlases + images)
- `assets/audio/`
- `assets/fonts/`
- `assets/json/db.json`

Note: The sprite atlases (`.png` files) are referenced in the snapshots' `.json` files but the actual binary `.png` files are NOT in the snapshot text file. The agent must obtain these from the original repository (`https://github.com/Jerenaux/phaserquest`) or from the snapshot's recorded file names.

---

## Phase 4 — Map format utility

### Step 4.1: Port `format.js`

**`packages/server/src/format.ts`** — Port from `js/server/format.js` (offset 5359):
- `format()` function that reads a Tiled JSON map, flattens layers, outputs client + server map files
- Same exact logic, just TypeScript

---

## Phase 5 — Testing & verification

### Step 6.1: Run order
```
npm install
npm run build      # builds shared → server → client
npm run dev        # runs server + client concurrently
```

### Step 6.2: Verify against original behavior
1. Player can create/load character
2. Player can move with click-to-move
3. Monsters spawn and are visible
4. Combat works (click monster to attack)
5. Items/chests spawn and can be picked
6. Multiple players see each other (AOI sync)
7. Chat works
8. Achievements trigger
9. Player data persists across sessions (MongoDB)

---

## Key migration notes for the agent

### Binary protocol → JSON
The original uses a custom binary protocol (`Encoder.js`/`Decoder.js`/`CoDec.js`) for bandwidth efficiency. The TypeScript version should use JSON initially for simplicity. If bandwidth becomes an issue, switch to MessagePack or revisit binary encoding.

### Phaser 2 → Phaser 3 breaking changes

| Phaser 2 | Phaser 3 |
|----------|----------|
| `Phaser.Sprite.call(this, game, x, y, key)` | `class X extends Phaser.GameObjects.Sprite { constructor(scene, x, y, texture) { super(scene, x, y, texture); } }` |
| `game.add.existing(this)` | Automatic via `scene.add.existing(this)` |
| `game.add.tween(this)` | `scene.tweens.add({ targets: this, ... })` |
| `this.animations.add(name, frames, rate, loop)` | `scene.anims.create({ key, frames, frameRate, repeat })` then `this.play(key)` |
| `game.load.atlasJSONHash(key, png, json)` | `this.load.atlas(key, png, json)` |
| `sprite.events.onInputUp.add(cb)` | `sprite.on('pointerup', cb)` |
| `sprite.inputEnabled = true` | `sprite.setInteractive()` |
| `game.camera` | `this.cameras.main` |
| `game.world.setBounds(...)` | `this.cameras.main.setBounds(...)` |
| `Phaser.Animation.generateFrameNames(prefix, a, b)` | `this.anims.generateFrameNames(prefix, { start: a, end: b })` |

### WebSocket instead of Socket.io

Instead of `socket.emit('event', data)` / `socket.on('event', cb)` use:
```typescript
ws.send(JSON.stringify({ type: 'event', ...data }));
// receive
ws.onmessage = (e) => { const msg = JSON.parse(e.data); switch(msg.type) {...} }
```

Socket.io features NOT available in raw `ws`:
- Namespaces — not needed (single game namespace)
- Rooms — implement as `Map<roomId, Set<socketId>>` in the broadcaster
- Auto-reconnect — add in `WebSocketClient` with exponential backoff
- Binary — not used initially (JSON only)

### Server timing
Server update loop runs at `1000/12 ≈ 83ms`. Client updates sent every `1000/5 = 200ms`. This is from the original and should be preserved.

### Player ID management
The original uses MongoDB `_id.toString()` as the player identifier for persistence, and a numeric auto-increment ID (`GameServer.lastPlayerID++`) for in-game communication. Preserve this dual-ID system.

### Map files
The actual map JSON files (`minimap_server.json`, etc.) are generated by `format.js` from Tiled (.tmx) exports. They are NOT in the snapshot. The asset `.png` files are also not in the text snapshot. The agent should either:
1. Download from the original GitHub repo: `https://github.com/Jerenaux/phaserquest`
2. Generate placeholder maps for development

### localStorage schema
The client stores player data in `localStorage` with keys: `playerName`, `playerID`, `armor`, `weapon`, `ach0`, `ach1`, etc. Preserve this for the React client.

---

## Summary of files to create

| # | File | Purpose |
|---|------|---------|
| 1 | `package.json` (root) | Monorepo workspace config |
| 2 | `tsconfig.base.json` | Shared TS configuration |
| 3 | `packages/shared/package.json` | Shared types package |
| 4 | `packages/shared/tsconfig.json` | Shared TS config |
| 5 | `packages/shared/src/types/player.ts` | Player state types |
| 6 | `packages/shared/src/types/monster.ts` | Monster state types |
| 7 | `packages/shared/src/types/item.ts` | Item state types |
| 8 | `packages/shared/src/types/update.ts` | Update packet types |
| 9 | `packages/shared/src/types/protocol.ts` | WS message types |
| 10 | `packages/shared/src/types/aoi.ts` | AOI types |
| 11 | `packages/shared/src/types/map.ts` | Map data types |
| 12 | `packages/shared/src/constants.ts` | Game constants |
| 13 | `packages/shared/src/index.ts` | Re-exports |
| 14 | `packages/server/package.json` | Server dependencies |
| 15 | `packages/server/tsconfig.json` | Server TS config |
| 16 | `packages/server/src/index.ts` | Server entry point |
| 17 | `packages/server/src/config.ts` | Server config |
| 18 | `packages/server/src/GameServer.ts` | Main game logic |
| 19 | `packages/server/src/entities/GameObject.ts` | Base entity |
| 20 | `packages/server/src/entities/MovingEntity.ts` | Moving entity base |
| 21 | `packages/server/src/entities/Player.ts` | Player entity |
| 22 | `packages/server/src/entities/Monster.ts` | Monster entity |
| 23 | `packages/server/src/entities/Item.ts` | Item entity |
| 24 | `packages/server/src/aoi/AOI.ts` | AOI area |
| 25 | `packages/server/src/aoi/AOIutils.ts` | AOI utilities |
| 26 | `packages/server/src/aoi/spaceMap.ts` | Spatial map |
| 27 | `packages/server/src/packets/UpdatePacket.ts` | Global update packet |
| 28 | `packages/server/src/packets/PersonalUpdatePacket.ts` | Local update packet |
| 29 | `packages/server/src/systems/CombatSystem.ts` | Combat logic |
| 30 | `packages/server/src/systems/PathfindingSystem.ts` | Pathfinding |
| 31 | `packages/server/src/systems/LootSystem.ts` | Loot drops |
| 32 | `packages/server/src/systems/ChestAreaSystem.ts` | Chest areas |
| 33 | `packages/server/src/systems/RoamingSystem.ts` | Monster roaming |
| 34 | `packages/server/src/protocol/MessageHandler.ts` | WS message dispatch |
| 35 | `packages/server/src/protocol/broadcaster.ts` | Sending updates |
| 36 | `packages/server/src/db/connection.ts` | MongoDB connection |
| 37 | `packages/server/src/db/models/PlayerModel.ts` | Player schema |
| 38 | `packages/server/src/format.ts` | Map format utility |
| 39 | `packages/client/package.json` | Client dependencies |
| 40 | `packages/client/tsconfig.json` | Client TS config |
| 41 | `packages/client/vite.config.ts` | Vite config |
| 42 | `packages/client/index.html` | HTML entry |
| 43 | `packages/client/src/main.tsx` | React entry |
| 44 | `packages/client/src/App.tsx` | Root component |
| 45 | `packages/client/src/components/GameCanvas.tsx` | Phaser canvas wrapper |
| 46 | `packages/client/src/components/HomeScreen.tsx` | Home screen UI |
| 47 | `packages/client/src/components/HUD.tsx` | In-game HUD |
| 48 | `packages/client/src/components/ChatBox.tsx` | Chat component |
| 49 | `packages/client/src/game/GameManager.ts` | Phaser game bootstrap |
| 50 | `packages/client/src/game/scenes/BootScene.ts` | Asset preload scene |
| 51 | `packages/client/src/game/scenes/HomeScene.ts` | Home/Login scene |
| 52 | `packages/client/src/game/scenes/GameScene.ts` | Main gameplay scene |
| 53 | `packages/client/src/game/entities/Being.ts` | Base sprite |
| 54 | `packages/client/src/game/entities/Human.ts` | Human sprite |
| 55 | `packages/client/src/game/entities/Player.ts` | Player sprite |
| 56 | `packages/client/src/game/entities/Monster.ts` | Monster sprite |
| 57 | `packages/client/src/game/entities/NPC.ts` | NPC sprite |
| 58 | `packages/client/src/game/entities/Item.ts` | Item sprite |
| 59 | `packages/client/src/game/systems/AnimationSystem.ts` | Animation definitions |
| 60 | `packages/client/src/game/systems/MovementSystem.ts` | Movement tweens |
| 61 | `packages/client/src/game/systems/PathfindingSystem.ts` | EasyStar wrapper |
| 62 | `packages/client/src/network/WebSocketClient.ts` | WS connection |
| 63 | `packages/client/src/network/MessageHandler.ts` | Message dispatch |
| 64 | `packages/client/src/store/GameStore.ts` | Zustand store |
| 65 | `.gitignore` | Ignore node_modules, dist |
