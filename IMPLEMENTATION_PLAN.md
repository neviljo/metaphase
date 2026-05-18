# Implementation Plan — Remaining Features

These are ranked by dependency order (do earlier items first — they unlock later features).

---

## ✅ 1. Server: Wire up orphaned checks in `GameServer.update()` (UNLOCKS combat, items, chests, doors, auto-save)

**Status: DONE**

All five `check*` methods are called in the update loop, and `updateFights()` runs on its own interval.

---

## ❗ 2. Server: Fix combat feedback pipeline (UNLOCKS HP bar, floating damage, kill notifications)

**Status: NOT DONE — broken in the TypeScript port**

The server processes damage internally but sends zero feedback to the client. Three missing calls:

**a) `MovingEntity.takeDamage()` — add `addHP()` call**
- **File**: `packages/server/src/entities/MovingEntity.ts` (~line 74-85)
- After `this.updateLife(-damage)`, add:
  - If `this` is a Player → `this.updatePacket.addHP(true, Math.abs(damage), from.id)` (true = target, i.e. the monster was hit)
  - If `this` is a Monster → the attacker (player) should get `attacker.updatePacket.addHP(false, Math.abs(damage), this.id)` (false = self, i.e. you dealt damage)

**b) Override `updateLife()` in Player to send life stat**
- **File**: `packages/server/src/entities/Player.ts`
- Add an override:
  ```typescript
  updateLife(amount: number): number {
      const result = super.updateLife(amount);
      this.updatePacket.updateLife(this.life);
      return result;
  }
  ```

**c) `MovingEntity.die()` — wire up `handleKill`, respawn, loot**
- **File**: `packages/server/src/entities/MovingEntity.ts` (~line 128-134)
- After `this.endFight()`, add kill/despawn logic:
  - If `this.lastHitter` is a Player → call `handleKill(this.lastHitter, this)`
  - If `this` is a Monster → schedule respawn + loot drop

**d) Track `lastHitter` in `takeDamage()`**
- **File**: `packages/server/src/entities/MovingEntity.ts` (~line 74-85)
- Add `this.lastHitter = from` before the life update (needed for kill attribution)

**Effect**: Client HP bar updates, floating damage numbers appear, kill notifications show, monsters respawn and drop loot.

---

## ✅ 3. Client: Health bar / HUD

**Status: CLIENT DONE — blocked by item 2 (server doesn't send data)**

- HP bar background + fill drawn at top-left (`createHUD`)
- Floating HP numbers (`showFloatingHP`)
- Kill/pickup notification text (`showNotification`)
- All `handleLocalUpdate` cases (`life`, `hp`, `killed`, `used`, `noPick`) are wired

Works once the server sends the signals (item 2).

---

## ✅ 4. Client: Death + revive UI

**Status: DONE**

- Semi-transparent overlay, "You Died" text, interactive "Revive" button (appears after 3s)
- Death animation plays on `alive === false`
- Revive sends `{ type: 'revive' }` via WebSocket
- Other players go invisible on death and reappear on revive

---

## ✅ 5. Client: Walking animation (tween-based tile movement)

**Status: DONE**

- `Being.setPositionTile()` uses Phaser tweens (120ms per tile)
- Walk animation plays during tween, idle on completion
- `moveTween` is tracked and cancelled on new movement
- Teleports if distance > 64px (server correction / large jump)

---

## ✅ 6. Client: Combat visuals

**Status: CLIENT DONE — blocked by item 2**

- Monster HP bars drawn above each monster (`addMonsterHPBar`)
- Attack animation triggered on `inFight` + `targetID` for monsters
- Self-player attack animation triggered on `local.hp` when hit
- All UI exists but never fires because server doesn't send `hp` data

---

## ✅ 7. Client: Chat UI

**Status: DONE**

- DOM `<input>` toggled with Enter key
- Messages displayed in scrollable log (last 8 lines, up to 50 stored)
- Auto-expire after 10s
- Server broadcasts chat to AOI neighbors (already wired)

---

## ⚠️ 8. Client: Item pickup feedback + temporary items

**Status: PARTIALLY DONE**

✅ World items (healing flasks, equipment on ground):
- Items render from `global.newitems` with correct sprite key
- `addItem` sets chest sprite for chests, sparkle for loot items
- Walking over a flask calls `applyItem()` → sends `local.used` + `local.hp` → notification works
- Items hidden on `visible === false`, destroyed after 9s vanish delay

❌ Combat loot (monster drops):
- `dropLoot()` is called server-side but **`handleKill` is never triggered** from `die()` — item 2
- `addKilled` is never called → no kill notification for combat
- Monster death never schedules respawn or drops loot

---

## Summary of what's actually blocking gameplay

| What you see | Root cause |
|---|---|
| "Monsters aren't attacking" | Server processes damage but never sends `hp`/`life` to client |
| "Player walks through monsters" | **FIXED** — `handlePath` now checks monster occupancy |
| No HP bar movement | `Player.updateLife()` missing `updatePacket.updateLife()` call |
| No floating damage numbers | `takeDamage()` missing `addHP()` calls |
| No kill notification | `die()` missing `handleKill()` call |
| Monsters don't respawn / drop loot | `Monster.die()` missing respawn + loot logic |
