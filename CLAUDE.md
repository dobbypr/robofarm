# CLAUDE.md

Do not read LICENSE.

## Design Principles

Robo Farm is a **relaxed, player-focused farming game**:
- Simple on the surface — minimal UI, no overwhelming menus
- Fun and rewarding — immediate feedback, never punishing
- Hidden complexity — automation exists but isn't forced
- Efficient — one-click actions, keyboard shortcuts for everything

Prefer soft caps over hard walls, helpful hints over error blocks, scannable UIs.

## Running the Game

Open `index.html` directly in a browser — no build step, no server, no dependencies.

## Architecture

Global browser scope (no modules). `const S = window.GAME_SETTINGS` bridges all files to config.

`settings.js` loads first — defines `SETTINGS`, normalizes it, exposes as `window.GAME_SETTINGS`. Crops, robot types, world params, keybindings, and `robotBehaviors` (AI functions) all live here.

| File | Contents |
|---|---|
| `rng.js` | TILE/WW/WH constants, `mkRng`, `hash2`, `valueNoise` — seeded world gen |
| `world.js` | `generateWorld()` — terrain, rivers, ponds |
| `state.js` | `coins`, `world`, `robots`, `player`, `day/tick/season`, companies data, camera; weather system (`weatherType`, `setWeather()`, `rollDailyWeather()`, `WEATHER_LOOKUP`) |
| `input.js` | Keyboard/mouse listeners, canvas refs, wheel zoom |
| `robots.js` | BFS pathfinding, `Robot` class, behaviors, `updateRobots()`, `executeRobotAction()` |
| `crops.js` | `updateCrops()` — growth, watering, rain; particle system |
| `economy.js` | Tile click, `buySeeds()`, `buyRobot()`, `sellCrop()`, perk getters, stock sim, economy UI |
| `saveload.js` | `saveGame()`/`loadGame()` via localStorage |
| `render.js` | `render()`, `drawTile/Crop/Robot/Player()` — Canvas 2D, viewport-culled; chunk-based terrain cache (`_RENDER_CACHE`, `markTileDirty()`, `markAllTilesDirty()`) with requestIdleCallback rebuilds |
| `loop.js` | `update()` at 60fps; `tick` counts frames, `day` increments at `TPDAY` ticks; vehicle physics (`vehicle.occupied`, throttle/steer/handbrake/turbo, `_vehicleClear()`) |
| `ui.js` | Modal system, `buildShop()`, `buildRobotList()`, `buildInventoryModal()` |
| `sandbox.js` | `compileRobotCode()`, `runSandboxed()` — user code via `new Function`, blocked globals |
| `io.js` | `exportWorldFile()`/`importWorldFile()`, robot code export/import |
| `menu.js` | Main menu, launch flow, changelog modal |
| `gazette.js` | Daily newspaper overlay — `generateGazette()`, `showGazette()`, `closeGazette()` |
| `main.js` | Tool drag, crop tooltip, milestones, `loop()` bootstrap, init |

## Key Conventions

- **Tile coords** (tileX/tileY, integer grid) vs **pixel coords** (px/py, smooth rendering)
- **Robot behaviors**: `(robot, world, actions) => void` in `S.robotBehaviors` or `robot.customCode` (sandboxed)
- **`robot.memory`**: persistent scratchpad between behavior ticks
- Tile types: `grass`, `flower`, `tilled`, `water`, `tree`, `rock`
- Crops: `tile.crop = { type, stage, watered }` — not a tile type
- World size: `S.world.width/height`; tile px: `S.world.tileSize` — default **112×84** tiles (up from 80×60)
- Weather: `weatherType` ∈ `{clear, rain, snow, thunder, hail}`; use `setWeather(type)`, `rollDailyWeather()`, `getWeatherInfo()`. `rainDay`/`isRaining` kept as compatibility flags.
- TypeScript pipeline: source lives in `src-ts/`, compiled to JS via `npm run build:ts`. JS files carry `/* @generated from src-ts/… */` header — edit the `.ts` source, not the compiled output.
- Vehicle: `vehicle` object in state — `occupied`, `px/py/angle/speed`; enter/exit with `vehicleToggle` action (default `F`). Physics in `loop.js`.

## Robot Types

| Key | Cost | Speed | Battery | Radius | Inv | Special |
|-----|------|-------|---------|--------|-----|---------|
| `rust` 🦾 | 100 | 1.8 | 60 | 5 | 12/2slots | Scavenges crops for fuel; never dies |
| `basic` 🤖 | 250 | 2.5 | 100 | 8 | 32/3slots | All-rounder |
| `pro` ⚡ | 600 | 4.0 | 150 | 14 | 64/5slots | Fast, large area |

Add a key to `S.robots` in settings.js to add a new type. `ROBOT_TYPES` is built at runtime.
`robotsOwned = {rust:N, basic:N, pro:N}`. `pendingRobotType` tracks what robot_place deploys.

## Working Style

**Always decompose into tasks.** Before implementing anything non-trivial, break the work into discrete subtasks using `TaskCreate`. Mark each `in_progress` before starting it and `completed` when done. This keeps context tight and progress visible.

**Use the dispatch-board skill for sub-agent triage.** Before dispatching any Agent, consult the dispatch-board triage rubric. Auto-delegate Haiku-eligible tasks (searches, single-file fixes, boilerplate, docs) with `model: "haiku"`. Spot-check Haiku's output before accepting. A PreToolUse hook reminds you automatically.
