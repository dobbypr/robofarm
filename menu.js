/* ═══════════════════════════════════════════════════════════════════════════
 * MENU SCREEN
 * ═══════════════════════════════════════════════════════════════════════════ */

/* ─── Menu state ─── */
const MENU_FLOW = {
  view: 'main',
  slotMode: 'new',
  settingsDirty: false,
  pendingViewAfterSettings: null,
  pendingOverwriteSlot: null,
  transitionLock: false,
};

let menuPauseMode = false;
let ambientActive = false;
let MENU_SETTINGS_DRAFT = null;
let MENU_SETTINGS_SNAPSHOT = null;

function isMenuVisible() {
  const screen = document.getElementById('menu-screen');
  return !!screen && !screen.classList.contains('hidden');
}

function _menuBeginTransition() {
  if (MENU_FLOW.transitionLock) return false;
  MENU_FLOW.transitionLock = true;
  return true;
}

function _menuEndTransition() {
  MENU_FLOW.transitionLock = false;
}

function _menuActivateView(name) {
  document.querySelectorAll('.menu-view').forEach(v => v.classList.remove('active'));
  const el = document.getElementById(`menu-${name}`);
  if (el) el.classList.add('active');
}

function menuShowView(name) {
  menuSetView(name);
}

function menuSetView(name, opts = {}) {
  const force = !!opts.force;
  const fromView = MENU_FLOW.view;

  if (!force && fromView === 'settings' && name !== 'settings' && MENU_FLOW.settingsDirty) {
    MENU_FLOW.pendingViewAfterSettings = name;
    MENU_FLOW.view = 'settings-confirm';
    _menuActivateView('settings-confirm');
    menuBuildSettingsConfirm();
    _menuUpdateSettingsHint();
    return;
  }

  MENU_FLOW.view = name;
  if (name === 'new-game') MENU_FLOW.slotMode = 'new';
  if (name === 'load-game') MENU_FLOW.slotMode = 'load';
  _menuActivateView(name);

  if (name === 'new-game') menuBuildSlots('new');
  if (name === 'load-game') menuBuildSlots('load');
  if (name === 'settings') {
    if (fromView !== 'settings' && fromView !== 'settings-confirm') _menuStartSettingsDraft();
    menuBuildSettings();
    _menuUpdateSettingsHint();
  }
  if (name === 'settings-confirm') menuBuildSettingsConfirm();
}

/* ─── Open / close menu overlay ─── */

function openMenu() {
  if (MENU_FLOW.transitionLock) return;
  const screen = document.getElementById('menu-screen');
  screen.classList.remove('hidden', 'fade-out');
  document.body.classList.add('show-system-cursor');
  if (S.display.menuColorThemes !== false) {
    const tintEl = document.getElementById('menu-tint');
    if (tintEl) {
      tintEl.classList.add('active');
      tintEl.style.backgroundColor = getMenuTint();
    }
  }
  MENU_FLOW.pendingViewAfterSettings = null;
  menuSetView('main', { force: true });
  const wasPlaying = gameState === 'playing';
  if (wasPlaying) {
    menuPauseMode = true;
    gameState = 'menu';
    const continueBtn = document.getElementById('menu-btn-continue');
    if (continueBtn) {
      continueBtn.style.display = 'block';
      continueBtn.innerHTML = '▶&nbsp; BACK TO GAME';
      continueBtn.onclick = resumeGame;
    }
    const newGameBtn = document.getElementById('menu-btn-new-game');
    if (newGameBtn) newGameBtn.style.display = 'none';
    const settingsBtn = document.getElementById('menu-btn-settings');
    if (settingsBtn) settingsBtn.style.display = '';
    const quitBtn = document.getElementById('menu-btn-quit');
    if (quitBtn) { quitBtn.textContent = 'QUIT TO TITLE'; quitBtn.onclick = menuQuitToTitle; }
  } else {
    menuPauseMode = false;
    _menuStartSettingsDraft();
    const continueBtn = document.getElementById('menu-btn-continue');
    if (continueBtn) {
      continueBtn.innerHTML = '▶&nbsp; CONTINUE';
      continueBtn.onclick = menuContinue;
    }
    const quitBtn = document.getElementById('menu-btn-quit');
    if (quitBtn) { quitBtn.textContent = 'QUIT'; quitBtn.onclick = menuQuit; }
    const newGameBtn = document.getElementById('menu-btn-new-game');
    if (newGameBtn) newGameBtn.style.display = '';
    const settingsBtn = document.getElementById('menu-btn-settings');
    if (settingsBtn) settingsBtn.style.display = '';
    menuRefreshContinueBtn();
  }
}

