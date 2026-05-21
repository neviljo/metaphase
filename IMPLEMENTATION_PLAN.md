# Implementation Plan — Feature Audit & Roadmap

## Overview

This document compares the **original PhaserQuest (BrowserQuest clone)** features against the **current TypeScript monorepo port**, then prioritises remaining work.

**Legend:**
- ✅ Implemented & wired
- ⚠️ Partial / class exists but dead code
- ❌ Missing entirely
- 🗑️ Dead code (file exists but never imported)

---

## 1. SHARED PACKAGE (`packages/shared`) — ✅ DONE

| File | Status |
|------|--------|
| `types/player.ts` | ✅ |
| `types/monster.ts` | ✅ |
| `types/item.ts` | ✅ |
| `types/map.ts` | ✅ |
| `types/update.ts` | ✅ |
| `types/protocol.ts` | ✅ |
| `types/aoi.ts` | ✅ |
| `constants.ts` | ✅ |
| `index.ts` | ✅ |

**No work needed.**

---

## 2. SERVER PACKAGE (`packages/server`) — ✅ SUBSTANTIALLY DONE

| Feature | Status | Notes |
|---------|--------|-------|
| GameServer main loop | ✅ | update(), regenerate(), updateFights() all called |
| Entity classes | ✅ | Player, Monster, Item, GameObject, MovingEntity, Route |
| Combat system | ✅ | setUpFight, handleKill, damage, takeDamage, die, respawn, loot |
| AOI system | ✅ | AOI, AOIutils, spaceMap |
| Protocol/broadcaster | ✅ | WS message dispatch, room management |
| MongoDB persistence | ✅ | PlayerModel, save/load/delete |
| Map format utility | ✅ | format.ts |
| NPC class (client) | ✅ | `NPC.ts` extends `Human`, spawned in GameScene, click-to-talk, dialogue, speech bubbles |

**Dead code (not imported by any consumer):**
- `systems/LootSystem.ts` 🗑️ — duplicate of CombatSystem functions
- `systems/RoamingSystem.ts` 🗑️ — GameServer has its own inline roaming
- `systems/PathfindingSystem.ts` 🗑️ — GameServer does pathfinding inline

---

## 3. CLIENT PACKAGE (`packages/client`) — ⚠️ PARTIAL

### 3.1 Core infrastructure

| Feature | Status | Notes |
|---------|--------|-------|
| main.tsx / App.tsx | ✅ | React entry, home/playing routing |
| WebSocketClient.ts | ✅ | JSON WS, auto-reconnect (2s fixed) |
| GameStore (Zustand) | ✅ | playerId, hp, nbConnected, latency, weapon, armor, alive |
| BootScene (asset loading) | ✅ | Atlases, db.json, tilesheet, map, audio |
| GameScene | ✅ | 713 lines — map render, entities, updates, death, chat |
| GameManager.ts | ✅ | Phaser.Game bootstrap |

### 3.2 Entity rendering

| Feature | Status | Notes |
|---------|--------|-------|
| Being (base sprite) | ✅ | Shadow, body, name, tween movement, animations |
| Player sprite | ✅ | Equipment overlay, animation prefix per armor/weapon |
| Monster sprite | ✅ | Dynamic animation creation per monster type |
| Item sprite | ✅ | Chest, sparkle, loot display |
| NPC sprite | ✅ | `NPC.ts` (69 lines) spawned in GameScene with click-to-talk, dialogue cycling, speech bubbles |
| Human sprite | ✅ | `Human.ts` imported by `NPC.ts` — `showBubble()` renders speech bubbles in Phaser |

### 3.3 Game systems

| Feature | Status | Notes |
|---------|--------|-------|
| AnimationSystem | ✅ | Player, weapon, death animations created |
| Client-side pathfinding | 🗑️ **Dead code** | `PathfindingSystem.ts` exists but never wired; client sends raw clicks to server |
| MovementSystem | 🗑️ **Dead code** | `executeMove`/`stopMovement` defined but never called; movement in Being.setPositionTile |

### 3.4 React UI components

| Feature | Status | Notes |
|---------|--------|-------|
| GameCanvas | ✅ | Phaser canvas mount |
| HomeScreen | ✅ | Name input, play button |
| HUD | ✅ | HP bar, player count, latency |
| ChatBox | 🗑️ **Dead code** | Defined but **never imported** in App.tsx; Phaser chat in GameScene is used instead |
| InventoryDisplay | ❌ | **Does not exist** |
| AchievementsPanel | ❌ | **Does not exist** |

