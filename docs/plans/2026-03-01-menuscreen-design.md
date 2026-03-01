# Menu Screen Design

**Version:** v0.3
**Feature name:** TBD (working title: "The Welcome Mat")

---

## Overview

A pre-game title screen that shows before any real game state initializes. A lightweight ambient farm world runs behind the menu — a self-playing NPC farm with weather and time-of-day cycle — communicating the game's vibe immediately. When the player chooses Play or Continue, the real game initializes fresh from that action.

---

## Screen Flow

```
PAGE LOAD
    │
    ▼
[AMBIENT WORLD INIT]          ← demo farm, no save data, no localStorage touched
    │
    ▼
[MAIN MENU]
    ├─► [NEW GAME]
    │       3 slot cards → empty: start immediately
    │                    → occupied: overwrite confirm → FULL INIT → play
    │
    ├─► [CONTINUE]  (only shown if ≥1 save slot exists)
    │       1 save → load immediately
    │       2–3 saves → slot picker
    │
    ├─► [SETTINGS]
    │       Tabs: Display | Sound | Keybinds
    │
    └─► [QUIT]
            Shows "close the tab" note (browser game, no process to kill)
```

Escape backs out of any sub-view to main menu. Enter confirms focused button.
Mid-game: Escape opens menu overlay, pauses `update()`. Continue resumes. Ambient world is not re-run during in-game pause — real world freezes.

---

## Ambient World

A separate, isolated world rendered behind the menu. Never touches real game globals.

**Initialization:** `generateWorld()` called into a local `ambientWorld` variable. Two `ambientRobots` (simple bot objects, not the real `robots` array). Real `world`, `robots`, `coins`, `day`, etc. are untouched until the player starts a game.

**NPC loop (looping script, rule-based, no BFS needed):**
```
idle → till a patch → plant seeds → water → wait (timelapse speed) → harvest → repeat
```
Bots walk to nearest untilled tile, perform actions. Simple state machine: `idle → moving → acting → idle`. Uses existing `Robot` class and built-in behaviors driven off `ambientRobots`.

**Weather / time cycle (cosmetic, no game mechanics):**
- Time-of-day advances at 4–6× normal speed; sky tint shifts dawn → day → dusk → night
- Weather rolls on a random 60–120s timer: sunny, overcast, rain (existing particle system), rare hail
- Soft dark veil overlay for night phase
- Existing `crops.js` particle system used for rain/hail, triggered independently

**Teardown:** `cancelAnimationFrame` on the ambient RAF handle, clear `ambientWorld` / `ambientRobots`. Then real `generateWorld()` / `loadGame()` fires.

---

## Menu UI Layout

**Main panel** (centered, semi-transparent over ambient world):

```
┌────────────────────────────────┐
│         🌾 ROBO FARM           │  Press Start 2P, gold, large
│    automate your harvest       │  VT323, dim, tagline
│                                │
│  [ ▶  CONTINUE          ]      │  only if save exists; auto-focused
│  [    NEW GAME          ]      │
│  [    SETTINGS          ]      │
│  [    QUIT              ]      │
│                                │
│       v0.2.1  ·  esc to close  │  shown only when in-game (pause menu)
└────────────────────────────────┘
```

Button style: existing `.game-btn` / `.top-btn` aesthetic — pixel border, gold hover, no rounded corners. New `#menu-screen` div with sub-views swapped via CSS classes.

**Transitions:**
- Menu appears: `opacity 0→1` 80ms + `translateY(6px)→0` — snappy
- Sub-view swap: outgoing `opacity 1→0` 60ms, incoming `opacity 0→1` 80ms
- Play/Continue: overlay `opacity 1→0` 120ms → real init fires as it clears
- No slide animations, no scale bounces, no long fades

---

## Save Slots

**Storage:** `roboFarm_save_1`, `roboFarm_save_2`, `roboFarm_save_3` (localStorage).
**Migration:** on load, if old `roboFarm_save` key exists, move it to slot 1 and delete the old key.

