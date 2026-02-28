# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Game

Open `index.html` directly in a browser — no build step, no server required. There are no dependencies, package managers, or test suites.

## Architecture

This is a **single-file browser game**. The project has two source files:

### `settings.js` — Configuration & Modding Layer
Loaded first via `<script src="settings.js">`. Defines the `SETTINGS` object, normalizes it (aliases, defaults, derived values), then exposes it as `window.GAME_SETTINGS`. This is the intentional user-facing mod file — crops, robot types, world gen params, UI, keybindings, and `robotBehaviors` (AI functions) all live here.

### `index.html` — The Entire Game
All CSS, HTML markup, and game JavaScript live in this one file. The JS (`<script>` at the bottom) is organized into these sections:

| Section | Key functions |
|---|---|
| Config & RNG | `mkRng`, `hash2`, `valueNoise` — seeded deterministic world gen |
| World Generation | `generateWorld()` — value noise terrain, rivers, ponds, clearing |
| Game State | `let world`, `let robots`, `let player`, `let coins`, etc. at module scope |
| Pathfinding | `findPath(sx, sy, gx, gy)` — BFS, called per robot per tick |
| Robot System | `updateRobots()`, `runRobotBehavior()`, `executeRobotAction()` |
| Robot Sandbox | `compileRobotCode()`, `runSandboxed()` — user code runs via `new Function` with blocked globals |
| Crop System | `updateCrops()` — growth timers, watering, rain |
| Economy | `buySeeds()`, `buyRobot()`, `sellCrop()`, `refreshPrices()` |
| Rendering | `render()`, `drawTile()`, `drawCrop()`, `drawRobot()`, `drawPlayer()` — Canvas 2D, viewport-culled |
| Game Loop | `update()` called at 60fps via `requestAnimationFrame`; `tick` counts frames, `day` increments at `TPDAY` ticks |
| UI | Modal system (`openModal`/`closeModal`), `buildShop()`, `buildRobotList()` |
| Save/Load | `saveGame()`/`loadGame()` via `localStorage`; `exportWorldFile()`/`importWorldFile()` as JSON |

`const S = window.GAME_SETTINGS` is the bridge — all game code reads config through `S`.

## Key Conventions

- **Tile coordinates** vs **pixel coordinates**: robots and player have both `tileX`/`tileY` (integer grid) and `px`/`py` (pixel position for smooth rendering).
- **Robot behaviors** are functions `(robot, world, actions) => void` stored in `S.robotBehaviors` (settings.js) or `robot.customCode` (user-entered string, sandboxed). The actions API is documented in settings.js.
- **`robot.memory`** is the persistent scratchpad for robot state machines between behavior ticks.
- Tile types: `'grass'`, `'flower'`, `'tilled'`, `'water'`, `'tree'`, `'rock'`. Crops are stored as `tile.crop = { type, stage, watered }`, not as a separate tile type.
- World dimensions come from `S.world.width`/`S.world.height`; tile pixel size from `S.world.tileSize`.

## Current State

There is an **unresolved merge conflict** in `index.html` around line 2140–2144 (in `SANDBOX_BLOCKED` — whether `'eval'` is blocked). Resolve before editing that section.