### 3.5 Networking

| Feature | Status | Notes |
|---------|--------|-------|
| WS send/receive | ✅ | JSON protocol |
| MessageHandler class | 🗑️ **Dead code** | Defined but never imported; GameScene uses switch statement |
| Heartbeat/ping-pong | ⚠️ | Server handles `ponq` with rolling 20-sample median; client **never sends `ponq`** — latency stuck at 0ms |
| `pid` handler | ✅ | Stores playerId in useGameStore |

---

## 4. ORIGINAL GAME FEATURES vs CURRENT STATE

### 4.1 Player features

| Feature | Original | Current | Priority |
|---------|----------|---------|----------|
| Click-to-move | ✅ | ✅ | — |
| Server pathfinding + anti-cheat | ✅ | ✅ | — |
| Tile-based movement | ✅ | ✅ | — |
| Latency compensation | ✅ | ⚠️ Server handles `ponq` + 20-sample median; client never sends `ponq` — latency stuck at 0ms | Medium |
| Move target marker | ✅ | ❌ | Low |
| Orientation system (4-dir) | ✅ | ✅ | — |
| Melee combat (adjacent tiles) | ✅ | ✅ | — |
| Damage calculation (atk/def/rng) | ✅ | ✅ | — |
| 1s damage cooldown | ✅ | ✅ | — |
| Aggro detection (3x3 radius) | ✅ | ✅ | — |
| Foe management | ✅ | ✅ | — |
| 8 weapons + 6 armors | ✅ | ✅ (db.json) | — |
| Equipment comparison / weaker reject | ✅ | ✅ Server-side `applyItem` | — |
| NoPick notification | ✅ | ✅ Shows "Item not needed" notification (Phase A fix) | — |
| Health regen (+2/2s) | ✅ | ✅ | — |
| Death overlay / revive | ✅ | ✅ (GameScene) | — |
| Last hitter tracking | ✅ | ✅ | — |
| Achievements (8 types) | ✅ | ✅ Full trigger system in GameScene + NPC.ts; no AchievementsPanel UI | Medium |
| Equipment icons in HUD | ✅ | ❌ | Low |

### 4.2 Monster features

| Feature | Original | Current | Priority |
|---------|----------|---------|----------|
| 12 monster types | ✅ | ✅ | — |
| Boss (Skeleton King, 350 HP) | ✅ | ✅ (db.json) | — |
| Aggressive / non-aggressive flag | ✅ | ✅ | — |
| Monster AI (pathfind → target, damage) | ✅ | ✅ | — |
| Roaming (return to spawn) | ✅ | ✅ | — |
| Monster respawn (30s) | ✅ | ✅ | — |
| Loot tables (weighted random) | ✅ | ✅ | — |
| Loot drop on death | ✅ | ✅ | — |
| Monster animations (attack/walk/death) | ✅ | ✅ | — |
| Monster HP bars | ✅ | ✅ (GameScene.addMonsterHPBar) | — |

### 4.3 Item / chest features

| Feature | Original | Current | Priority |
|---------|----------|---------|----------|
| Static chests (respawn 30s) | ✅ | ✅ | — |
| Hidden chests (all monsters killed) | ✅ | ✅ | — |
| Chest opening animation | ✅ | ⚠️ Need to trigger open anim on action=4 | Low |
| Blinking / vanish (9s) | ✅ | ✅ | — |
| Loot sparkle | ✅ | ✅ | — |
| Flask (heal 40) / Burger (heal 100) | ✅ | ✅ | — |
| Auto-equip stronger items | ✅ | ✅ | — |
| Item hover cursor | ✅ | ❌ | Low |

### 4.4 Map features

| Feature | Original | Current | Priority |
|---------|----------|---------|----------|
| Tiled map format | ✅ | ✅ | — |
| Layer flattening (format.js) | ✅ | ✅ (format.ts) | — |
| Collision grid | ✅ | ✅ | — |
| Doors / teleport | ✅ | ✅ | — |
| Camera modes (follow/fixed/bounded) | ✅ | ❌ Only follow mode | Low |
| Chest area zones | ✅ | ✅ | — |
| Roaming area zones | ✅ | ✅ | — |
| Animated scenery tiles | ✅ | ❌ | Low |
| Checkpoints / spawn points | ✅ | ✅ | — |

