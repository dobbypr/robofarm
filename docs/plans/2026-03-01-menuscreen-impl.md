# Menu Screen Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a pre-game title screen with an ambient self-playing farm behind it, 3-slot save system, and a settings panel; also ship the missing v0.2.1 changelog entry.

**Architecture:** A `gameState` flag (`'menu'`|`'playing'`) gates `update()`. On load, `generateWorld()` runs immediately and two ambient NPC bots start farming — the real game globals become the ambient world. When the player starts/loads a game, globals are re-initialized and `gameState` flips to `'playing'`. All menu logic lives in a new `menu.js` file loaded after `ui.js` and before `main.js`.

**Tech Stack:** Vanilla JS, Canvas 2D, localStorage, browser (no build step, no server, no test suite). Verification = open `index.html` in browser and check behavior manually.

---

## Task 1: Version bump + v0.2.1 changelog entry

**Files:**
- Modify: `index.html` (topbar button, changelog modal)
- Modify: `main.js` (changelogSeen key)

**Step 1: Update topbar version button in index.html**

Find:
```html
<button class="top-btn" onclick="openModal('changelog')" style="border-color:#3a5a3a;color:#80cc80">📋 v0.2</button>
```
Replace with:
```html
<button class="top-btn" onclick="openModal('changelog')" style="border-color:#3a5a3a;color:#80cc80">📋 v0.2.1</button>
```

**Step 2: Add v0.2.1 entry at the top of the changelog modal body in index.html**

Find the opening of `.changelog-body`:
```html
  <div class="modal-body changelog-body">
    <div class="changelog-version">ROBO FARM  ·  v0.2</div>
```
Replace with:
```html
  <div class="modal-body changelog-body">
    <div class="changelog-version">ROBO FARM  ·  v0.2.1</div>
    <div class="changelog-subtitle">"The Great Unbundling" — more robots, markets, and a cleaner engine.</div>

    <div class="changelog-section">
      <div class="changelog-section-title">★ NEW FEATURES</div>
      <div class="changelog-entry">
        <div class="changelog-star">📈</div>
        <div class="changelog-text">
          <strong>Economy &amp; Markets</strong><br>
          A full stock market lives in the <strong>[📈 Economy]</strong> tab. Trade shares in <em>RFS</em> (Robot Farming Society) and <em>BuPop Inc.</em>, collect dividends, watch live sparkline charts, and unlock perks tied to shareholding. Your crops move their prices. Get in early.
        </div>
      </div>
      <div class="changelog-entry">
        <div class="changelog-star">🦾</div>
        <div class="changelog-text">
          <strong>Robot Variants</strong><br>
          Three robot types now: <em>Rust</em> (scavenger, runs on crops, never dies), <em>Basic</em> (solid all-rounder), <em>Pro</em> (fast, massive work radius). Buy them at the Shop under Equipment. The last type you bought auto-selects for placement.
        </div>
      </div>
      <div class="changelog-entry">
        <div class="changelog-star">🎒</div>
        <div class="changelog-text">
          <strong>Inventory System</strong><br>
          You and your robots now have proper inventories with slot limits. Open <strong>[🎒 Bag]</strong> to see what everyone's carrying, give seeds to robots, and collect their harvests — all in one place.
        </div>
      </div>
    </div>

    <div class="changelog-section">
      <div class="changelog-section-title">✦ UNDER THE HOOD</div>
      <div class="changelog-entry">
        <div class="changelog-star">🔧</div>
        <div class="changelog-text"><strong>The Great Unbundling</strong> — The entire game was extracted from one massive index.html into 14 focused JS files and a separate style.css. Easier to navigate, easier to mod, easier to build on.</div>
      </div>
    </div>

    <div style="border-top:1px solid var(--ui-border);margin:14px 0"></div>
    <div class="changelog-version" style="font-size:8px">ROBO FARM  ·  v0.2</div>
    <div class="changelog-subtitle">"The Tinkerer's Update" — your farm, your files, your code.</div>
```

**Step 3: Update changelogSeen key in main.js**

Find:
```js
  if (lastSeen !== 'v0.2') {
    setTimeout(() => { openModal('changelog'); localStorage.setItem('roboFarm_changelogSeen', 'v0.2'); }, 400);
  }
```
Replace with:
```js
  if (lastSeen !== 'v0.2.1') {
    setTimeout(() => { openModal('changelog'); localStorage.setItem('roboFarm_changelogSeen', 'v0.2.1'); }, 400);
  }
```

**Step 4: Verify**

Open `index.html` in browser. Check:
- Topbar button reads `📋 v0.2.1`
- Clicking it opens changelog showing v0.2.1 entries at top, v0.2 below
- On first load (or after clearing `roboFarm_changelogSeen` from localStorage), changelog auto-opens

**Step 5: Commit**
```bash
git add index.html main.js
git commit -m "feat: add v0.2.1 changelog entry and bump version string"
```

---

## Task 2: Add gameState and currentSlot to state.js

**Files:**
- Modify: `state.js`

**Step 1: Add gameState, currentSlot, playtime**

At the bottom of `state.js`, after `const camera = ...`:
```js
/* ═══════════════════════════════════════════════════════════════════════════
 * GAME STATE FLAGS
 * ═══════════════════════════════════════════════════════════════════════════ */
let gameState = 'menu';   // 'menu' | 'playing'
let currentSlot = 0;      // 0 = no slot loaded; 1–3 = active save slot
let playtime = 0;         // ticks elapsed in-game (not counting menu time)
```

**Step 2: Verify**

Open `index.html` in browser. No errors in console. `window.gameState` should be `'menu'`.

**Step 3: Commit**
```bash
git add state.js
git commit -m "feat: add gameState, currentSlot, playtime to state"
```

---

## Task 3: Gate update() behind gameState in loop.js

**Files:**
- Modify: `loop.js`

**Step 1: Add gameState guard and playtime increment**

In `loop.js`, wrap the entire `update()` body:

```js
function update() {
  if (gameState !== 'playing') return;

  playtime++;   // ← add this line right after the guard

  // ... rest of existing update() body unchanged ...
}
```