**Slot metadata** added to save object: `savedAt` (ISO timestamp), `playtime` (total ticks). `playtime` incremented each tick in `loop.js`, serialised in `buildSaveObject()`.

**Slot card layout (Load Game / New Game screens):**
```
┌─────────────────────────────────────────────┐
│  SLOT 1                                     │
│  Day 42  ·  Spring  ·  💰 1,840             │
│  🤖 3 robots  ·  🌾 12 crops planted        │
│  Saved Mar 1  ·  4h 22m played              │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│  SLOT 2          [ EMPTY ]                  │
└─────────────────────────────────────────────┘
```

Occupied slot: click to load. Small `[✕]` in corner → one confirm step to delete.
Empty slot: click → goes to New Game flow for that slot.

**New Game overwrite warning:**
```
┌──────────────────────────────────┐
│  ⚠  OVERWRITE SLOT 1?           │
│  Day 42 farm will be lost.      │
│  This cannot be undone.         │
│                                  │
│  [ Overwrite ]    [ Cancel ]    │
└──────────────────────────────────┘
```

---

## Settings Panel

Three tabs using the existing `.modal-tabs` / `.tab-btn` pattern.

**Display tab:**
- Notifications on/off → `S.display.showNotifications`
- Notification duration → Short / Normal / Long presets
- Day banner on/off

**Sound tab:**
- Placeholder: `"🔇 No audio yet — coming soon"` in dim text
- Tab present for future-readiness

**Keybinds tab:**
- Two-column table: action name | current key (read from `S.keybindings`)
- `[Edit]` per row → listens for next keypress, rebinds in-memory
- Changes are in-memory only (session); `settings.js` stays as the mod/advanced layer

---

## gameState Flag

New global `let gameState = 'menu'` gating `update()`:

```js
// loop.js
function update() {
  if (gameState !== 'playing') return;
  // ... existing update logic
}
```

`render()` always runs (ambient world or real world depending on state).
On Play/Continue: set `gameState = 'playing'` after init completes.
On Escape mid-game: set `gameState = 'menu'` (pauses update, shows overlay).

---

## New Files

| File | Purpose |
|------|---------|
| `menu.js` | `initMenu()`, ambient world loop, sub-view switching, slot card rendering, settings panel |

Loaded after `ui.js`, before `main.js`.

---

## Changelog Updates (in-scope)

### v0.2.1 — "The Great Unbundling" entry to add:

**New features:**
- 📈 Economy & Markets — full stock market modal. Trade shares in RFS and BuPop, earn dividends, watch live sparkline charts, track your production stats, unlock perks tied to shareholding
- 🦾 Robot Variants — three robot types: Rust (scavenger, never dies), Basic (all-rounder), Pro (fast, wide radius). Buy different types at the Shop, select which to place with the Robot tool
- 🎒 Inventory system — player bag with slot limits, robot inventory with capacity/slot caps. Transfer crops between player and robots from the Bag modal

**Under the hood:**
- Codebase split from a single `index.html` into 14 focused JS files + `style.css` — easier to navigate, easier to mod

**Version string bumps:** topbar button label, `changelogSeen` key in `main.js`, changelog modal header.

---

## Files to Modify

| File | Changes |
|------|---------|
| `index.html` | Add `#menu-screen` div and sub-view panels; add `<script src="menu.js">` before `main.js`; bump version button to `v0.2.1`; update changelog modal with v0.2.1 entry |
| `loop.js` | Gate `update()` behind `gameState`; increment `playtime` each tick |
| `saveload.js` | Multi-slot save/load functions; migration from old single key; `playtime` / `savedAt` in save object |
| `io.js` | `buildSaveObject()` gets `playtime` and `savedAt` fields |
| `main.js` | Remove inline init sequence (move to `menu.js`); bump `changelogSeen` key to `'v0.2.1'` |
| `style.css` | Menu screen styles, slot card styles, settings panel styles, transition classes |
| `menu.js` | New file — all menu logic |
