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
  document.body.classList.add('show-system-cursor');
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
  setTimeout(() => { screen.classList.add('hidden'); syncCursorMode(); }, 120);
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

    // Show changelog once per version for returning players
    if (!isNew) {
      const lastSeen = localStorage.getItem('roboFarm_changelogSeen');
      if (lastSeen !== 'v0.2.1') {
        setTimeout(() => { openModal('changelog'); localStorage.setItem('roboFarm_changelogSeen', 'v0.2.1'); }, 400);
      }
    }
  }, 120);
}

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
    const count = AMBIENT.weather === 'hail' ? 2 : 6;
    for (let i = 0; i < count; i++) {
      const sx = Math.random() * window.innerWidth;
      const wx = (sx - camera.x) / camera.zoom;
      const wy = (-10 - camera.y) / camera.zoom;
      particles.push({
        x: wx, y: wy,
        vx: (Math.random() - 0.5) * 0.5,
        vy: 2 + Math.random(),
        life: 1,
        color: AMBIENT.weather === 'hail' ? '#aaddff' : '#6699cc',
        size: AMBIENT.weather === 'hail' ? 3 : 2,
      });
    }
  }

  // ─ Slowly advance crop growth ─
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

  // ─ Ambient bots ─
  for (const bot of AMBIENT_BOTS) {
    _updateAmbientBot(bot);
  }

  updateParticles();
}

function _updateAmbientBot(bot) {
  bot.timer--;
  if (bot.timer > 0) return;

  switch (bot.state) {
    case 'idle': {
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