function closeMenu(onClosed) {
  const screen = document.getElementById('menu-screen');
  screen.classList.add('fade-out');
  document.getElementById('menu-tint')?.classList.remove('active');
  const newGameBtn = document.getElementById('menu-btn-new-game');
  if (newGameBtn) newGameBtn.style.display = '';
  setTimeout(() => {
    screen.classList.add('hidden');
    syncCursorMode();
    if (typeof onClosed === 'function') onClosed();
  }, 120);
}

function resumeGame() {
  if (!menuPauseMode) return;
  if (!_menuBeginTransition()) return;
  menuPauseMode = false;
  ambientActive = false;
  gameState = 'playing';
  closeMenu(() => _menuEndTransition());
}

function menuQuitToTitle() {
  if (!_menuBeginTransition()) return;
  if (!confirm('Quit to title screen? Current game will be saved.')) { _menuEndTransition(); return; }
  if (currentSlot > 0) saveGame(currentSlot);
  if (typeof closeAllModals === 'function') closeAllModals();
  if (typeof cancelAssign === 'function') cancelAssign();
  _clearInputLatchState();
  menuPauseMode = false;
  gameState = 'menu';
  initAmbient();
  const continueBtn = document.getElementById('menu-btn-continue');
  if (continueBtn) {
    continueBtn.innerHTML = '▶&nbsp; CONTINUE';
    continueBtn.onclick = menuContinue;
  }
  const quitBtn = document.getElementById('menu-btn-quit');
  if (quitBtn) { quitBtn.textContent = 'QUIT'; quitBtn.onclick = menuQuit; }
  const newGameBtn = document.getElementById('menu-btn-new-game');
  if (newGameBtn) newGameBtn.style.display = '';
  const settingsBtn = document.getElementById('menu-btn-settings');
  if (settingsBtn) settingsBtn.style.display = '';
  menuSetView('main', { force: true });
  menuRefreshContinueBtn();
  _menuEndTransition();
}

function menuQuit() {
  menuShowView('quit');
}

/* ─── Continue button visibility ─── */
function menuRefreshContinueBtn() {
  const btn = document.getElementById('menu-btn-continue');
  if (!btn) return;
  if (menuPauseMode) { btn.style.display = 'block'; return; }
  const hasSave = [1,2,3].some(s => getSlotMeta(s) !== null);
  btn.style.display = hasSave ? 'block' : 'none';
}