Also find the auto-save call inside `update()`:
```js
    saveGame();
```
Replace with:
```js
    if (currentSlot > 0) saveGame(currentSlot);
```

**Step 2: Verify**

Open `index.html`. Game canvas shows (world renders) but player does not move with WASD — `update()` returns early because `gameState === 'menu'`. No console errors.

**Step 3: Commit**
```bash
git add loop.js
git commit -m "feat: gate update() behind gameState, track playtime"
```

---

## Task 4: Multi-slot save system in saveload.js + io.js

**Files:**
- Modify: `saveload.js`
- Modify: `io.js` (`buildSaveObject`)

**Step 1: Replace saveload.js content**

```js
/* ═══════════════════════════════════════════════════════════════════════════
 * SAVE / LOAD  (3-slot system)
 * ═══════════════════════════════════════════════════════════════════════════ */
const _slotKey = slot => `roboFarm_save_${slot}`;

function migrateSingleSlot() {
  const old = localStorage.getItem('roboFarm_save');
  if (!old) return;
  if (!localStorage.getItem(_slotKey(1))) {
    localStorage.setItem(_slotKey(1), old);
  }
  localStorage.removeItem('roboFarm_save');
}

function saveGame(slot) {
  if (!slot || slot < 1 || slot > 3) return;
  const save = buildSaveObject();
  try {
    localStorage.setItem(_slotKey(slot), JSON.stringify(save));
    const flash = document.getElementById('save-flash');
    if (flash) { flash.style.opacity = '1'; setTimeout(() => flash.style.opacity = '0', 1200); }
  } catch(e) { notify('❌ Save failed!'); }
}

function loadGameSlot(slot) {
  try {
    const raw = localStorage.getItem(_slotKey(slot));
    if (!raw) return false;
    const save = JSON.parse(raw);
    if (save.v !== 2) { localStorage.removeItem(_slotKey(slot)); return false; }
    applyGameSave(save);
    playtime = save.playtime ?? 0;
    return true;
  } catch(e) { console.warn('Load failed', e); return false; }
}

function deleteSlot(slot) {
  localStorage.removeItem(_slotKey(slot));
}

function getSlotMeta(slot) {
  try {
    const raw = localStorage.getItem(_slotKey(slot));
    if (!raw) return null;
    const save = JSON.parse(raw);
    if (!save || save.v !== 2) return null;
    const cropCount = save.world?.flat().filter(t => t.crop).length ?? 0;
    return {
      day:         save.day ?? 1,
      coins:       save.coins ?? 0,
      season:      save.season ?? 0,
      robotCount:  save.robots?.length ?? 0,
      cropCount,
      savedAt:     save.savedAt ?? null,
      playtime:    save.playtime ?? 0,
    };
  } catch { return null; }
}

function _compileRobotCode_placeholder() {}
```

**Step 2: Add savedAt and playtime to buildSaveObject() in io.js**

Find the return statement in `buildSaveObject()`:
```js
  return {
    v: 2, coins, day, tick, season, isRaining, rainDay, inventory, robotsOwned,
```
Replace with:
```js
  return {
    v: 2, coins, day, tick, season, isRaining, rainDay, inventory, robotsOwned,
    savedAt: new Date().toISOString(),
    playtime,
```

**Step 3: Verify**

Open `index.html`. In browser console run:
```js
saveGame(1);
getSlotMeta(1);
```
Should return an object with `day`, `coins`, `savedAt`, `playtime`. No errors.

**Step 4: Commit**
```bash
git add saveload.js io.js
git commit -m "feat: multi-slot save system with metadata (savedAt, playtime)"
```

---

## Task 5: Menu HTML structure in index.html

**Files:**
- Modify: `index.html`

**Step 1: Add menu screen div after the canvas elements**

After `<canvas id="cursor-canvas"></canvas>`, add:

```html
<!-- ═══════════════════════════════════════════════════════════════════════
     MENU SCREEN
     ═══════════════════════════════════════════════════════════════════════ -->
<div id="menu-screen">
  <!-- Main view -->
  <div id="menu-main" class="menu-view active">
    <div class="menu-logo">🌾</div>
    <div class="menu-title">ROBO FARM</div>
    <div class="menu-tagline">automate your harvest</div>
    <div class="menu-buttons">
      <button class="menu-btn primary" id="menu-btn-continue" onclick="menuContinue()">▶&nbsp; CONTINUE</button>
      <button class="menu-btn" onclick="menuShowView('new-game')">NEW GAME</button>
      <button class="menu-btn" onclick="menuShowView('settings')">SETTINGS</button>
      <button class="menu-btn danger" onclick="menuQuit()">QUIT</button>
    </div>
    <div class="menu-version" id="menu-version-label">v0.2.1</div>
  </div>

  <!-- New Game / slot picker -->
  <div id="menu-new-game" class="menu-view">
    <div class="menu-sub-title">SELECT SLOT</div>
    <div class="menu-slots" id="menu-new-slots"></div>
    <button class="menu-btn back-btn" onclick="menuShowView('main')">◀ BACK</button>
  </div>

  <!-- Load Game / slot picker -->
  <div id="menu-load-game" class="menu-view">
    <div class="menu-sub-title">LOAD GAME</div>
    <div class="menu-slots" id="menu-load-slots"></div>
    <button class="menu-btn back-btn" onclick="menuShowView('main')">◀ BACK</button>
  </div>

  <!-- Overwrite confirm -->
  <div id="menu-confirm" class="menu-view">
    <div class="menu-sub-title" style="color:var(--gold)">⚠ OVERWRITE SAVE?</div>
    <div class="menu-confirm-msg" id="menu-confirm-msg"></div>
    <div class="menu-confirm-note">This cannot be undone.</div>
    <div class="menu-buttons">
      <button class="menu-btn danger" id="menu-confirm-ok">OVERWRITE</button>
      <button class="menu-btn" onclick="menuShowView('new-game')">CANCEL</button>
    </div>
  </div>

  <!-- Settings -->
  <div id="menu-settings" class="menu-view">
    <div class="menu-sub-title">SETTINGS</div>
    <div class="modal-tabs" style="margin-bottom:14px">
      <button class="tab-btn active" onclick="menuSettingsTab('display')">Display</button>
      <button class="tab-btn" onclick="menuSettingsTab('sound')">Sound</button>
      <button class="tab-btn" onclick="menuSettingsTab('keybinds')">Keybinds</button>
    </div>
    <div id="menu-settings-display" class="menu-settings-tab active"></div>
    <div id="menu-settings-sound" class="menu-settings-tab" style="display:none"></div>
    <div id="menu-settings-keybinds" class="menu-settings-tab" style="display:none"></div>
    <button class="menu-btn back-btn" onclick="menuShowView('main')">◀ BACK</button>
  </div>

  <!-- Quit -->
  <div id="menu-quit" class="menu-view">
    <div class="menu-sub-title">QUIT</div>
    <div class="menu-confirm-note" style="margin-bottom:18px">Close the browser tab to exit.</div>
    <button class="menu-btn" onclick="menuShowView('main')">◀ BACK</button>
  </div>
</div>
```

