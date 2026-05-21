# phaserquest — AGENTS.md

**This repo is a flat-file snapshot** of the `jerenaux/phaserquest` project tree (one `.txt` file, not extracted).  
Each file in the snapshot is delimited by `=== FILE: <path> ===`. To reconstruct, split on those markers.

## Project overview

Phaser (client) + Node.js/Socket.io (server) + MongoDB MMO game (BrowserQuest clone).

## Key commands (`package.json`)

| Command | Purpose |
|---------|---------|
| `npm install` | Install server deps (express, socket.io, mongodb, etc.) |
| `node server.js` | Start game server (default port **8081**) |
| `node server.js -p <port>` | Override port |
| `node server.js --mongoPort <port>` | MongoDB port override |
| `node server.js --mongoServer <host>` | MongoDB host override |
| `npm run map:format` | Flatten Tiled map layers (after editing `assets/maps/phaserquest_map.tmx`) |
| `npm run start:db` | `sudo mongod` |
| `npm run client:dev` | `http-server -p 80` (serves client standalone) |

## Architecture

- **Client entry**: `index.html` loads `js/client/main.js` which creates Phaser game states (`Home` → `Game`).
- **Server entry**: `server.js` → `js/server/GameServer.js`. Update loop runs every **200ms** via `GameServer.updatePlayers()`.
- **Protocol**: Custom binary protocol — `js/server/Encoder.js`, `js/client/Decoder.js`, `js/CODec.js`.
- **Interest management**: AOI-based (`js/server/AOI.js`, `js/client/AOIutils.js`).

## Map editing

Use **Tiled v1.1.6 or lower** (JSON format changed in later versions). After editing, run `npm run map:format` to flatten layers for performance — outputs client/server map files.

## Requirements

- Node.js, npm, MongoDB
- Client assets (Phaser, EasyStar) are bundled in the repo — no client-side npm install needed.

## Modernization plan

`CONVERSION_PLAN.md` contains a detailed step-by-step blueprint for porting to TypeScript + React + Phaser 3 + `ws` WebSockets. Any coding agent can follow it to rebuild the full stack. The plan covers 67 files across a 3-package monorepo (`shared`, `server`, `client`), with Phaser 2→3 migration tables, Socket.io→`ws` protocol mapping, and line-number references to the original snapshot.