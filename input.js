/* ═══════════════════════════════════════════════════════════════════════════
 * INPUT
 * ═══════════════════════════════════════════════════════════════════════════ */
const keys = {};
let mouseWorld = { x: 0, y: 0 };
let mouseScreen = { x: 0, y: 0 };
const _actionPressLatch = {};
const HOTBAR_TOOL_BY_CODE = {
  Digit1: 'hand',
  Digit2: 'hoe',
  Digit3: 'water',
  Digit9: 'robot_place',
};

function _bindingToCode(binding) {
  if (binding == null) return null;
  const raw = String(binding).trim();
  if (!raw) return null;
  if (raw === ' ') return 'Space';
  const lower = raw.toLowerCase();
  if (lower === 'space' || lower === 'spacebar') return 'Space';
  if (/^Key[A-Z]$/.test(raw)) return raw;
  if (/^Digit[0-9]$/.test(raw)) return raw;
  if (/^Arrow(Up|Down|Left|Right)$/.test(raw)) return raw;
  if (/^F([1-9]|1[0-2])$/i.test(raw)) return raw.toUpperCase();
  if (/^(Escape|Tab|Enter|Backspace|ShiftLeft|ShiftRight|ControlLeft|ControlRight|AltLeft|AltRight)$/.test(raw)) return raw;
  if (raw.length === 1 && /[a-zA-Z]/.test(raw)) return `Key${raw.toUpperCase()}`;
  if (raw.length === 1 && /[0-9]/.test(raw)) return `Digit${raw}`;
  return null;
}

function _eventMatchesAction(e, actionName, fallbackCodes = []) {
  const binding = S.keybindings?.[actionName];
  const configuredCode = _bindingToCode(binding);
  if (configuredCode && e.code === configuredCode) return true;
  return fallbackCodes.includes(e.code);
}

function isActionDown(actionName, fallbackCodes = []) {
  const binding = S.keybindings?.[actionName];
  const configuredCode = _bindingToCode(binding);
  if (configuredCode && keys[configuredCode]) return true;
  return fallbackCodes.some(code => keys[code]);
}

function consumeActionPress(actionName) {
  if (!_actionPressLatch[actionName]) return false;
  _actionPressLatch[actionName] = false;
  return true;
}

function clearInputActionLatches() {
  for (const key of Object.keys(_actionPressLatch)) _actionPressLatch[key] = false;
}

function _markActionPress(actionName) {
  _actionPressLatch[actionName] = true;
}

function _selectHotbarSeedByIndex(idx) {
  const seeds = Array.isArray(window.hotbarSeedTypes) ? window.hotbarSeedTypes : [];
  const cropType = seeds[idx];
  if (cropType) selectTool(cropType);
}

function _isTypingTarget(target) {
  if (!target) return false;
  const tag = String(target.tagName || '').toUpperCase();
  if (target.isContentEditable) return true;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

function _isModalOpen(id) {
  const modal = document.getElementById(`modal-${id}`);
  return !!modal && !modal.classList.contains('hidden');
}

function _toggleModal(id) {
  if (_isModalOpen(id)) closeModal(id);
  else openModal(id);
}

document.addEventListener('keydown', e => {
  if (e.defaultPrevented) return;
  if (typeof isMenuVisible === 'function' && isMenuVisible()) {
    if (e.code === 'Escape' && typeof menuHandleEscape === 'function') {
      e.preventDefault();
      menuHandleEscape();
    }
    return;
  }
  if (_isTypingTarget(e.target) && e.code !== 'Escape') return;
  keys[e.code] = true;
  if (HOTBAR_TOOL_BY_CODE[e.code]) {
    selectTool(HOTBAR_TOOL_BY_CODE[e.code]);
    return;
  }
  if (e.code === 'Digit4') { _selectHotbarSeedByIndex(0); return; }
  if (e.code === 'Digit5') { _selectHotbarSeedByIndex(1); return; }
  if (e.code === 'Digit6') { _selectHotbarSeedByIndex(2); return; }
  if (e.code === 'Digit7') { _selectHotbarSeedByIndex(3); return; }
  if (e.code === 'Digit8') { _selectHotbarSeedByIndex(4); return; }

  // One-shot actions should not retrigger while key repeat is active.
  if (e.repeat) return;

  if (_eventMatchesAction(e, 'shop', ['KeyE'])) _toggleModal('shop');
  else if (_eventMatchesAction(e, 'robots', ['KeyR'])) _toggleModal('robots');
  else if (_eventMatchesAction(e, 'help', ['KeyF'])) _toggleModal('docs');
  else if (_eventMatchesAction(e, 'inventory', ['KeyI'])) _toggleModal('inventory');
  else if (e.code === 'KeyG') _toggleModal('economy');
  else if (e.code === 'KeyC' && typeof runFarmTurnoverLoop === 'function') runFarmTurnoverLoop();
  else if (e.code === 'KeyX') {
    openModal('shop');
    switchTab('shop', 'sell');
  }
  else if (_eventMatchesAction(e, 'interact', ['Space'])) _markActionPress('interact');
  else if (e.code === 'KeyV') _markActionPress('vehicleToggle');
  else if (e.code === 'F5' && gameState === 'playing' && currentSlot > 0) {
    e.preventDefault();
    if (typeof saveGame === 'function') saveGame(currentSlot);
  }
  else if (e.code === 'Escape') {
    const gazetteEl = document.getElementById('gazette-overlay');
    if (gazetteEl && !gazetteEl.classList.contains('hidden')) {
      if (typeof closeGazette === 'function') closeGazette();
    } else {
      const hasOpenModal = !!document.querySelector('.modal-overlay:not(.hidden)');
      if (hasOpenModal) {
        closeAllModals();
        cancelAssign();
      } else if (typeof menuHandleEscape === 'function') {
        menuHandleEscape();
      }
    }
  }
});
document.addEventListener('keyup', e => {
  keys[e.code] = false;
  if (_isTypingTarget(e.target)) return;
});

const canvas = document.getElementById('game');
const cursorCanvas = document.getElementById('cursor-canvas');
const cc = cursorCanvas.getContext('2d');

document.addEventListener('mousemove', e => {
  mouseScreen = { x: e.clientX, y: e.clientY };
  updateCursorCanvas();
});

canvas.addEventListener('mousemove', e => {
  const wx = (e.clientX - camera.x) / camera.zoom;
  const wy = (e.clientY - camera.y) / camera.zoom;
  mouseWorld = { x: wx, y: wy };
  updateCropTooltip(e.clientX, e.clientY);
});

canvas.addEventListener('click', e => {
  const tx = Math.floor(mouseWorld.x / TILE);
  const ty = Math.floor(mouseWorld.y / TILE);
  handleTileClick(tx, ty, e);
});

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  camera.zoom = Math.max(0.5, Math.min(3.0, camera.zoom - e.deltaY * 0.001));
}, { passive: false });