### 4.5 NPC features

| Feature | Original | Current | Priority |
|---------|----------|---------|----------|
| 15 NPC types | ✅ | ✅ Spawned in GameScene from map + db.json | — |
| Click-to-talk | ✅ | ✅ NPC.ts `talk()` with 1.5s cooldown, dialogue cycling | — |
| Speech bubbles | ✅ | ✅ `Human.showBubble()` renders rounded-rect + text in Phaser | — |
| Dialogue arrays (multi-line) | ✅ | ✅ Array from db.json, cycles on each click | — |
| Talk cursor | ✅ | ⚠️ `cursor: pointer` on hover (no custom graphic) | Low |
| NPC collision blocking | ✅ | ✅ (setUpEntities) | — |

### 4.6 Chat features

| Feature | Original | Current | Priority |
|---------|----------|---------|----------|
| Enter to toggle chat | ✅ | ✅ (GameScene) | — |
| Chat broadcast to AOI | ✅ | ✅ | — |
| 300 char limit | ✅ | ✅ | — |
| Chat sound | ✅ | ✅ | — |
| Chat bubble icon (bottom-right) | ✅ | ❌ | Low |

### 4.7 UI / HUD features

| Feature | Original | Current | Priority |
|---------|----------|---------|----------|
| HP bar (tweened) | ✅ | ✅ (HUD + monster HP bars) | — |
| Floating damage numbers | ✅ | ✅ (showFloatingHP) | — |
| Player name display | ✅ | ✅ | — |
| Self name highlighting (gold) | ✅ | ❌ | Low |
| Connected player count | ✅ | ✅ (nbConnected in HUD) | — |
| Latency display | ✅ | ✅ (HUD) | — |
| Player equip icons in HUD | ✅ | ❌ | Low |
| Achievement notifications | ✅ | ✅ Calls `showNotification()` on each unlock in GameScene | — |
| Kill / pickup notifications | ✅ | ✅ (showNotification) | — |
| Loading bar (asset progress) | ✅ | ❌ | Low |
| Home screen character preview | ✅ | ❌ | Medium |
| Home screen character load | ✅ | ❌ (always creates new) | Medium |
| Home screen reset character | ✅ | ❌ | Medium |
| Orientation screen (mobile) | ✅ | ❌ | Low |
| Move target marker | ✅ | ❌ | Low |
| Custom cursors (loot/fight/talk) | ✅ | ❌ | Low |

### 4.8 Audio / sound features

| Feature | Original | Current | Priority |
|---------|----------|---------|----------|
| Intro music (OGG) | ✅ | ✅ Loaded and played in BootScene (looped, vol 0.3, autoplay-handled) | — |
| Sound effects (9 types) | ✅ | ✅ AudioManager.ts + playSound calls in GameScene | — |
| Sound mute toggle | ✅ | ✅ HUD button toggles AudioManager.muted; also controls intro music now | — |
| Audio file loading | ✅ | ✅ (BootScene) | — |

### 4.9 Achievement features

| Feature | Original | Current | Priority |
|---------|----------|---------|----------|
| 8 achievement types | ✅ | ✅ IDs defined (ACH_WEAPON..ACH_TOMB), unlocked in GameScene | — |
| Kill counters (rat, skeleton) | ✅ | ✅ 10 rats → "Angry Rats", 10 skeletons → "Bones Collector" | — |
| Location-based triggers | ✅ | ✅ Checked via db.achievements rects in GameScene | — |
| Speak-based triggers | ✅ | ✅ NPC.talk() unlocks ACH_TALK (index 3) | — |
| Chest open counter | ✅ | ✅ `chestOpens` tracked, unlocks ACH_CHEST (index 7) | — |
| localStorage persistence | ✅ | ✅ `ach0`-`ach7` saved/restored in GameScene | — |
| Achievement spark effects | ✅ | ❌ | Low |
| Achievement sound | ✅ | ❌ | Low |

### 4.10 Server anti-cheat

