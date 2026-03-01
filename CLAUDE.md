# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Design Principles

Robo Farm is a **relaxed, player-focused farming game**. All features should feel:

- **Simple on the surface** — minimal UI, clear actions, no overwhelming menus
- **Fun and rewarding** — feedback is immediate (particles, notifications, sounds), never punishing
- **Hidden complexity underneath** — automation and depth exist but aren't forced on casual players
- **Efficient to use** — one-click actions, smart defaults, keyboard shortcuts for everything

When adding features: prefer gentle soft caps over hard walls, prefer helpful hints over error blocks, and keep UIs scannable at a glance.

## Running the Game

Open `index.html` directly in a browser — no build step, no server required. There are no dependencies, package managers, or test suites.

## Architecture

The project loads files in this order — all scripts share the global browser scope (no modules):

### `settings.js` — Configuration & Modding Layer
Loaded first. Defines the `SETTINGS` object, normalizes it (aliases, defaults, derived values), then exposes it as `window.GAME_SETTINGS`. This is the intentional user-facing mod file — crops, robot types, world gen params, UI, keybindings, and `robotBehaviors` (AI functions) all live here.

### `style.css` — All Styles
Linked from `index.html`. Contains every CSS rule for the game UI.

### `index.html` — HTML Markup Only
Canvases, topbar, hotbar, all modals and overlays. No inline CSS or JS.

### JS files (loaded in order)

| File | Contents |
|---|---|
| `rng.js` | `const S`, TILE/WW/WH constants, `mkRng`, `hash2`, `valueNoise` — seeded deterministic world gen |
| `world.js` | `generateWorld()` — value noise terrain, rivers, ponds, clearing |
| `state.js` | `let coins`, `let world`, `let robots`, `let player`, `let day/tick/season`, companies data, camera |
| `input.js` | Keyboard/mouse event listeners, canvas refs, wheel zoom |
| `robots.js` | BFS pathfinding (`findPath`), `Robot` class, robot API, built-in behaviors, `updateRobots()`, `executeRobotAction()` |
| `crops.js` | `updateCrops()` — growth timers, watering, rain; particle system |
| `economy.js` | Tile click handler, robot inventory state, `buySeeds()`, `buyRobot()`, `sellCrop()`, perk getters, stock price simulation, economy UI, buy/sell shares |
| `saveload.js` | `saveGame()`/`loadGame()` via `localStorage` |
| `render.js` | `render()`, `drawTile()`, `drawCrop()`, `drawRobot()`, `drawPlayer()` — Canvas 2D, viewport-culled |
| `loop.js` | `update()` called at 60fps via `requestAnimationFrame`; `tick` counts frames, `day` increments at `TPDAY` ticks |
| `ui.js` | Modal system (`openModal`/`closeModal`), `buildShop()`, `buildRobotList()`, `buildInventoryModal()` |
| `sandbox.js` | `compileRobotCode()`, `runSandboxed()` — user code runs via `new Function` with blocked globals |
| `io.js` | `buildSaveObject()`, `exportWorldFile()`/`importWorldFile()`, robot code export/import, code templates |
| `main.js` | Drag-to-use tools, crop hover tooltip, milestone system, `loop()` bootstrap, init sequence |

`const S = window.GAME_SETTINGS` is the bridge — all game code reads config through `S`.

## Key Conventions

- **Tile coordinates** vs **pixel coordinates**: robots and player have both `tileX`/`tileY` (integer grid) and `px`/`py` (pixel position for smooth rendering).
- **Robot behaviors** are functions `(robot, world, actions) => void` stored in `S.robotBehaviors` (settings.js) or `robot.customCode` (user-entered string, sandboxed). The actions API is documented in settings.js.
- **`robot.memory`** is the persistent scratchpad for robot state machines between behavior ticks.
- Tile types: `'grass'`, `'flower'`, `'tilled'`, `'water'`, `'tree'`, `'rock'`. Crops are stored as `tile.crop = { type, stage, watered }`, not as a separate tile type.
- World dimensions come from `S.world.width`/`S.world.height`; tile pixel size from `S.world.tileSize`.

## Robot Variants (v0.3+)

Three types defined via `ROBOT_TYPES` (built from `S.robots` in index.html):

| Key | Emoji | Cost | Speed | BatteryMax | Radius | Inv | Special |
|-----|-------|------|-------|-----------|--------|-----|---------|
| `rust` | 🦾 | 100 | 1.8 | 60 | 5 | 12/2slots | Scavenges crops for fuel; never dies |
| `basic` | 🤖 | 250 | 2.5 | 100 | 8 | 32/3slots | All-rounder |
| `pro` | ⚡ | 600 | 4.0 | 150 | 14 | 64/5slots | Fast, large area |

- `ROBOT_TYPES` is built at runtime from `S.robots` keys — add a new key in settings.js to add a robot type
- `Robot(tx, ty, type)` constructor sets all per-robot stats from `ROBOT_TYPES[type]`
- Per-robot stats: `speed`, `batteryMax`, `batteryDrain`, `chargeRate`, `invCapacity`, `invSlots`, `canScavenge`
- `pendingRobotType` tracks which type the robot_place tool will deploy next
- Rustbot scavenge runs in `updateRobots()` before path logic; eats the nearest ready crop within work radius
- `buildShop()` dynamically builds the equipment grid from `ROBOT_TYPES`
- `robotsOwned` is now `{rust:N, basic:N, pro:N}`; save/load handles old number format

## Inventory System (v0.3+)

- **Player bag**: `inventory.crops` dict. Max `PLAYER_INV_SLOTS = 12` distinct crop types, `PLAYER_INV_MAX = 45` per type (soft cap enforced during collect).
- **Robot inventory**: `robot.inventory.crops` dict. `robot.invCapacity = 32` total items, `robot.invSlots = 3` distinct types. Robots return home automatically when full.
- **Key `I`** opens the inventory modal. `buildInventoryModal()` → `_buildPlayerGrid()` + `_buildRobotList()`.
- **Transfer flow**: click a player crop slot (highlights gold) → click GIVE on a robot row. COLLECT pulls all robot crops to player.
- Save-compatible: `invCapacity`/`invSlots` are stored on the robot object, old saves fall back to defaults.

## Current State

The merge conflict in `SANDBOX_BLOCKED` (~line 2140) has been resolved in the current working file.
