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