**Step 2: Add menu.js script tag in index.html**

Find `<script src="ui.js"></script>`. After it, add:
```html
<script src="menu.js"></script>
```

**Step 3: Verify**

Open `index.html`. A white or unstyled `#menu-screen` div may appear — that's fine, styles come in the next task. No console errors.

**Step 4: Commit**
```bash
git add index.html
git commit -m "feat: add menu screen HTML structure"
```

---

## Task 6: Menu CSS in style.css

**Files:**
- Modify: `style.css`

**Step 1: Append menu styles to end of style.css**

```css
/* ═══════════════════════════════════════════════════════════════════════════
 * MENU SCREEN
 * ═══════════════════════════════════════════════════════════════════════════ */
#menu-screen {
  position: fixed; inset: 0; z-index: 800;
  display: flex; align-items: center; justify-content: center;
  background: rgba(10, 8, 4, 0.82);
  transition: opacity 0.12s ease;
}
#menu-screen.hidden { opacity: 0; pointer-events: none; }
#menu-screen.fade-out { opacity: 0; pointer-events: none; transition: opacity 0.12s ease; }

.menu-view { display: none; flex-direction: column; align-items: center; gap: 0; min-width: 280px; }
.menu-view.active { display: flex; animation: menu-view-in 0.08s ease forwards; }
@keyframes menu-view-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

.menu-logo  { font-size: 40px; margin-bottom: 6px; }
.menu-title {
  font-family: 'Press Start 2P', monospace; font-size: 22px;
  color: var(--gold); letter-spacing: 2px; margin-bottom: 6px;
}
.menu-tagline {
  font-family: 'VT323', monospace; font-size: 20px;
  color: var(--text-dim); margin-bottom: 28px; letter-spacing: 1px;
}
.menu-sub-title {
  font-family: 'Press Start 2P', monospace; font-size: 10px;
  color: var(--gold); margin-bottom: 18px; letter-spacing: 1px;
}

.menu-buttons { display: flex; flex-direction: column; gap: 8px; width: 100%; }

.menu-btn {
  width: 100%; padding: 11px 20px; text-align: left;
  background: rgba(12,10,5,0.9); border: 2px solid var(--ui-border);
  color: var(--text); font-family: 'Press Start 2P', monospace; font-size: 8px;
  cursor: pointer; letter-spacing: 1px;
  transition: border-color 0.07s, color 0.07s, background 0.07s;
}
.menu-btn:hover, .menu-btn:focus {
  border-color: var(--gold); color: var(--gold);
  background: rgba(200,150,50,0.12); outline: none;
}
.menu-btn.primary { border-color: var(--gold-dim); color: var(--gold); }
.menu-btn.primary:hover { background: rgba(200,150,50,0.2); }
.menu-btn.danger:hover  { border-color: var(--red); color: var(--red); background: rgba(196,64,64,0.1); }
.menu-btn.back-btn {
  margin-top: 16px; font-size: 7px; color: var(--text-dim);
  border-color: transparent; background: transparent; width: auto; padding: 6px 12px;
}
.menu-btn.back-btn:hover { border-color: var(--ui-border); color: var(--text); background: transparent; }

.menu-version {
  margin-top: 24px; font-family: 'Press Start 2P', monospace;
  font-size: 6px; color: #443322; letter-spacing: 1px;
}

/* Slot cards */
.menu-slots { display: flex; flex-direction: column; gap: 8px; width: 320px; }
.menu-slot-card {
  padding: 12px 14px; border: 2px solid var(--ui-border);
  background: rgba(12,10,5,0.9); cursor: pointer; position: relative;
  transition: border-color 0.07s, background 0.07s;
}
.menu-slot-card:hover { border-color: var(--gold); background: rgba(200,150,50,0.08); }
.menu-slot-card.empty { opacity: 0.5; }
.menu-slot-card.empty:hover { opacity: 0.8; border-color: var(--ui-border-bright); }
.menu-slot-label {
  font-family: 'Press Start 2P', monospace; font-size: 6px;
  color: var(--text-dim); margin-bottom: 6px; letter-spacing: 1px;
}
.menu-slot-main {
  font-family: 'Press Start 2P', monospace; font-size: 8px; color: var(--text); margin-bottom: 4px;
}
.menu-slot-sub { font-family: 'VT323', monospace; font-size: 15px; color: var(--text-dim); }
.menu-slot-delete {
  position: absolute; top: 6px; right: 8px;
  background: none; border: none; color: #443322; font-size: 14px;
  cursor: pointer; font-family: 'VT323', monospace; padding: 2px 4px;
  transition: color 0.07s;
}
.menu-slot-delete:hover { color: var(--red); }

/* Overwrite confirm */
.menu-confirm-msg {
  font-family: 'VT323', monospace; font-size: 18px; color: var(--text);
  margin-bottom: 6px; text-align: center;
}
.menu-confirm-note {
  font-family: 'VT323', monospace; font-size: 15px; color: var(--text-dim);
  margin-bottom: 18px; text-align: center;
}

/* Settings rows */
.menu-setting-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 0; border-bottom: 1px solid var(--ui-border);
  width: 320px; gap: 12px;
}
.menu-setting-label { font-family: 'VT323', monospace; font-size: 17px; color: var(--text); flex: 1; }
.menu-setting-toggle {
  background: rgba(0,0,0,0.5); border: 1px solid var(--ui-border);
  color: var(--text-dim); font-family: 'Press Start 2P', monospace; font-size: 6px;
  padding: 4px 8px; cursor: pointer; min-width: 48px; text-align: center;
  transition: all 0.07s;
}
.menu-setting-toggle.on { border-color: var(--green); color: var(--green); }
.menu-setting-toggle:hover { border-color: var(--gold); color: var(--gold); }

/* Keybinds table */
.menu-keybind-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 5px 0; border-bottom: 1px solid var(--ui-border); width: 320px;
}
.menu-keybind-action { font-family: 'VT323', monospace; font-size: 16px; color: var(--text); flex: 1; }
.menu-keybind-key {
  font-family: 'Press Start 2P', monospace; font-size: 7px; color: var(--gold);
  background: rgba(0,0,0,0.5); border: 1px solid var(--ui-border);
  padding: 3px 7px; min-width: 48px; text-align: center; cursor: pointer;
  transition: border-color 0.07s;
}
.menu-keybind-key:hover  { border-color: var(--gold); }
.menu-keybind-key.listening { border-color: var(--blue); color: var(--blue); animation: key-blink 0.5s infinite; }
@keyframes key-blink { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
.menu-settings-tab { max-height: 340px; overflow-y: auto; }
.menu-sound-placeholder {
  font-family: 'VT323', monospace; font-size: 17px; color: var(--text-dim);
  padding: 20px 0; text-align: center; width: 320px;
}
```

