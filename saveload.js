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

/* compileRobotCode is defined above in the SECURE ROBOT CODE SANDBOX section */
function _compileRobotCode_placeholder() {}