| Feature | Original | Current | Priority |
|---------|----------|---------|----------|
| Path length limit (60) | ✅ | ✅ | — |
| Max distance (AOI+8) | ✅ | ✅ | — |
| Start position check | ✅ | ✅ | — |
| Path continuity check | ✅ | ✅ | — |
| Collision validation | ✅ | ✅ | — |
| Position reset on invalid path | ✅ | ✅ | — |

### 4.11 Networking

| Feature | Original | Current | Priority |
|---------|----------|---------|----------|
| Socket.io → ws migration | ✅ | ✅ | — |
| Binary protocol → JSON | ✅ | ✅ (intentional simplification) | — |
| Latency estimation (median of 20) | ✅ | ⚠️ Server tracks 20 samples + median; client never sends `ponq` to trigger it | Medium |
| AOI room management | ✅ | ✅ | — |

---

## 5. ROADMAP — Remaining Work by Priority

### Phase A: LOW-HANGING FRUIT ✅

These are small fixes that unlock existing features:

1. ✅ **Wire `pid` handler in GameScene** (`GameScene.ts:231`)
   - Stores `playerId` in `useGameStore` when server sends `pid`

2. ✅ **Wire `noPick` handler in GameScene** — shows "Item not needed" notification

3. ✅ **Play intro music in BootScene** after assets load
   - Plays `intro` with browser autoplay-policy handling (`sound.locked` guard)

**Also fixed during Phase A:**
- ✅ **HUD overflow** — game area now wrapped in `position: relative` container so HUD anchors to the canvas, not the viewport
- ✅ **Arrow-key movement snap-back** — client no longer overwrites `expectedTileX/Y` from server global position updates, allowing client-side prediction to stay ahead

### Phase B: NPC SYSTEM ✅

Fully implemented — NPCs spawn, display speech bubbles, cycle dialogue on click, and unlock achievement on first talk:

1. ✅ **Create NPC spawning in GameScene** — reads NPC entities from map entities layer + `entities_client.json`, instantiates `NPC` sprites with dialogue from db.json

2. ✅ **Wire speech bubble interaction** — `Human.showBubble()` renders rounded-rect with text, auto-clears after 3.5s

3. ✅ **Add click-to-talk handler** — `NPC.talk()` cycles dialogue array with 1.5s cooldown, unlocks `ACH_TALK`

4. ✅ **Add talk cursor** — cursor changes to `'pointer'` on NPC hover (no custom graphic)

### Phase C: ACHIEVEMENTS ✅

All core achievement functionality is implemented (missing only the React AchievementsPanel UI):

1. ✅ **Create achievement store/state** — `GameStore` has `AchievementState`, `unlockAchievement()`, `killCounters`, `chestOpens`

2. ✅ **Wire kill counters** — 10 rats → "Angry Rats" (ACH_RATS=2), 10 skeletons → "Bones Collector" (ACH_SKELETONS=5)

3. ✅ **Wire location triggers** — checked via `db.achievements` collision rects in GameScene.updateSelf() on movement for "Into the Wild" (ACH_OUTDOOR=1) and "World's End" (ACH_SOUTH=6)

4. ✅ **Wire speak trigger** — `NPC.talk()` unlocks ACH_TALK (index 3) on first conversation

5. ✅ **Wire chest open trigger** — `chestOpens` counter incremented, unlocks ACH_TOMB (index 7)

6. ✅ **Add notification display** — `showNotification()` called on each unlock

7. ✅ **Persist to localStorage** — `ach0`-`ach7` saved/restored in GameScene

### Phase D: AUDIO SYSTEM ✅

1. ✅ **Intro music** — loaded and played in BootScene (looped, volume 0.3, autoplay-handled via `sound.locked` event)
2. ✅ **Sound effects** — 9 types loaded as audio sprite, played via AudioManager.playSound() in GameScene
3. ✅ **Audio manager** — `AudioManager.ts` with muted flag, playSound gate, intro music registration
4. ✅ **Sound mute toggle** — in HUD, toggles AudioManager.muted; now also pauses/resumes intro music

### Phase E: LATENCY MEASUREMENT

1. ❌ **Send `ponq` from client** — client never sends ping; no heartbeat or interval
2. ✅ **Track last 20 samples** on server — `MessageHandler.ts` computes median latency via quickselect
3. ❌ **Apply latency compensation** — `Being.setPositionTile` doesn't use delta; latency in update packet ignored