**Step 2: Verify**

Open `index.html`. The menu panel appears centered over the ambient world with the correct dark background, gold title, and styled buttons. No visual regressions on topbar/hotbar/modals.

**Step 3: Commit**
```bash
git add style.css
git commit -m "feat: add menu screen CSS"
```

---

## Task 7: menu.js — core view switching + main menu wiring

**Files:**
- Create: `menu.js`

**Step 1: Create menu.js with view switching and main menu logic**

```js
/* ═══════════════════════════════════════════════════════════════════════════
 * MENU SCREEN
 * ═══════════════════════════════════════════════════════════════════════════ */

/* ─── View switching ─── */
function menuShowView(name) {
  document.querySelectorAll('.menu-view').forEach(v => v.classList.remove('active'));
  const el = document.getElementById(`menu-${name}`);
  if (el) el.classList.add('active');

  if (name === 'new-game')  menuBuildSlots('new');
  if (name === 'load-game') menuBuildSlots('load');
  if (name === 'settings')  menuBuildSettings();
}

/* ─── Open / close menu overlay ─── */
function openMenu() {
  const screen = document.getElementById('menu-screen');
  screen.classList.remove('hidden', 'fade-out');
  menuShowView('main');
  menuRefreshContinueBtn();
  if (gameState === 'playing') {
    gameState = 'menu';
    document.getElementById('menu-version-label').style.display = 'block';
    // show "Back to Game" instead of Quit when pausing mid-game
    const quitBtn = document.querySelector('#menu-main .menu-btn.danger');
    if (quitBtn) { quitBtn.textContent = 'BACK TO GAME'; quitBtn.onclick = resumeGame; }
  } else {
    const quitBtn = document.querySelector('#menu-main .menu-btn.danger');
    if (quitBtn) { quitBtn.textContent = 'QUIT'; quitBtn.onclick = menuQuit; }
  }
}

function closeMenu() {
  const screen = document.getElementById('menu-screen');
  screen.classList.add('fade-out');
  setTimeout(() => screen.classList.add('hidden'), 120);
}

function resumeGame() {
  gameState = 'playing';
  closeMenu();
}

function menuQuit() {
  menuShowView('quit');
}

/* ─── Continue button visibility ─── */
function menuRefreshContinueBtn() {
  const btn = document.getElementById('menu-btn-continue');
  const hasSave = [1,2,3].some(s => getSlotMeta(s) !== null);
  btn.style.display = hasSave ? 'block' : 'none';
}

function menuContinue() {
  const saves = [1,2,3].filter(s => getSlotMeta(s) !== null);
  if (saves.length === 1) {
    launchGame(saves[0], false);
  } else {
    menuShowView('load-game');
  }
}

/* ─── Escape key ─── */
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const screen = document.getElementById('menu-screen');
  const isHidden = screen.classList.contains('hidden');
  if (!isHidden) {
    // Back out of sub-views or resume game
    const activeView = document.querySelector('.menu-view.active');
    if (activeView && activeView.id !== 'menu-main') {
      menuShowView('main');
    } else if (gameState === 'menu' && currentSlot > 0) {
      resumeGame();
    }
  } else if (gameState === 'playing') {
    openMenu();
  }
});
```

**Step 2: Verify**

Open `index.html`. Menu shows on load. Clicking buttons navigates between sub-views. Escape while on a sub-view goes back to main. No errors.

**Step 3: Commit**
```bash
git add menu.js
git commit -m "feat: menu.js view switching, open/close, Escape key"
```

---

## Task 8: menu.js — slot cards (New Game + Load Game)

**Files:**
- Modify: `menu.js`

**Step 1: Add slot card rendering and launch logic to menu.js**

```js
/* ─── Slot card helpers ─── */
function _fmtPlaytime(ticks) {
  const totalSec = Math.floor(ticks / 60);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m played`;
  if (m > 0) return `${m}m played`;
  return 'just started';
}

function _fmtSavedAt(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return `Saved ${d.toLocaleDateString('en-US', { month:'short', day:'numeric' })}`;
  } catch { return ''; }
}

