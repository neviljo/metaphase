# PhaserQuest

**PhaserQuest** is a browser-based massively multiplayer online role-playing game (MMORPG) — a modern TypeScript port of the classic BrowserQuest. Built with a real-time WebSocket server, a Phaser 3 game client, and MongoDB persistence, PhaserQuest delivers a complete multiplayer fantasy RPG experience in the browser.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [System Architecture (HLD)](#system-architecture-hld)
- [Detailed Design (LLD)](#detailed-design-lld)
- [Database Architecture](#database-architecture)
- [Network Protocol](#network-protocol)
- [Entity Model](#entity-model)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Development](#development)
- [Map Editing](#map-editing)

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Client** | Phaser 3 | 2D game engine (rendering, input, audio, tweens) |
| **Client UI** | React 18 + Zustand | UI overlays (home screen, HUD), state management |
| **Client Build** | Vite 6 | Fast dev server and production bundling |
| **Server** | Express 4 | Static file serving, HTTP endpoints |
| **Realtime** | ws (WebSocket) | Bidirectional real-time client-server communication |
| **Database** | MongoDB + Mongoose 8 | Player persistence |
| **Language** | TypeScript 5.4 | Full-stack type safety |
| **Pathfinding** | Pathfinding.js (PF) | Server-side A\* pathfinding |

---

## System Architecture (HLD)

```
┌─────────────────────────────────────────────────────────┐
│                      Browser                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │  React App (HomeScreen / HUD)                   │   │
│  │  ┌─────────────────────────────────────────┐    │   │
│  │  │  Phaser 3 Game Engine                    │    │   │
│  │  │  ┌─────────┐ ┌──────────┐ ┌──────────┐ │    │   │
│  │  │  │  Scenes  │ │Entities  │ │  Systems  │ │    │   │
│  │  │  └─────────┘ └──────────┘ └──────────┘ │    │   │
│  │  └─────────────────────────────────────────┘    │   │
│  │  ┌─────────────────────────────────────────┐    │   │
│  │  │  WebSocketClient (auto-reconnect, ping) │    │   │
│  │  └─────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────┘   │
│                         │  ws://                        │
│                    JSON Messages                        │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────┐
│                     Node.js Server                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Express (static serving)                       │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  WebSocket Server (ws)                          │   │
│  │  ┌────────────────┐  ┌──────────────────┐      │   │
│  │  │ MessageHandler │  │  Broadcaster      │      │   │
│  │  │ (dispatch +    │  │  (room-based      │      │   │
│  │  │  ping/pong)    │  │   per-AOI)        │      │   │
│  │  └────────────────┘  └──────────────────┘      │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  GameServer (core loop @ 200ms)                  │   │
│  │  ┌──────────┐ ┌──────────┐ ┌────────────────┐  │   │
│  │  │Entities  │ │AOI       │ │Systems          │  │   │
│  │  │(Player,  │ │(interest │ │(Combat, Chest,  │  │   │
│  │  │ Monster, │ │ mgmt)    │ │ Pathfinding)    │  │   │
│  │  │ Item)    │ │          │ │                 │  │   │
│  │  └──────────┘ └──────────┘ └────────────────┘  │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌──────────────────────┐                              │
│  │  Mongoose ODM        │                              │
│  └──────────┬───────────┘                              │
└──────────────┼─────────────────────────────────────────┘
               │
    ┌──────────┴──────────┐
    │     MongoDB          │
    │  ┌────────────────┐  │
    │  │  Player         │  │
    │  │  (name, pos,    │  │
    │  │   weapon, armor)│  │
    │  └────────────────┘  │
    └─────────────────────┘
```

### Key Architectural Decisions

1. **Monorepo** — Three packages (`shared`, `server`, `client`) share TypeScript types via workspace references, ensuring compile-time contract enforcement between client and server.

2. **AOI-Based Interest Management** — The world is partitioned into grid cells; each player only receives updates about entities within their area of interest (a 3×3 cell neighborhood). This keeps network bandwidth and client rendering scalable.

3. **Server-Authoritative** — All game logic (movement validation, combat resolution, loot drops, pathfinding) runs on the server. The client is a thin renderer that sends input (click-to-move paths) and applies state updates.

4. **Room-Based Broadcasting** — The `Broadcaster` uses named rooms per AOI cell to efficiently fan out update packets only to relevant players.

5. **JSON Protocol** — Messages are lightweight JSON objects (replacing the original custom binary protocol), simplifying debugging while keeping overhead low for a game of this scope.

---

## Detailed Design (LLD)

### Server Game Loop

The server runs two concurrent intervals:

| Interval | Rate | Responsibility |
|----------|------|---------------|
| **Movement tick** | ~83ms (12 Hz) | Process queued player paths, step monster AI, resolve melee hits |
| **Client broadcast** | 200ms (5 Hz) | Assemble and send `GlobalUpdate` + `PersonalUpdate` packets to each player |

### Area of Interest (AOI)

```
┌────┬────┬────┬────┬────┐
│    │    │    │    │    │
├────┼────┼────┼────┼────┤
│    │ AOI│AOI │AOI │    │
│    ├────┼────┼────┤    │
│    │ AOI│ ██ │AOI │    │  ← Player at center
│    ├────┼────┼────┤    │     visible AOI = 3×3 grid
│    │ AOI│AOI │AOI │    │
├────┼────┼────┼────┼────┤
│    │    │    │    │    │
└────┴────┴────┴────┴────┘
```

- Grid cell size: **34 × 20 tiles**
- Each player subscribes to 9 AOI rooms (self + 8 adjacent)
- `SpaceMap<T>` provides O(1) tile-based spatial lookups for all entity types
- Entities entering/leaving AOI cells generate add/remove notifications in the update packet

### Entity Hierarchy (Server)

```
GameObject (abstract)
  └── MovingEntity (abstract)
        ├── Player
        └── Monster
  └── Item
  └── Route (movement path helper)
```

#### Player Entity

| Property | Description |
|----------|-------------|
| `id` | MongoDB `_id` |
| `name` | Character name |
| `x, y` | Position in tile coordinates |
| `weapon, armor` | Equipment IDs |
| `hitPoints, maxHitPoints` | Combat health |
| `atk, def` | Derived from equipment |
| `inFight` | Currently in combat |
| `alive` | Alive or dead state |
| `target` | Current combat target |
| `route` | Movement path queue |

#### Monster Entity

| Property | Description |
|----------|-------------|
| `id` | Auto-generated UUID |
| `kind` | Monster type (rat, skeleton, goblin, boss, etc.) |
| `x, y` | Spawn / current position |
| `hitPoints, maxHitPoints` | From monster definitions |
| `atk, def, speed` | From monster definitions |
| `aggressive` | Whether it aggroes on sight |
| `target` | Current aggro target |
| `respawnTimer` | Countdown until respawn |
| `lootItems` | Weighted loot table |

### Combat System

```
Player clicks adjacent monster
  → Client sends "path" message with target
  → Server validates adjacency, line-of-sight
  → CombatSystem.setUpFight() initiates combat
  → Damage formula: max(1, attacker.atk - defender.def + random(-2,2))
  → 1-second cooldown between hits
  → On death: loot drop, hidden chest checks, kill count increment
```

### Loot System

- Each monster has a weighted loot table (`random-weighted-choice` library)
- Loot items are spawned as temporary `Item` entities (9-second despawn timer)
- Equipment drops auto-compare with current gear; weaker items are rejected
- Flask (heal 40) and Burger (heal 100) are consumable
- Hidden chests spawn when all monsters in a designated `ChestArea` are cleared

---

## Database Architecture

### MongoDB Schema

```
Database: phaserquest
Collection: players
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `name` | `String` (required) | — | Unique character name |
| `x` | `Number` | 0 | Tile X position |
| `y` | `Number` | 0 | Tile Y position |
| `weapon` | `String` | `"sword1"` | Equipped weapon ID |
| `armor` | `String` | `"clotharmor"` | Equipped armor ID |
| `createdAt` | `Date` (auto) | — | Mongoose timestamps |
| `updatedAt` | `Date` (auto) | — | Mongoose timestamps |

### Client-Side Persistence (localStorage)

| Key | Purpose |
|-----|---------|
| `playerName` | Last used character name |
| `playerID` | MongoDB document ID (for reconnect) |
| `weapon`, `armor` | Cached equipment (for home screen preview) |
| `ach0`–`ach7` | Achievement unlock flags |

### Data Flow

```
Client login → Server queries MongoDB by name
  → If exists: load position & equipment
  → If not: create new document with defaults
Game loop → Server updates player position on movement
  → Player.save() called periodically and on equipment change
  → Also saves on disconnect / shutdown
```

---

## Network Protocol

### Client → Server (`ClientMessage`)

```typescript
{ type: "init_world", name: string, playerID?: string }
{ type: "path",    path: Point[], action: ActionType }
{ type: "revive" }
{ type: "chat",   message: string }
{ type: "delete" }
{ type: "ponq",  seq: number }
```

### Server → Client (`ServerMessage`)

```typescript
{ type: "init",    player: PlayerState, ... }
{ type: "update",  global: GlobalUpdate, local: PersonalUpdate }
{ type: "pid",     id: string }
{ type: "reset",   x: number, y: number }
{ type: "chat",    name: string, message: string }
{ type: "wait" }
{ type: "dbError", message: string }
```

### Update Packet Structure

- **`GlobalUpdate`** — Entities visible within the player's AOI:
  - `newEntities[]` — Newly visible players, monsters, items, NPCs
  - `movedEntities[]` — Entity ID + new path / position
  - `disconnectedEntities[]` — Entity IDs that left AOI

- **`PersonalUpdate`** — Player-specific data:
  - `hp`, `maxHp`, `weapon`, `armor`, `x`, `y`, `alive`, `atk`, `def`
  - `items[]` — Inventory items
  - `kills[]` — Kill counter updates
  - `achievements[]` — Newly unlocked achievements

---

## Entity Model

| Entity | Managed By | Persistence | Key Behaviors |
|--------|-----------|-------------|---------------|
| **Player** | Server | MongoDB | Click-to-move, combat, equipment, health regen, death/revive, teleport via doors |
| **Monster** | Server | None (in-memory) | 12 types, aggro AI, roaming, pathfinding, loot drops, 30s respawn |
| **Item** | Server | None (in-memory) | Chests, loot drops, hidden chests, consumables (Flask/Burger), equipment |
| **NPC** | Static (map data) | None | 15 types, click-to-talk speech bubbles, dialogue cycling, achievement triggers |

### Equipment Catalog

| Category | Items |
|----------|-------|
| **Weapons** | `sword1`, `sword2`, `axe`, `morningstar`, `bluesword`, `goldensword`, `battleaxe`, `goldenaxe` |
| **Armor** | `clotharmor`, `leatherarmor`, `chainmail`, `platearmor`, `goldenarmor`, `redarmor` |

### Monster Catalog

| Kind | Speed | HP | ATK | DEF | Aggressive |
|------|-------|----|-----|-----|------------|
| Rat | 150 | 25 | 4 | 1 | No |
| Skeleton | 200 | 40 | 6 | 2 | No |
| Snake | 150 | 20 | 5 | 0 | No |
| Bat | 200 | 25 | 5 | 1 | No |
| Goblin | 200 | 40 | 7 | 2 | Yes |
| Wizard | 200 | 50 | 8 | 2 | Yes |
| Ghost | 200 | 50 | 9 | 2 | Yes |
| Skeleton King | 200 | 350 | 12 | 4 | Yes |

---

## Project Structure

```
metaphase/
├── packages/
│   ├── shared/                    # Shared types & constants
│   │   └── src/
│   │       ├── types/             # TypeScript interfaces (player, monster, item, protocol, aoi, map, update)
│   │       ├── constants.ts       # Game timing & balance constants
│   │       └── index.ts           # Barrel export
│   │
│   ├── server/                    # Game server
│   │   └── src/
│   │       ├── index.ts           # Entry point (Express + WebSocket + MongoDB + GameServer)
│   │       ├── config.ts          # Configuration from env
│   │       ├── GameServer.ts      # Core game loop, world state, player/monster/item management
│   │       ├── format.ts          # Tiled map layer-flattening utility
│   │       ├── entities/          # GameObject, MovingEntity, Player, Monster, Item, Route
│   │       ├── aoi/               # AOI, AOIutils, SpaceMap
│   │       ├── packets/           # UpdatePacket, PersonalUpdatePacket
│   │       ├── protocol/          # MessageHandler, Broadcaster
│   │       ├── db/                # MongoDB connection, PlayerModel
│   │       └── systems/           # CombatSystem, ChestAreaSystem
│   │
│   └── client/                    # Game client
│       └── src/
│           ├── main.tsx           # React entry point
│           ├── App.tsx            # Root component (Home → Game routing)
│           ├── assets/            # Sprites, audio, fonts, maps, tilesets
│           ├── components/        # GameCanvas, HomeScreen, HUD
│           ├── game/              # GameManager, scenes (Boot, Game), entities (Being, Human, Player, Monster, NPC, Item), systems (Animation, Audio, Pathfinding)
│           ├── network/           # WebSocketClient
│           └── store/             # Zustand GameStore
│
├── .env                           # Environment variables (MONGO_URI, PORT)
├── package.json                   # Root workspace config
├── tsconfig.base.json             # Shared TypeScript configuration
├── CONVERSION_PLAN.md             # Original JS → TypeScript migration blueprint
└── IMPLEMENTATION_PLAN.md         # Feature audit & roadmap
```

---

## Getting Started

### Prerequisites

- **Node.js** >= 18
- **npm** >= 9
- **MongoDB** (local or Atlas) — connection URI goes in `.env`

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd metaphase

# Install all dependencies (workspaces)
npm install

# Build shared package
npm run build -w packages/shared
```

### Configuration

Create a `.env` file in the root:

```env
MONGO_URI=mongodb://localhost:27017/phaserquest
PORT=8081
```

### Running

```bash
# Start MongoDB (if running locally)
npm run start:db

# Start server + client dev servers concurrently
npm run dev

# Or start individually:
npm run dev:server   # Server on port 8081
npm run dev:client   # Client on port 3000 (Vite dev server)
```

Open **http://localhost:3000** in your browser. Enter a character name and start playing.

### Production Build

```bash
npm run build
npm start            # Serves client from Express on port 8081
```

---

## Development

### Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Run server + client concurrently in dev mode |
| `npm run build` | Build all packages for production |
| `npm start` | Start production server |
| `npm run dev:server` | Start server with `tsx` watch |
| `npm run dev:client` | Start Vite dev server |
| `npm run map:format` | Flatten Tiled map layers after editing |

### Architecture Notes

- The **server is authoritative** — never trust the client for game state
- **AOI** is the backbone of scalability — all entity visibility flows through it
- Adding a new entity type requires: shared type → server entity class → client entity class → scene registration
- The update loop is the synchronization point — every 200ms the world state is snapshotted and diffed per-player

---

## Map Editing

The game world is built with **Tiled** (v1.1.6 or lower). After editing the source TMX file at `packages/client/src/assets/maps/phaserquest_map.tmx`:

```bash
npm run map:format
```

This flattens layer tiles into the optimized format consumed by both server and client. The output replaces the map JSON files in the client assets directory.

---

## Acknowledgments

PhaserQuest is a TypeScript modernization of [BrowserQuest](https://github.com/mozilla/BrowserQuest) by Mozilla, originally ported to Phaser by [Jeremie Renaux](https://github.com/jerenaux/phaserquest). The modernization follows the detailed conversion blueprint in `CONVERSION_PLAN.md` and tracks feature parity in `IMPLEMENTATION_PLAN.md`.
