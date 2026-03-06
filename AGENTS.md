# Repository Guidelines

## Project Structure & Architecture
Robo Farm is a flat, browser-first codebase with no bundler and no modules. Runtime files live at repo root: `index.html`, `style.css`, and domain scripts (`world.js`, `robots.js`, `economy.js`, `ui.js`, `menu.js`, etc.).

Script load order in `index.html` is architectural. `settings.js` must load first and expose shared config as `window.GAME_SETTINGS`; gameplay files depend on that global.

Use `docs/plans/` for design/implementation notes on non-trivial work.

## Core Developer Conventions
- Keep browser global scope predictable; avoid hidden cross-file coupling.
- Use tile coords (`tileX/tileY`) for logic and pixel coords (`px/py`) for rendering.
- Preserve core data shapes:
  - Crop on tile: `tile.crop = { type, stage, watered }`
  - Robot behavior signature: `(robot, world, actions) => void`
  - Persistent robot scratch state: `robot.memory`
- Tile type constants are gameplay-critical (`grass`, `flower`, `tilled`, `water`, `tree`, `rock`); treat edits as balance-impacting changes.

## Build, Test, and Local Development
- Run locally: open `index.html` directly in a browser.
- Optional local server: `python3 -m http.server 8000` then open `http://localhost:8000`.
- Fast search: `rg --files` and `rg "pattern"`.
- Save/load regression harness: `node scripts/save-load-regression.js`.
- TypeScript transpile (car-related runtime files): `npm install` then `npm run build:ts`.

There is still no bundler/module build step for runtime scripts and no automated end-to-end test suite configured.

## Style & Naming
- Vanilla JavaScript/CSS/HTML only unless explicitly discussed.
- Match existing style: 2-space indentation, semicolons, trailing commas where already used.
- Naming:
  - `camelCase` for functions/variables.
  - `UPPER_SNAKE_CASE` for true constants.
  - Domain filenames (example: `crops.js`, `saveload.js`, `progression.js`).

## Testing Expectations
Manual browser verification is required for every gameplay/UI change:
- menu start/load flows,
- movement/tools/crop loop behavior,
- robots and inventory/modal interactions,
- save/load plus import/export when touched.

Record exact repro and verification steps in PR descriptions.

## Commits & Pull Requests
- Prefer conventional prefixes: `feat:`, `fix:`, `docs:`.
- For the active release line (currently `v0.2.4 - The Tightening`), keep the version commit current by amending it as requested instead of creating extra version-bump commits.
- PRs must include change summary, why it was needed, manual test evidence, and screenshots/videos for UI changes.