function menuBuildSlots(mode) {
  const containerId = mode === 'new' ? 'menu-new-slots' : 'menu-load-slots';
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  for (let slot = 1; slot <= 3; slot++) {
    const meta = getSlotMeta(slot);
    const card = document.createElement('div');
    card.className = 'menu-slot-card' + (meta ? '' : ' empty');

    if (meta) {
      const seasonName = (S.time.seasons || SEASONS)[meta.season % (S.time.seasons || SEASONS).length];
      card.innerHTML = `
        <div class="menu-slot-label">SLOT ${slot}</div>
        <div class="menu-slot-main">Day ${meta.day} · ${seasonName} · 💰 ${meta.coins}</div>
        <div class="menu-slot-sub">🤖 ${meta.robotCount} robots · 🌾 ${meta.cropCount} crops</div>
        <div class="menu-slot-sub">${_fmtSavedAt(meta.savedAt)} · ${_fmtPlaytime(meta.playtime)}</div>
        <button class="menu-slot-delete" title="Delete save" onclick="menuDeleteSlot(event, ${slot})">✕</button>`;
      if (mode === 'load') {
        card.onclick = () => launchGame(slot, false);
      } else {
        // new game into occupied slot → confirm overwrite
        card.onclick = () => menuConfirmOverwrite(slot, meta);
      }
    } else {
      card.innerHTML = `<div class="menu-slot-label">SLOT ${slot}</div><div class="menu-slot-sub">Empty</div>`;
      if (mode === 'new') {
        card.onclick = () => launchGame(slot, true);
      }
      // load mode: empty slot does nothing
    }
    container.appendChild(card);
  }
}

function menuDeleteSlot(e, slot) {
  e.stopPropagation();
  if (!confirm(`Delete Slot ${slot}? This cannot be undone.`)) return;
  deleteSlot(slot);
  if (currentSlot === slot) { currentSlot = 0; }
  menuBuildSlots(document.getElementById('menu-new-slots').children.length ? 'new' : 'load');
  menuRefreshContinueBtn();
}

function menuConfirmOverwrite(slot, meta) {
  const seasonName = (S.time.seasons || SEASONS)[meta.season % (S.time.seasons || SEASONS).length];
  document.getElementById('menu-confirm-msg').textContent =
    `Slot ${slot}: Day ${meta.day}, ${seasonName}, ${meta.coins} coins`;
  const okBtn = document.getElementById('menu-confirm-ok');
  okBtn.onclick = () => launchGame(slot, true);
  menuShowView('confirm');
}

/* ─── Launch game ─── */
function launchGame(slot, isNew) {
  const screen = document.getElementById('menu-screen');
  screen.classList.add('fade-out');

  setTimeout(() => {
    screen.classList.add('hidden');

    // Reset state for new or loaded game
    if (isNew) {
      // Fresh game state
      coins = S.player.startCoins;
      day = 1; tick = 0; season = 0;
      isRaining = false; rainDay = Math.random() < (S.time.rainChance?.Spring ?? 0.2);
      inventory = { seeds: {}, crops: {} };
      for (const [k,v] of Object.entries(S.player.startSeeds)) inventory.seeds[k] = v;
      robotsOwned = { rust: 0, basic: 0, pro: 0 };
      robots = [];
      playtime = 0;
      productionStats = { history: [], today: { income:0, harvested:0, robotHarvests:0, cropBreakdown:{} } };
      COMPANIES.rfs.price = COMPANIES.rfs.basePrice; COMPANIES.rfs.priceHistory = []; COMPANIES.rfs.sharesOwned = 0;
      COMPANIES.bupop.price = COMPANIES.bupop.basePrice; COMPANIES.bupop.priceHistory = []; COMPANIES.bupop.sharesOwned = 0;

      generateWorld();

      // Starter robots
      for (let i = 0; i < S.player.startRobots; i++) {
        robots.push(new Robot(S.player.startX + 2 + i, S.player.startY + 2));
      }

      notify('🌾 Welcome to Robo Farm! Press F for the guide.');
      notify('🌱 Start by tilling soil (key 2) and planting seeds!');
    } else {
      generateWorld();
      loadGameSlot(slot);
    }

    currentSlot = slot;
    gameState = 'playing';

    // Camera
    camera.x = window.innerWidth/2 - (player.px + TILE/2) * camera.zoom;
    camera.y = window.innerHeight/2 - (player.py + TILE/2) * camera.zoom;

    updateUI();
    saveGame(slot);
  }, 120);
}
```

**Step 2: Verify**

- Open `index.html`. New Game → Slot 1 (empty) should launch a fresh game. Game plays normally.
- Reload, New Game → same slot → shows overwrite confirm. Overwrite launches fresh game.
- Reload, Continue → loads the saved game.
- Check that `currentSlot` is set in console: `window.currentSlot` → `1`.

**Step 3: Commit**
```bash
git add menu.js
git commit -m "feat: slot card rendering, New Game flow, Load Game flow"
```

---

## Task 9: menu.js — Settings panel

**Files:**
- Modify: `menu.js`

**Step 1: Add settings panel build functions to menu.js**

```js
/* ─── Settings ─── */
const MENU_SETTINGS_STORE = 'roboFarm_settings';

function _loadSettingsOverrides() {
  try { return JSON.parse(localStorage.getItem(MENU_SETTINGS_STORE) || '{}'); } catch { return {}; }
}
function _saveSettingsOverrides(obj) {
  localStorage.setItem(MENU_SETTINGS_STORE, JSON.stringify(obj));
}

function menuBuildSettings() {
  menuBuildSettingsDisplay();
  menuBuildSettingsSound();
  menuBuildSettingsKeybinds();
}