function menuContinue() {
  if (menuPauseMode) { resumeGame(); return; }
  const saves = [1,2,3].filter(s => getSlotMeta(s) !== null);
  if (saves.length === 0) {
    menuShowView('new-game');
  } else if (saves.length === 1) {
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
  MENU_FLOW.slotMode = mode;
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
  menuBuildSlots(MENU_FLOW.slotMode === 'load' ? 'load' : 'new');
  menuRefreshContinueBtn();
}

function menuConfirmOverwrite(slot, meta) {
  MENU_FLOW.pendingOverwriteSlot = slot;
  const seasonName = (S.time.seasons || SEASONS)[meta.season % (S.time.seasons || SEASONS).length];
  document.getElementById('menu-confirm-msg').textContent =
    `Slot ${slot}: Day ${meta.day}, ${seasonName}, ${meta.coins} coins`;
  const okBtn = document.getElementById('menu-confirm-ok');
  okBtn.onclick = () => launchGame(slot, true);
  menuSetView('confirm');
}

function menuCancelOverwrite() {
  const nextView = MENU_FLOW.slotMode === 'load' ? 'load-game' : 'new-game';
  menuSetView(nextView, { force: true });
}

/* ─── Launch game ─── */
let menuLaunchInFlight = false;

function _clearInputLatchState() {
  if (typeof keys === 'object' && keys) {
    for (const k of Object.keys(keys)) keys[k] = false;
  }
  if (typeof mouseIsDown !== 'undefined') mouseIsDown = false;
  if (typeof _listeningForKey !== 'undefined' && _listeningForKey) {
    _listeningForKey.classList.remove('listening');
    _listeningForKey = null;
  }
  assigningWorkArea = false;
  selectedRobotId = null;
  if (typeof configRobotId !== 'undefined') configRobotId = null;
  if (typeof invSelectedCrop !== 'undefined') invSelectedCrop = null;
}

function _resetPlayerToSpawn() {
  player.tileX = S.player.startX;
  player.tileY = S.player.startY;
  player.px = S.player.startX * TILE;
  player.py = S.player.startY * TILE;
  player.facingX = 0;
  player.facingY = 1;
  player.moving = false;
  player.frame = 0;
  player.frameTimer = 0;
}

function _emptyOwnedRobots() {
  const owned = {};
  for (const key of Object.keys(ROBOT_TYPES)) owned[key] = 0;
  if (!('basic' in owned)) owned.basic = 0;
  return owned;
}

function _buildFreshGameState() {
  coins = S.player.startCoins;
  day = 1;
  tick = 0;
  season = 0;
  isRaining = false;
  rainDay = Math.random() < (S.time.rainChance?.Spring ?? 0.2);

  inventory = { seeds: {}, crops: {} };
  for (const [k, v] of Object.entries(S.player.startSeeds || {})) inventory.seeds[k] = v;

  robotsOwned = _emptyOwnedRobots();
  pendingRobotType = ROBOT_TYPES.basic ? 'basic' : (Object.keys(ROBOT_TYPES)[0] || 'basic');
  currentTool = 'hand';

  robots = [];
  nextRobotId = 1;
  playtime = 0;
  productionStats = { history: [], today: { income:0, harvested:0, robotHarvests:0, cropBreakdown:{} } };
  COMPANIES.rfs.price = COMPANIES.rfs.basePrice;
  COMPANIES.rfs.priceHistory = [];
  COMPANIES.rfs.sharesOwned = 0;
  COMPANIES.bupop.price = COMPANIES.bupop.basePrice;
  COMPANIES.bupop.priceHistory = [];
  COMPANIES.bupop.sharesOwned = 0;

  generateWorld();
  _resetPlayerToSpawn();

  // Starter robots
  for (let i = 0; i < S.player.startRobots; i++) {
    robots.push(new Robot(S.player.startX + 2 + i, S.player.startY + 2));
  }

  if (typeof particles !== 'undefined') particles = [];
  if (typeof cropTick !== 'undefined') cropTick = 0;
  if (typeof selectTool === 'function') selectTool('hand');
}

function launchGame(slot, isNew) {
  if (menuLaunchInFlight) return;
  if (!_menuBeginTransition()) return;
  menuLaunchInFlight = true;

  const screen = document.getElementById('menu-screen');
  screen.classList.add('fade-out');

  setTimeout(() => {
    try {
      screen.classList.add('hidden');
      document.getElementById('menu-tint')?.classList.remove('active');
      document.body.classList.remove('show-system-cursor');
      if (typeof closeAllModals === 'function') closeAllModals();
      if (typeof cancelAssign === 'function') cancelAssign();
      _clearInputLatchState();
      if (typeof syncCursorMode === 'function') syncCursorMode();
      ambientActive = false;

      let launchedAsNew = isNew;
      if (isNew) {
        _buildFreshGameState();
        notify('🌾 Welcome to Robo Farm! Press F for the guide.');
        notify('🌱 Start by tilling soil (key 2) and planting seeds!');
      } else {
        generateWorld();
        const loaded = loadGameSlot(slot);
        if (!loaded) {
          launchedAsNew = true;
          _buildFreshGameState();
          notify(`⚠️ Slot ${slot} could not be loaded. Started a fresh world instead.`);
        }
      }

      currentSlot = slot;
      menuPauseMode = false;
      gameState = 'playing';

      // Camera
      camera.x = window.innerWidth/2 - (player.px + TILE/2) * camera.zoom;
      camera.y = window.innerHeight/2 - (player.py + TILE/2) * camera.zoom;

      updateUI();
      saveGame(slot);

      // Show welcome gazette on day 1 for fresh games
      if (launchedAsNew && day === 1) {
        setTimeout(() => { if (typeof showGazette === 'function') showGazette(); }, 500);
      }

      // Show changelog once per version for returning players
      if (!launchedAsNew) {
        const lastSeen = localStorage.getItem('roboFarm_changelogSeen');
        if (lastSeen !== 'v0.2.3') {
          setTimeout(() => { openModal('changelog'); localStorage.setItem('roboFarm_changelogSeen', 'v0.2.3'); }, 400);
        }
      }
    } catch (err) {
      console.error('Launch failed:', err);
      menuPauseMode = false;
      gameState = 'menu';
      screen.classList.remove('hidden', 'fade-out');
      notify('❌ Launch failed. Returned to menu.');
    } finally {
      menuLaunchInFlight = false;
      _menuEndTransition();
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

function _menuReadRuntimeSettings() {
  return {
    showNotifications: !!S.display.showNotifications,
    showDayBanner: S.display.showDayBanner !== false,
    menuColorThemes: S.display.menuColorThemes !== false,
    notificationDuration: S.display.notificationDuration ?? 3500,
    keybindings: { ...(S.keybindings || {}) },
  };
}

function _menuCloneSettingsData(src) {
  return {
    showNotifications: !!src.showNotifications,
    showDayBanner: !!src.showDayBanner,
    menuColorThemes: !!src.menuColorThemes,
    notificationDuration: src.notificationDuration ?? 3500,
    keybindings: { ...(src.keybindings || {}) },
  };
}

function _menuApplySettingsRuntime(data) {
  S.display.showNotifications = !!data.showNotifications;
  S.display.showDayBanner = !!data.showDayBanner;
  S.display.menuColorThemes = !!data.menuColorThemes;
  S.display.notificationDuration = data.notificationDuration ?? 3500;
  S.keybindings = S.keybindings || {};
  Object.assign(S.keybindings, data.keybindings || {});
  const tintEl = document.getElementById('menu-tint');
  if (tintEl) tintEl.classList.toggle('active', S.display.menuColorThemes !== false);
}

function _menuStartSettingsDraft() {
  if (_listeningForKey) {
    _listeningForKey.classList.remove('listening');
    _listeningForKey = null;
  }
  MENU_SETTINGS_SNAPSHOT = _menuReadRuntimeSettings();
  MENU_SETTINGS_DRAFT = _menuCloneSettingsData(MENU_SETTINGS_SNAPSHOT);
  MENU_FLOW.settingsDirty = false;
  MENU_FLOW.pendingViewAfterSettings = null;
  _menuUpdateSettingsHint();
}

function _menuMarkSettingsDirty() {
  MENU_FLOW.settingsDirty = true;
  _menuUpdateSettingsHint();
}

function _menuUpdateSettingsHint() {
  const hint = document.getElementById('menu-settings-dirty-hint');
  if (!hint) return;
  if (MENU_FLOW.settingsDirty) {
    hint.textContent = 'Unsaved changes';
    hint.classList.add('dirty');
  } else {
    hint.textContent = '';
    hint.classList.remove('dirty');
  }
}

function menuCommitSettingsDraft() {
  if (!MENU_SETTINGS_DRAFT) return;
  _menuApplySettingsRuntime(MENU_SETTINGS_DRAFT);
  const overrides = _loadSettingsOverrides();
  overrides.showNotifications = MENU_SETTINGS_DRAFT.showNotifications;
  overrides.showDayBanner = MENU_SETTINGS_DRAFT.showDayBanner;
  overrides.menuColorThemes = MENU_SETTINGS_DRAFT.menuColorThemes;
  overrides.notificationDuration = MENU_SETTINGS_DRAFT.notificationDuration;
  overrides.keybindings = { ...(MENU_SETTINGS_DRAFT.keybindings || {}) };
  _saveSettingsOverrides(overrides);
  MENU_SETTINGS_SNAPSHOT = _menuCloneSettingsData(MENU_SETTINGS_DRAFT);
  MENU_FLOW.settingsDirty = false;
  _menuUpdateSettingsHint();
}

function menuDiscardSettingsDraft() {
  if (!MENU_SETTINGS_SNAPSHOT) return;
  _menuApplySettingsRuntime(MENU_SETTINGS_SNAPSHOT);
  MENU_SETTINGS_DRAFT = _menuCloneSettingsData(MENU_SETTINGS_SNAPSHOT);
  MENU_FLOW.settingsDirty = false;
  _menuUpdateSettingsHint();
}

function menuSettingsPromptAction(action) {
  if (_listeningForKey) {
    _listeningForKey.classList.remove('listening');
    _listeningForKey = null;
  }
  if (action === 'save') menuCommitSettingsDraft();
  if (action === 'discard') menuDiscardSettingsDraft();
  if (action === 'cancel') {
    menuSetView('settings', { force: true });
    return;
  }
  const nextView = MENU_FLOW.pendingViewAfterSettings || 'main';
  MENU_FLOW.pendingViewAfterSettings = null;
  menuSetView(nextView, { force: true });
}

function menuBuildSettingsConfirm() {
  const hint = document.getElementById('menu-settings-confirm-msg');
  if (!hint) return;
  hint.textContent = MENU_FLOW.pendingViewAfterSettings
    ? `Save settings before going to ${MENU_FLOW.pendingViewAfterSettings.replace('-', ' ')}?`
    : 'Save settings changes?';
}

function menuBuildSettings() {
  if (!MENU_SETTINGS_DRAFT) _menuStartSettingsDraft();
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
  if (!MENU_SETTINGS_DRAFT) return;

  const rows = [
    { label: 'Notifications', key: 'showNotifications' },
    { label: 'Day Banner', key: 'showDayBanner' },
    { label: 'Color Themes', key: 'menuColorThemes' },
  ];

  for (const row of rows) {
    const el = document.createElement('div');
    el.className = 'menu-setting-row';
    const val = !!MENU_SETTINGS_DRAFT[row.key];
    el.innerHTML = `
      <span class="menu-setting-label">${row.label}</span>
      <button class="menu-setting-toggle ${val ? 'on' : ''}" data-key="${row.key}">
        ${val ? 'ON' : 'OFF'}
      </button>`;
    el.querySelector('button').onclick = function() {
      const current = !!MENU_SETTINGS_DRAFT[row.key];
      MENU_SETTINGS_DRAFT[row.key] = !current;
      _menuApplySettingsRuntime(MENU_SETTINGS_DRAFT);
      this.textContent = !current ? 'ON' : 'OFF';
      this.classList.toggle('on', !current);
      _menuMarkSettingsDirty();
    };
    container.appendChild(el);
  }

  // Notification duration
  const durRow = document.createElement('div');
  durRow.className = 'menu-setting-row';
  const durations = { Short: 2000, Normal: 3500, Long: 6000 };
  const curDur = MENU_SETTINGS_DRAFT.notificationDuration ?? 3500;
  const curLabel = Object.entries(durations).find(([,v]) => v === curDur)?.[0] ?? 'Normal';
  durRow.innerHTML = `<span class="menu-setting-label">Notif Duration</span>`;
  for (const [label, ms] of Object.entries(durations)) {
    const btn = document.createElement('button');
    btn.className = 'menu-setting-toggle' + (label === curLabel ? ' on' : '');
    btn.textContent = label;
    btn.style.marginLeft = '4px';
    btn.onclick = () => {
      MENU_SETTINGS_DRAFT.notificationDuration = ms;
      _menuApplySettingsRuntime(MENU_SETTINGS_DRAFT);
      durRow.querySelectorAll('.menu-setting-toggle').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      _menuMarkSettingsDirty();
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
  if (!MENU_SETTINGS_DRAFT) return;
  const bindings = MENU_SETTINGS_DRAFT.keybindings || {};
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
  const key = e.key === ' ' ? 'Space' : e.key;
  MENU_SETTINGS_DRAFT.keybindings[action] = key;
  _menuApplySettingsRuntime(MENU_SETTINGS_DRAFT);
  _menuMarkSettingsDirty();
  _listeningForKey.textContent = key;
  _listeningForKey.classList.remove('listening');
  _listeningForKey = null;
}, true);  // capture so it runs before other keydown handlers

/* ─── Apply persisted settings overrides on load ─── */
(function applySettingsOverrides() {
  const overrides = _loadSettingsOverrides();
  if (overrides.showNotifications !== undefined) S.display.showNotifications = !!overrides.showNotifications;
  if (overrides.showDayBanner !== undefined) S.display.showDayBanner = !!overrides.showDayBanner;
  if (overrides.menuColorThemes !== undefined) S.display.menuColorThemes = !!overrides.menuColorThemes;
  if (overrides.notificationDuration) S.display.notificationDuration = overrides.notificationDuration;
  if (overrides.keybindings) Object.assign(S.keybindings, overrides.keybindings);
  _menuStartSettingsDraft();
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

const AMBIENT_CROPS = Object.keys(S.crops || {});

function initAmbient() {
  ambientActive = true;
  // Run migration before anything else
  migrateSingleSlot();
  AMBIENT.tick = 0;
  AMBIENT.weather = 'sunny';
  AMBIENT_BOTS.length = 0;
  if (typeof particles !== 'undefined') particles = [];
  isRaining = false;

  // Generate world (uses global `world`)
  generateWorld();

  // Seed a small tilled+planted area so bots have work immediately
  const cx = Math.floor(WW / 2), cy = Math.floor(WH / 2);
  const cropPool = AMBIENT_CROPS.length > 0 ? AMBIENT_CROPS : ['wheat'];
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      const tx = cx + dx, ty = cy + dy;
      if (!inBounds(tx, ty)) continue;
      if (world[ty][tx].type === 'grass' || world[ty][tx].type === 'flower') {
        world[ty][tx].type = 'tilled';
        const cropType = cropPool[Math.floor(Math.random() * cropPool.length)];
        world[ty][tx].crop = {
          type: cropType,
          stage: Math.floor(Math.random() * 3),
          growTimer: 0,
          waterCount: 0,
          watered: false,
        };
      }
    }
  }

  // Two ambient bots
  AMBIENT_BOTS.push({ tx: cx - 2, ty: cy - 2, px: (cx-2)*TILE, py: (cy-2)*TILE, state: 'idle', timer: 0, crop: cropPool[0] || 'wheat' });
  AMBIENT_BOTS.push({ tx: cx + 2, ty: cy + 2, px: (cx+2)*TILE, py: (cy+2)*TILE, state: 'idle', timer: 30, crop: cropPool[1] || cropPool[0] || 'wheat' });

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
  if (!ambientActive) return;
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

  // Drive the CSS tint div
  if (S.display.menuColorThemes !== false) {
    const tintEl = document.getElementById('menu-tint');
    if (tintEl) tintEl.style.backgroundColor = getMenuTint();
  }
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
            tile.crop = { type: bot.crop, stage: 0, growTimer: 0, waterCount: 0, watered: false };
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

/* ─── Menu color themes ─── */
const MENU_THEMES = [
  { name: 'rainbow',  hsl: t => [t * 0.3 % 360, 80, 55] },
  { name: 'noir',     hsl: () => [220,  5, 45] },
  { name: 'crimson',  hsl: () => [355, 85, 50] },
  { name: 'ocean',    hsl: () => [210, 90, 50] },
  { name: 'toxic',    hsl: () => [115, 85, 42] },
  { name: 'amethyst', hsl: () => [275, 75, 55] },
  { name: 'inferno',  hsl: t => [15 + Math.sin(t * 0.05) * 12, 95, 55] },
];
const _THEME_HOLD = 480;   // ticks at full intensity (~8s)
const _THEME_FADE = 60;    // ticks for crossfade (~1s)
const _THEME_CYCLE = _THEME_HOLD + _THEME_FADE;

function getMenuTint() {
  const t = AMBIENT.tick;
  const slot = Math.floor(t / _THEME_CYCLE);
  const phase = t % _THEME_CYCLE;
  const cur = MENU_THEMES[slot % MENU_THEMES.length];
  const nxt = MENU_THEMES[(slot + 1) % MENU_THEMES.length];

  const blend = phase < _THEME_HOLD ? 0 : (phase - _THEME_HOLD) / _THEME_FADE;
  const [h1, s1, l1] = cur.hsl(t);
  const [h2, s2, l2] = nxt.hsl(t);

  // Shortest-path hue lerp
  let hd = h2 - h1;
  if (hd > 180) hd -= 360;
  if (hd < -180) hd += 360;
  const h = (h1 + hd * blend + 360) % 360;
  const s = s1 + (s2 - s1) * blend;
  const l = l1 + (l2 - l1) * blend;

  return `hsl(${h.toFixed(1)}, ${s.toFixed(1)}%, ${l.toFixed(1)}%)`;
}

/* ─── Escape routing ─── */
function menuHandleEscape() {
  const screen = document.getElementById('menu-screen');
  if (!screen) return false;
  const isHidden = screen.classList.contains('hidden');

  if (!isHidden) {
    if (MENU_FLOW.view === 'settings-confirm') {
      menuSettingsPromptAction('cancel');
      return true;
    }
    if (MENU_FLOW.view !== 'main') {
      menuSetView('main');
      return true;
    }
    if (menuPauseMode) {
      resumeGame();
      return true;
    }
    return true;
  }

  if (gameState === 'playing') {
    openMenu();
    return true;
  }
  return false;
}