### Phase F: HOME SCREEN ENHANCEMENTS

1. **Add character preview** on HomeScreen (show equipped weapon/armor from localStorage)

2. **Add character load** — read `playerID` from localStorage, send `init_world{new: false, id}`

3. **Add character reset** — delete button with confirmation, calls `delete` WS message

### Phase G: UI POLISH

1. **Move target marker** — draw crosshair at path destination

2. **Self name highlighting** — gold color for own player

3. **Equipment icons in HUD** — show current weapon + armor sprites (Zustand store already has `weapon`/`armor` fields; just wire them in GameScene `handleGlobalUpdate`)

4. **Custom cursors** — loot cursor on items, fight cursor on monsters, talk cursor on NPCs

5. **Animated scenery tiles** — parse `db.json` animated tiles, create tweens

6. **Camera modes for doors** — apply fixed/bounded camera on teleport

7. **InventoryDisplay React component** — create and wire (reads from Zustand, no server changes needed)

8. **AchievementsPanel React component** — create and wire

9. **Responsive scaling (fill screen)** — add `Phaser.Scale.FIT` + `CENTER_BOTH` in `GameManager.ts`; update wrapper div + HUD CSS to use relative units instead of hardcoded 980x500

### Phase H: CLEANUP

1. **Remove dead code**:
   - `systems/LootSystem.ts` 🗑️ (server)
   - `systems/RoamingSystem.ts` 🗑️ (server)
   - `systems/PathfindingSystem.ts` 🗑️ (server)
   - `network/MessageHandler.ts` 🗑️ (client)
   - `game/systems/MovementSystem.ts` 🗑️ (client)
   - `components/ChatBox.tsx` 🗑️ (client, superseded by Phaser chat)

2. **Wire ChatBox React component** OR remove it (decide: keep Phaser chat or move to React)

3. **Add cleanup on GameCanvas unmount** — destroy Phaser game in useEffect return

4. **Add loading bar** to BootScene

---

## 6. SUMMARY — What's Blocking Full Gameplay

| Currently broken / missing | Root cause | Phase |
|---|---|---|---|
| Monsters don't attack / no HP feedback | ✅ **FIXED** (combat pipeline wired) | — |
| NPCs don't exist in game world | ✅ **FIXED** (NPCs spawned with click-to-talk + bubbles) | **B** |
| Can't talk to NPCs | ✅ **FIXED** (click-to-talk cycles dialogue + achievement) | **B** |
| No achievements | ✅ **FIXED** (8 types with triggers, storage, notifications) | **C** |
| No sound effects | ✅ **FIXED** (AudioManager + SFX wired) | **D** |
| Latency always 0ms | Client never sends `ponq` (server-side tracking done) | **E** |
| Home screen always creates new char | No character load from localStorage | **F** |
| No target marker | Missing UI feature | **G** |
| No AchievementsPanel UI | Missing React component | **G** |
| Memory leak on unmount | Missing Phaser destroy in GameCanvas | **H** |

---

## 7. FILE REFERENCE — Dead Code Inventory

| File | Location | Type | Action |
|------|----------|------|--------|
| `LootSystem.ts` | `packages/server/src/systems/` | Duplicate of CombatSystem.ts | Delete or re-export from CombatSystem |
| `RoamingSystem.ts` | `packages/server/src/systems/` | Unused | Delete or wire into GameServer |
| `PathfindingSystem.ts` | `packages/server/src/systems/` | Unused (server) | Delete or wire into GameServer |
| `MessageHandler.ts` | `packages/client/src/network/` | Unused | Delete or wire into WebSocketClient |
| `MovementSystem.ts` | `packages/client/src/game/systems/` | Unused | Delete or migrate movement here |
| `ChatBox.tsx` | `packages/client/src/components/` | Unused (React) | Delete or wire in App.tsx |
| ~~`Human.ts`~~ | ~~`packages/client/src/game/entities/`~~ | ~~Unused~~ | ✅ Now used — NPC extends Human for speech bubbles |
| ~~`NPC.ts`~~ | ~~`packages/client/src/game/entities/`~~ | ~~Unused~~ | ✅ Now instantiated in GameScene.spawnNPCs() |
| `PathfindingSystem.ts` | `packages/client/src/game/systems/` | Unused (client) | Delete or wire for local prediction |