function menuSettingsTab(tab) {
  document.querySelectorAll('.menu-settings-tab').forEach(el => el.style.display = 'none');
  document.querySelectorAll('#menu-settings .tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`menu-settings-${tab}`).style.display = 'block';
  const btns = [...document.querySelectorAll('#menu-settings .tab-btn')];
  const idx = ['display','sound','keybinds'].indexOf(tab);
  if (btns[idx]) btns[idx].classList.add('active');
}

function menuBuildSettingsDisplay() {
  const container = document.getElementById('menu-settings-display');
  container.innerHTML = '';

  const rows = [
    { label: 'Notifications', key: 'showNotifications', get: () => S.display.showNotifications,
      set: v => { S.display.showNotifications = v; } },
    { label: 'Day Banner',    key: 'showDayBanner',     get: () => S.display.showDayBanner ?? true,
      set: v => { S.display.showDayBanner = v; } },
  ];

  for (const row of rows) {
    const el = document.createElement('div');
    el.className = 'menu-setting-row';
    const val = row.get();
    el.innerHTML = `
      <span class="menu-setting-label">${row.label}</span>
      <button class="menu-setting-toggle ${val ? 'on' : ''}" data-key="${row.key}">
        ${val ? 'ON' : 'OFF'}
      </button>`;
    el.querySelector('button').onclick = function() {
      const current = row.get();
      row.set(!current);
      this.textContent = !current ? 'ON' : 'OFF';
      this.classList.toggle('on', !current);
      const overrides = _loadSettingsOverrides();
      overrides[row.key] = !current;
      _saveSettingsOverrides(overrides);
    };
    container.appendChild(el);
  }

  // Notification duration
  const durRow = document.createElement('div');
  durRow.className = 'menu-setting-row';
  const durations = { Short: 2000, Normal: 3500, Long: 6000 };
  const curDur = S.display.notificationDuration ?? 3500;
  const curLabel = Object.entries(durations).find(([,v]) => v === curDur)?.[0] ?? 'Normal';
  durRow.innerHTML = `<span class="menu-setting-label">Notif Duration</span>`;
  for (const [label, ms] of Object.entries(durations)) {
    const btn = document.createElement('button');
    btn.className = 'menu-setting-toggle' + (label === curLabel ? ' on' : '');
    btn.textContent = label;
    btn.style.marginLeft = '4px';
    btn.onclick = () => {
      S.display.notificationDuration = ms;
      durRow.querySelectorAll('.menu-setting-toggle').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      const overrides = _loadSettingsOverrides();
      overrides.notificationDuration = ms;
      _saveSettingsOverrides(overrides);
    };
    durRow.appendChild(btn);
  }
  container.appendChild(durRow);
}

function menuBuildSettingsSound() {
  const container = document.getElementById('menu-settings-sound');
  container.innerHTML = `<div class="menu-sound-placeholder">🔇 No audio yet — coming soon.</div>`;
}

let _listeningForKey = null;
function menuBuildSettingsKeybinds() {
  const container = document.getElementById('menu-settings-keybinds');
  container.innerHTML = '';
  const bindings = S.keybindings || {};
  for (const [action, key] of Object.entries(bindings)) {
    const row = document.createElement('div');
    row.className = 'menu-keybind-row';
    row.innerHTML = `
      <span class="menu-keybind-action">${action}</span>
      <button class="menu-keybind-key" data-action="${action}">${key}</button>`;
    row.querySelector('button').onclick = function() {
      if (_listeningForKey) {
        _listeningForKey.classList.remove('listening');
      }
      _listeningForKey = this;
      this.classList.add('listening');
      this.textContent = '...';
    };
    container.appendChild(row);
  }
}

document.addEventListener('keydown', e => {
  if (!_listeningForKey) return;
  e.preventDefault();
  const action = _listeningForKey.dataset.action;
  S.keybindings[action] = e.key === ' ' ? 'Space' : e.key;
  _listeningForKey.textContent = S.keybindings[action];
  _listeningForKey.classList.remove('listening');
  _listeningForKey = null;
  // Persist
  const overrides = _loadSettingsOverrides();
  overrides.keybindings = overrides.keybindings || {};
  overrides.keybindings[action] = S.keybindings[action];
  _saveSettingsOverrides(overrides);
}, true);  // capture so it runs before other keydown handlers

/* ─── Apply persisted settings overrides on load ─── */
(function applySettingsOverrides() {
  const overrides = _loadSettingsOverrides();
  if (overrides.showNotifications !== undefined) S.display.showNotifications = overrides.showNotifications;
  if (overrides.showDayBanner     !== undefined) S.display.showDayBanner     = overrides.showDayBanner;
  if (overrides.notificationDuration)            S.display.notificationDuration = overrides.notificationDuration;
  if (overrides.keybindings) Object.assign(S.keybindings, overrides.keybindings);
})();
```

**Step 2: Verify**

Open `index.html` → Settings tab. Toggle Notifications off → game notifications stop. Switch keybind for a tool → pressing new key activates the tool. Reload → overrides persist.

**Step 3: Commit**
```bash
git add menu.js
git commit -m "feat: settings panel (display toggles, sound placeholder, keybind rebinding)"
```

---

## Task 10: menu.js — ambient world (NPC + weather + time)

**Files:**
- Modify: `menu.js`

**Step 1: Add ambient world system to menu.js**

```js
/* ─── Ambient World ─── */
const AMBIENT = {
  tick: 0,
  weatherTimer: 0,
  weather: 'sunny',   // 'sunny' | 'overcast' | 'rain' | 'hail'
  // Slow camera pan
  panX: 0, panY: 0, panTargetX: 0, panTargetY: 0,
};

const AMBIENT_BOTS = [];   // holds simple bot state objects (not Robot instances)

const AMBIENT_CROPS = ['wheat', 'carrot', 'corn'];

function initAmbient() {
  // Run migration before anything else
  migrateSingleSlot();

  // Generate world (uses global `world`)
  generateWorld();

  // Seed a small tilled+planted area so bots have work immediately
  const cx = Math.floor(WW / 2), cy = Math.floor(WH / 2);
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      const tx = cx + dx, ty = cy + dy;
      if (!inBounds(tx, ty)) continue;
      if (world[ty][tx].type === 'grass' || world[ty][tx].type === 'flower') {
        world[ty][tx].type = 'tilled';
        const cropType = AMBIENT_CROPS[Math.floor(Math.random() * AMBIENT_CROPS.length)];
        world[ty][tx].crop = { type: cropType, stage: Math.floor(Math.random() * 3), watered: false };
      }
    }
  }

  // Two ambient bots
  AMBIENT_BOTS.push({ tx: cx - 2, ty: cy - 2, px: (cx-2)*TILE, py: (cy-2)*TILE, state: 'idle', timer: 0, crop: 'wheat' });
  AMBIENT_BOTS.push({ tx: cx + 2, ty: cy + 2, px: (cx+2)*TILE, py: (cy+2)*TILE, state: 'idle', timer: 30, crop: 'carrot' });

  // Camera centered on farm patch
  AMBIENT.panX = window.innerWidth/2  - (cx * TILE + TILE/2) * camera.zoom;
  AMBIENT.panY = window.innerHeight/2 - (cy * TILE + TILE/2) * camera.zoom;
  AMBIENT.panTargetX = AMBIENT.panX;
  AMBIENT.panTargetY = AMBIENT.panY;
  camera.x = AMBIENT.panX;
  camera.y = AMBIENT.panY;

  // Schedule weather roll
  AMBIENT.weatherTimer = 80 + Math.floor(Math.random() * 80);
}

