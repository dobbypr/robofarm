/* ═══════════════════════════════════════════════════════════════════════════
 * SAVE / LOAD
 * ═══════════════════════════════════════════════════════════════════════════ */
function saveGame() {
  const save = buildSaveObject();
  try {
    localStorage.setItem('roboFarm_save', JSON.stringify(save));
    const flash = document.getElementById('save-flash');
    if (flash) { flash.style.opacity = '1'; setTimeout(() => flash.style.opacity = '0', 1200); }
  } catch(e) { notify('❌ Save failed!'); }
}

function loadGame() {
  try {
    const raw = localStorage.getItem('roboFarm_save');
    if (!raw) return false;
    const save = JSON.parse(raw);
    if (save.v !== 2) { localStorage.removeItem('roboFarm_save'); return false; }
    applyGameSave(save);
    return true;
  } catch(e) { console.warn('Load failed', e); return false; }
}

/* compileRobotCode is defined above in the SECURE ROBOT CODE SANDBOX section */
function _compileRobotCode_placeholder() {}
