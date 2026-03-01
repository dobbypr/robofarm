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