function updateAmbient() {
  AMBIENT.tick++;

  // ─ Weather / time ─
  AMBIENT.weatherTimer--;
  if (AMBIENT.weatherTimer <= 0) {
    const roll = Math.random();
    AMBIENT.weather = roll < 0.45 ? 'sunny' : roll < 0.70 ? 'overcast' : roll < 0.90 ? 'rain' : 'hail';
    AMBIENT.weatherTimer = 80 + Math.floor(Math.random() * 80);
    isRaining = (AMBIENT.weather === 'rain' || AMBIENT.weather === 'hail');
  }

  // Accelerated time-of-day (drives sky tint in render)
  tick = (tick + 5) % TPDAY;

  // Gentle camera pan — drift toward a new target every ~10s
  if (AMBIENT.tick % 600 === 0) {
    const offsetX = (Math.random() - 0.5) * 4 * TILE * camera.zoom;
    const offsetY = (Math.random() - 0.5) * 4 * TILE * camera.zoom;
    AMBIENT.panTargetX = AMBIENT.panX + offsetX;
    AMBIENT.panTargetY = AMBIENT.panY + offsetY;
  }
  camera.x += (AMBIENT.panTargetX - camera.x) * 0.005;
  camera.y += (AMBIENT.panTargetY - camera.y) * 0.005;

  // ─ Ambient particle weather ─
  if (AMBIENT.weather === 'rain' || AMBIENT.weather === 'hail') {
    // Spawn rain particles (reuse existing particle system)
    const count = AMBIENT.weather === 'hail' ? 2 : 6;
    for (let i = 0; i < count; i++) {
      const px = camera.x + Math.random() * window.innerWidth;
      const py = -10;
      const wx = (px - camera.x) / camera.zoom;
      const wy = (py - camera.y) / camera.zoom;
      spawnParticle(wx, wy,
        AMBIENT.weather === 'hail' ? '#aaddff' : '#6699cc',
        AMBIENT.weather === 'hail' ? '❄' : '💧',
        { vx: (Math.random()-0.5)*0.5, vy: 2 + Math.random(), life: 40 }
      );
    }
  }

  // ─ Ambient bots ─
  for (const bot of AMBIENT_BOTS) {
    _updateAmbientBot(bot);
  }
}

function _updateAmbientBot(bot) {
  bot.timer--;
  if (bot.timer > 0) return;

  switch (bot.state) {
    case 'idle': {
      // Find something to do: harvest > water > plant > till
      const target = _ambientFindTarget(bot);
      if (target) {
        bot.targetTx = target.tx; bot.targetTy = target.ty; bot.targetAction = target.action;
        bot.state = 'moving'; bot.timer = 1;
      } else {
        bot.timer = 20;
      }
      break;
    }
    case 'moving': {
      const dx = bot.targetTx - bot.tx, dy = bot.targetTy - bot.ty;
      if (dx === 0 && dy === 0) { bot.state = 'acting'; bot.timer = 8; break; }
      // Step one tile closer
      if (Math.abs(dx) >= Math.abs(dy)) bot.tx += Math.sign(dx);
      else bot.ty += Math.sign(dy);
      bot.px = bot.tx * TILE; bot.py = bot.ty * TILE;
      bot.timer = 6;
      break;
    }
    case 'acting': {
      const tx = bot.targetTx, ty = bot.targetTy;
      if (!inBounds(tx, ty)) { bot.state = 'idle'; bot.timer = 5; break; }
      const tile = world[ty][tx];
      switch (bot.targetAction) {
        case 'harvest':
          tile.crop = null;
          break;
        case 'water':
          if (tile.crop) { tile.crop.watered = true; tile.watered = true; }
          break;
        case 'plant':
          if (tile.type === 'tilled' && !tile.crop) {
            tile.crop = { type: bot.crop, stage: 0, watered: false };
          }
          break;
        case 'till':
          if (tile.type === 'grass' || tile.type === 'flower') tile.type = 'tilled';
          break;
      }
      bot.state = 'idle'; bot.timer = 10;
      break;
    }
  }
}

function _ambientFindTarget(bot) {
  // Search nearby tiles for something to do
  const radius = 8;
  let best = null, bestDist = Infinity;
  const priority = { harvest: 0, water: 1, plant: 2, till: 3 };

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const tx = bot.tx + dx, ty = bot.ty + dy;
      if (!inBounds(tx, ty)) continue;
      const tile = world[ty][tx];
      let action = null;

      const cfg = tile.crop && S.crops[tile.crop.type];
      if (tile.crop && cfg && tile.crop.stage >= cfg.stages - 1) action = 'harvest';
      else if (tile.crop && !tile.crop.watered) action = 'water';
      else if (tile.type === 'tilled' && !tile.crop) action = 'plant';
      else if ((tile.type === 'grass' || tile.type === 'flower') && Math.random() < 0.02) action = 'till';

      if (!action) continue;
      const dist = Math.abs(dx) + Math.abs(dy);
      if (priority[action] < (best ? priority[best.action] : 99) ||
         (priority[action] === (best ? priority[best.action] : 99) && dist < bestDist)) {
        best = { tx, ty, action }; bestDist = dist;
      }
    }
  }
  return best;
}
```

**Step 2: Add ambient crop growth to updateAmbient()**

In `updateAmbient()`, just before the ambient bots loop, add:
```js
  // Slowly advance crop growth
  if (AMBIENT.tick % 120 === 0) {
    for (let ty = 0; ty < WH; ty++) {
      for (let tx = 0; tx < WW; tx++) {
        const tile = world[ty][tx];
        if (!tile.crop) continue;
        const cfg = S.crops[tile.crop.type];
        if (!cfg) continue;
        if (tile.crop.stage < cfg.stages - 1) tile.crop.stage++;
      }
    }
  }
```

**Step 3: Verify**

Open `index.html`. Behind the menu:
- Farm world visible with crops and two bots slowly moving and farming
- Weather changes over time (rain particles appear)
- Sky tint cycles through time-of-day
- No console errors

**Step 4: Commit**
```bash
git add menu.js
git commit -m "feat: ambient world NPC bots, weather cycle, time-of-day"
```

---

## Task 11: Wire init sequence — replace main.js bootstrap

**Files:**
- Modify: `main.js`

**Step 1: Replace the init block at the bottom of main.js**

Find and remove this entire block (from `window.addEventListener('resize', resize)` down to `loop()`):

```js
window.addEventListener('resize', resize);
resize();
generateWorld();

const loaded = loadGame();
if (!loaded) {
  notify('🌾 Welcome to Robo Farm! Press F for the guide.');
  notify('🌱 Start by tilling soil (key 2) and planting seeds!');
  rainDay = Math.random() < S.time.rainChance['Spring'];
  setTimeout(() => {
    openModal('changelog');
  }, 600);
} else {
  // Show changelog once per version update
  const lastSeen = localStorage.getItem('roboFarm_changelogSeen');
  if (lastSeen !== 'v0.2.1') {
    setTimeout(() => { openModal('changelog'); localStorage.setItem('roboFarm_changelogSeen', 'v0.2.1'); }, 400);
  }
}

// Place starter robots if any
for (let i = 0; i < S.player.startRobots; i++) {
  const bot = new Robot(S.player.startX + 2 + i, S.player.startY + 2);
  robots.push(bot);
}

// Camera init
camera.x = window.innerWidth/2 - (player.px + TILE/2) * camera.zoom;
camera.y = window.innerHeight/2 - (player.py + TILE/2) * camera.zoom;

updateUI();
loop();
```

Replace with:
```js
window.addEventListener('resize', resize);
resize();
initAmbient();   // menu.js: generates world, seeds bots, migrates old save
openMenu();      // menu.js: shows the title screen
loop();
```

**Step 2: Show changelog for returning players after game loads**

In `launchGame()` in menu.js, after `updateUI()`, add:
```js
    // Show changelog once per version for returning players
    if (!isNew) {
      const lastSeen = localStorage.getItem('roboFarm_changelogSeen');
      if (lastSeen !== 'v0.2.1') {
        setTimeout(() => { openModal('changelog'); localStorage.setItem('roboFarm_changelogSeen', 'v0.2.1'); }, 400);
      }
    }
```

**Step 3: Verify full flow**

Open `index.html`:
1. Title screen appears over ambient farm
2. New Game → Slot 1 → game starts, player can move and farm
3. Play a bit, close tab, reopen → Continue → slot loads correctly
4. Mid-game Escape → menu appears, game pauses
5. Escape again or "Back to Game" → game resumes
6. No console errors throughout

**Step 4: Commit**
```bash
git add main.js menu.js
git commit -m "feat: wire menu init, replace old bootstrap, changelog on resume"
```

---

## Task 12: Final polish pass

**Files:**
- Modify: `style.css` (minor tweaks if needed)
- Modify: `menu.js` (Continue button hide when playing as pause menu)

**Step 1: Hide Continue/New Game/Settings when menu is mid-game pause**

In `openMenu()` in menu.js, when `gameState === 'playing'` (before the flip to `'menu'`), hide the New Game button to prevent mid-game world reset:
```js
  const newGameBtn = document.querySelector('#menu-main .menu-buttons .menu-btn:nth-child(2)');
  if (newGameBtn && currentSlot > 0) newGameBtn.style.display = 'none';
```
And restore it on `closeMenu()` / when opening fresh:
```js
  const newGameBtn = document.querySelector('#menu-main .menu-buttons .menu-btn:nth-child(2)');
  if (newGameBtn) newGameBtn.style.display = '';
```

**Step 2: Apply persisted settings overrides on startup**

The `applySettingsOverrides()` IIFE in menu.js already runs on load. Verify that toggling notifications off, reloading, and launching game keeps notifications off.

**Step 3: Day banner guard**

In `loop.js`, find the day banner block:
```js
    const bannerEl = document.getElementById('day-banner');
    document.getElementById('day-banner-text').textContent = `Day ${day}`;
    ...
    bannerEl.classList.add('show');
    setTimeout(() => bannerEl.classList.remove('show'), 2500);
```
Wrap with:
```js
    if (S.display.showDayBanner !== false) {
      const bannerEl = document.getElementById('day-banner');
      document.getElementById('day-banner-text').textContent = `Day ${day}`;
      document.getElementById('day-banner-sub').textContent = `${SEASONS[season]} • ${rainDay ? '🌧 Rainy Day' : '☀️ Clear Day'}`;
      bannerEl.classList.add('show');
      setTimeout(() => bannerEl.classList.remove('show'), 2500);
    }
```

**Step 4: Full end-to-end verification**

Check all of these in the browser:
- [ ] Title screen shows with live ambient farm behind it
- [ ] Ambient bots farm (till, plant, water, harvest) continuously
- [ ] Weather changes (rain particles visible); time-of-day tints sky
- [ ] New Game → empty slot starts fresh game
- [ ] New Game → occupied slot shows overwrite confirm
- [ ] Overwrite confirm → Overwrite starts fresh; Cancel goes back to slot picker
- [ ] Continue → single save loads directly; multiple saves shows slot picker
- [ ] Slot card shows correct day/season/coins/robots/crops/savedAt/playtime
- [ ] Delete slot (✕) works with confirm; slot becomes empty
- [ ] Settings: notification toggle persists across reload
- [ ] Settings: keybind rebind works; new key activates the action
- [ ] Mid-game Escape opens menu (game paused); Escape again or Back to Game resumes
- [ ] New Game button hidden in mid-game pause menu
- [ ] v0.2.1 topbar button, changelog shows both entries
- [ ] Auto-save on day-end saves to active slot; reload + Continue restores correctly
- [ ] No console errors throughout

**Step 5: Commit**
```bash
git add style.css menu.js loop.js
git commit -m "feat: menu polish — pause mode, day banner toggle, settings persist"
```
