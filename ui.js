/* ═══════════════════════════════════════════════════════════════════════════
 * UI
 * ═══════════════════════════════════════════════════════════════════════════ */
const _UI_UPDATE_INTERVAL = Math.max(1, Math.floor(Number(S.display?.uiUpdateIntervalTicks) || 4));
const _UI_STATE = {
  lastTick: -1,
  lastSig: '',
  refs: null,
  seedRefs: {},
  robotLabelRef: null,
};

function _uiRefs() {
  if (_UI_STATE.refs) return _UI_STATE.refs;
  _UI_STATE.refs = {
    coins: document.getElementById('stat-coins'),
    day: document.getElementById('stat-day'),
    season: document.getElementById('stat-season'),
    time: document.getElementById('stat-time'),
  };
  return _UI_STATE.refs;
}

function _uiRefreshRefs() {
  const seedTypes = ['wheat', 'carrot', 'corn', 'sunflower', 'potato'];
  const nextSeedRefs = {};
  for (const type of seedTypes) {
    nextSeedRefs[type] = document.getElementById(`cnt-${type}`);
  }
  _UI_STATE.seedRefs = nextSeedRefs;
  _UI_STATE.robotLabelRef = document.querySelector('[data-tool="robot_place"] .lbl');
}

function _uiTimeBucket() {
  const dp = tick / TPDAY;
  if (dp < 0.2) return 0;
  if (dp < 0.5) return 1;
  if (dp < 0.7) return 2;
  return 3;
}

function _uiTimeLabel(bucket) {
  return bucket === 0 ? '🌄 Dawn' : bucket === 1 ? '☀️ Day' : bucket === 2 ? '🌇 Dusk' : '🌙 Night';
}

function _uiSignature() {
  const seedTypes = ['wheat', 'carrot', 'corn', 'sunflower', 'potato'];
  let sig = `${coins}|${day}|${season}|${_uiTimeBucket()}|${rainDay ? 1 : 0}|${pendingRobotType || 'basic'}`;
  for (const type of seedTypes) sig += `|${inventory.seeds[type] || 0}`;
  return sig;
}

function updateUI(force = true) {
  const frameTick = (typeof playtime === 'number') ? playtime : animTime;
  if (!force && frameTick - _UI_STATE.lastTick < _UI_UPDATE_INTERVAL) return;

  const sig = _uiSignature();
  if (!force && sig === _UI_STATE.lastSig) {
    _UI_STATE.lastTick = frameTick;
    return;
  }

  const refs = _uiRefs();
  _UI_STATE.lastSig = sig;
  _UI_STATE.lastTick = frameTick;

  if (refs.coins) refs.coins.textContent = coins;
  if (refs.day) refs.day.textContent = day;
  if (refs.season) refs.season.textContent = SEASONS[season % SEASONS.length];
  if (refs.time) refs.time.textContent = _uiTimeLabel(_uiTimeBucket());

  if (!_UI_STATE.robotLabelRef || Object.keys(_UI_STATE.seedRefs).length === 0) _uiRefreshRefs();
  for (const type of ['wheat', 'carrot', 'corn', 'sunflower', 'potato']) {
    const el = _UI_STATE.seedRefs[type];
    if (el) el.textContent = inventory.seeds[type] || '';
  }
  // Update robot hotbar slot to show pending type
  const rbSlot = _UI_STATE.robotLabelRef;
  if (rbSlot) {
    const _rtd = ROBOT_TYPES[pendingRobotType] || ROBOT_TYPES.basic;
    rbSlot.textContent = _rtd.name.split(' ')[0];
  }
  checkMilestones();
}

window.requestUIUpdate = () => updateUI(true);

function selectTool(tool) {
  currentTool = tool;
  document.querySelectorAll('.hslot').forEach(el => el.classList.remove('selected'));
  const el = document.querySelector(`[data-tool="${tool}"]`);
  if (el) el.classList.add('selected');
}

/* ─── NOTIFICATIONS ─── */
const notifQueue = [];
function notify(msg) {
  if (!S.display.showNotifications) return;
  const el = document.createElement('div');
  el.className = 'notif';
  el.textContent = msg;
  document.getElementById('notifications').prepend(el);
  setTimeout(() => { el.classList.add('fade'); setTimeout(() => el.remove(), 400); }, S.display.notificationDuration);
}

/* ─── MODALS ─── */
function openModal(id) {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  document.getElementById(`modal-${id}`).classList.remove('hidden');
  document.getElementById('crop-tooltip').style.display = 'none';
  syncCursorMode();
  if (id === 'shop') { buildShop(); buildSellGrid(); }
  if (id === 'robots') buildRobotList();
  if (id === 'files') openFilesModal();
  if (id === 'economy') setTimeout(refreshEconomyUI, 0);
  if (id === 'inventory') buildInventoryModal();
}
function closeModal(id) { document.getElementById(`modal-${id}`).classList.add('hidden'); syncCursorMode(); }
function closeAllModals() { document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden')); syncCursorMode(); }
function syncCursorMode() {
  const hasOpenModal = !!document.querySelector('.modal-overlay:not(.hidden)');
  document.body.classList.toggle('show-system-cursor', hasOpenModal);
  updateCursorCanvas();
}

function switchTab(modal, tab) {
  const m = document.getElementById(`modal-${modal}`);
  m.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  m.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  m.querySelector(`#${modal}-tab-${tab}`)?.classList.add('active');
  const btn = [...m.querySelectorAll('.tab-btn')].find(b => b.textContent.toLowerCase().includes(tab.split('_')[0]));
  if (btn) btn.classList.add('active');
}

/* ─── SHOP ─── */
function buildShop() {
  const grid = document.getElementById('seed-shop-grid');
  grid.innerHTML = '';
  for (const [type, cfg] of Object.entries(S.crops)) {
    const price = S.economy.seedPrices[type] || 5;
    const owned = inventory.seeds[type] || 0;
    const el = document.createElement('div');
    el.className = 'shop-item';
    el.innerHTML = `<span class="item-emoji">${cfg.emoji}</span><span class="item-name">${type}</span><span class="item-price">${price} coins/ea</span><span class="item-qty">Owned: ${owned} seeds</span>`;
    el.onclick = (e) => buySeeds(type, e.shiftKey ? 1 : 5);
    grid.appendChild(el);
  }
  const eGrid = document.getElementById('equipment-robot-grid');
  if (eGrid) {
    eGrid.innerHTML = '';
    for (const [key, td] of Object.entries(ROBOT_TYPES)) {
      const owned = robotsOwned[key] || 0;
      const isPending = pendingRobotType === key;
      const el = document.createElement('div');
      el.className = 'shop-item' + (isPending ? ' selected' : '');
      if (isPending) el.style.borderColor = 'var(--gold)';
      el.innerHTML = `
        <span class="item-emoji">${td.emoji}</span>
        <span class="item-name">${td.name}</span>
        <span class="item-price">${td.cost} coins</span>
        <span class="item-qty">Owned: ${owned}${isPending ? ' ✦' : ''}</span>
        <span class="item-tags">
          <span class="item-tag ${key}">CAP ${td.invCapacity}</span>
          <span class="item-tag ${key}">${td.invSlots} SLOTS</span>
          ${td.canScavenge ? `<span class="item-tag rust">SCAVENGES</span>` : ''}
        </span>
        <span class="item-desc">${td.description}</span>`;
      el.onclick = () => buyRobot(key);
      eGrid.appendChild(el);
    }
  }
}

function buildSellGrid() {
  const grid = document.getElementById('sell-grid');
  grid.innerHTML = '';
  const hasCrops = Object.entries(inventory.crops).filter(([,v]) => v > 0);
  if (hasCrops.length === 0) {
    grid.innerHTML = '<div style="color:var(--text-dim);font-size:15px;padding:12px">No crops to sell yet. Get farming! 🌱</div>';
    return;
  }
  for (const [type, qty] of hasCrops) {
    const cfg = S.crops[type];
    const price = getCropPrice(type);
    const el = document.createElement('div');
    el.className = 'sell-item';
    el.innerHTML = `<span class="item-emoji">${cfg.emoji}</span><div class="sell-info"><div class="name">${type}</div><div class="count">${qty} units · ${price} ea</div></div><button class="sell-btn" onclick="sellCrop('${type}')">SELL</button>`;
    grid.appendChild(el);
  }
}

/* ─── INVENTORY ─── */
const PLAYER_INV_SLOTS = 12;
const PLAYER_INV_MAX = 45;
const ROBOT_INV_CAPACITY = 32;
const ROBOT_INV_SLOTS = 3;
let invSelectedCrop = null;

function buildInventoryModal() {
  _buildPlayerGrid();
  _buildRobotList();
  const total = Object.values(inventory.crops).reduce((s,v) => s + v, 0);
  const slots = Object.keys(inventory.crops).filter(k => (inventory.crops[k]||0) > 0).length;
  const el = document.getElementById('inv-summary');
  if (el) el.textContent = `${total} items · ${slots}/${PLAYER_INV_SLOTS} types`;
}

function _buildPlayerGrid() {
  const grid = document.getElementById('inv-player-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const crops = Object.entries(inventory.crops).filter(([,v]) => v > 0);
  const slotEl = document.getElementById('inv-slot-count');
  if (slotEl) slotEl.textContent = `${crops.length}/${PLAYER_INV_SLOTS} slots`;
  for (let i = 0; i < PLAYER_INV_SLOTS; i++) {
    const el = document.createElement('div');
    if (i < crops.length) {
      const [type, qty] = crops[i];
      const cfg = S.crops[type];
      const isSel = invSelectedCrop === type;
      el.className = 'inv-slot filled' + (isSel ? ' selected-send' : '');
      el.title = isSel ? `Click again to deselect · ${qty}× ${type}` : `${qty}× ${type} — click to send to a robot`;
      el.innerHTML = `<span class="is-emoji">${cfg?.emoji||'?'}</span><span class="is-count">${qty}</span><span class="is-name">${type}</span>`;
      el.onclick = () => { invSelectedCrop = invSelectedCrop === type ? null : type; buildInventoryModal(); };
    } else {
      el.className = 'inv-slot empty';
      el.textContent = '·';
    }
    grid.appendChild(el);
  }
}

function _buildRobotList() {
  const list = document.getElementById('inv-robots-list');
  if (!list) return;
  list.innerHTML = '';
  if (robots.length === 0) {
    list.innerHTML = '<div style="color:var(--text-dim);font-size:14px;padding:6px">No robots placed yet.</div>';
    return;
  }
  for (const bot of robots) {
    const cropEntries = Object.entries(bot.inventory.crops).filter(([,v]) => v > 0);
    const held = cropEntries.reduce((s,[,v]) => s + v, 0);
    const cap = bot.invCapacity || ROBOT_INV_CAPACITY;
    const slots = bot.invSlots || ROBOT_INV_SLOTS;
    const pct = Math.min(100, held / cap * 100);
    let slotsHTML = '';
    for (let i = 0; i < slots; i++) {
      if (i < cropEntries.length) {
        const [type, qty] = cropEntries[i];
        const cfg = S.crops[type];
        slotsHTML += `<div class="inv-robot-slot has-item">${cfg?.emoji||'?'}<br><span style="font-family:'Press Start 2P',monospace;font-size:6px;color:var(--gold)">${qty}</span></div>`;
      } else {
        slotsHTML += `<div class="inv-robot-slot" style="color:#333">—</div>`;
      }
    }
    const canGive = invSelectedCrop && (inventory.crops[invSelectedCrop]||0) > 0;
    const canCollect = held > 0;
    const _invTd = ROBOT_TYPES[bot.type] || ROBOT_TYPES.basic;
    const _typeColor = bot.type==='rust'?'#cc8844':bot.type==='pro'?'#60a0e0':'var(--text-dim)';
    const el = document.createElement('div');
    el.className = 'inv-robot-row';
    el.innerHTML = `
      <div style="font-size:22px">${_invTd.emoji}</div>
      <div style="flex:1;min-width:0">
        <div style="color:var(--text);font-size:15px;margin-bottom:3px">${bot.name} <span style="color:${_typeColor};font-size:12px">[${_invTd.name}]</span></div>
        <div class="inv-robot-slots">${slotsHTML}</div>
        <div class="inv-cap-bar"><div class="inv-cap-fill${pct>=90?' warn':''}" style="width:${pct}%"></div></div>
        <div style="color:var(--text-dim);font-size:11px;margin-top:2px">${held}/${cap} held</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">
        ${canGive ? `<button class="game-btn primary" onclick="sendCropToRobot(${bot.id})" style="font-size:6px;padding:5px 7px">GIVE ▶</button>` : ''}
        ${canCollect ? `<button class="game-btn success" onclick="collectRobotCrops(${bot.id})" style="font-size:6px;padding:5px 7px">COLLECT</button>` : ''}
      </div>`;
    list.appendChild(el);
  }
}

function sortInventory() {
  const sorted = Object.entries(inventory.crops).filter(([,v]) => v > 0).sort((a,b) => b[1] - a[1]);
  inventory.crops = Object.fromEntries(sorted);
  buildInventoryModal();
}

function sendCropToRobot(robotId) {
  if (!invSelectedCrop) return;
  const bot = robots.find(r => r.id === robotId);
  if (!bot) return;
  const qty = inventory.crops[invSelectedCrop] || 0;
  if (qty <= 0) { notify(`❌ No ${invSelectedCrop} to send!`); return; }
  const held = Object.values(bot.inventory.crops).reduce((s,v) => s + v, 0);
  const cap = bot.invCapacity || ROBOT_INV_CAPACITY;
  const slotCount = Object.keys(bot.inventory.crops).filter(k => (bot.inventory.crops[k]||0) > 0).length;
  const slots = bot.invSlots || ROBOT_INV_SLOTS;
  if (!(bot.inventory.crops[invSelectedCrop] > 0) && slotCount >= slots) { notify(`⚠️ ${bot.name} has no free slots!`); return; }
  const space = cap - held;
  if (space <= 0) { notify(`⚠️ ${bot.name} inventory full!`); return; }
  const send = Math.min(qty, space);
  inventory.crops[invSelectedCrop] -= send;
  if (inventory.crops[invSelectedCrop] <= 0) delete inventory.crops[invSelectedCrop];
  bot.inventory.crops[invSelectedCrop] = (bot.inventory.crops[invSelectedCrop] || 0) + send;
  notify(`📦 Sent ${send}× ${S.crops[invSelectedCrop]?.emoji||''} ${invSelectedCrop} → ${bot.name}`);
  invSelectedCrop = null;
  buildInventoryModal(); updateUI();
}

function collectRobotCrops(robotId) {
  const bot = robots.find(r => r.id === robotId);
  if (!bot) return;
  let collected = 0;
  for (const [type, qty] of Object.entries(bot.inventory.crops)) {
    if (qty <= 0) continue;
    const playerTypes = Object.keys(inventory.crops).filter(k => (inventory.crops[k]||0) > 0);
    if (!(inventory.crops[type] > 0) && playerTypes.length >= PLAYER_INV_SLOTS) { notify(`⚠️ Bag full! Sell some crops first.`); continue; }
    const space = PLAYER_INV_MAX - (inventory.crops[type] || 0);
    const take = Math.min(qty, Math.max(0, space));
    inventory.crops[type] = (inventory.crops[type] || 0) + take;
    bot.inventory.crops[type] -= take;
    collected += take;
  }
  if (collected > 0) { notify(`📦 Collected ${collected} crops from ${bot.name}!`); buildInventoryModal(); updateUI(); }
}

/* ─── ROBOT LIST ─── */
let configRobotId = null;

function buildRobotList() {
  const list = document.getElementById('robot-list');
  list.innerHTML = '';
  if (robots.length === 0) {
    list.innerHTML = '<div style="color:var(--text-dim);font-size:15px;padding:12px">No robots placed yet! Buy one at the Shop and place it with the Robot tool (key 9). 🤖</div>';
    document.getElementById('robot-config-panel').classList.remove('visible');
    return;
  }
  for (const bot of robots) {
    const td = ROBOT_TYPES[bot.type] || ROBOT_TYPES.basic;
    const bPct = bot.battery / (bot.batteryMax ?? S.robots.batteryMax) * 100;
    const rustBar = bot.type === 'rust' ? 'background:#cc7700' : '';
    const el = document.createElement('div');
    el.className = 'robot-list-item' + (bot.id === configRobotId ? ' selected' : '');
    el.innerHTML = `<span class="robot-icon">${td.emoji}</span><div class="robot-info"><div class="robot-name">${bot.name} <span class="rtag ${bot.type}">${td.name}</span> <span style="color:var(--text-dim);font-size:12px">[${bot.behavior}]</span></div><div class="robot-status">${bot.state} · ${bot.assignedCrop}</div><div class="battery-bar"><div class="battery-fill ${bPct < 20 ? 'low' : ''}" style="width:${bPct}%;${rustBar}"></div></div></div>`;
    el.onclick = () => selectConfigRobot(bot.id);
    list.appendChild(el);
  }

  if (configRobotId || selectedRobotId) {
    const id = configRobotId || selectedRobotId;
    selectConfigRobot(id);
  }
}

function selectConfigRobot(id) {
  configRobotId = id;
  selectedRobotId = id;
  const bot = robots.find(r => r.id === id);
  if (!bot) return;

  const panel = document.getElementById('robot-config-panel');
  panel.classList.add('visible');
  const _td = ROBOT_TYPES[bot.type] || ROBOT_TYPES.basic;
  document.getElementById('config-robot-name').textContent = `${bot.name}  [${_td.name}]`;

  // Build behavior select
  const bs = document.getElementById('robot-behavior-select');
  bs.innerHTML = '';
  const allB = { ...builtinBehaviors, ...(S.customBehaviors || {}) };
  for (const name of Object.keys(allB)) {
    const opt = document.createElement('option');
    opt.value = name; opt.textContent = name;
    if (name === bot.behavior) opt.selected = true;
    bs.appendChild(opt);
  }

  document.getElementById('robot-crop-select').value = bot.assignedCrop || 'wheat';
  document.getElementById('robot-area-display').textContent = bot.workArea ? `(${bot.workArea.x}, ${bot.workArea.y}) r=${bot.workArea.radius}` : 'Not set';
  document.getElementById('robot-code-editor').value = bot.customCode || '';
  document.getElementById('code-error-msg').textContent = bot.codeError || '';

  document.querySelectorAll('.robot-list-item').forEach((el, i) => {
    el.classList.toggle('selected', robots[i]?.id === id);
  });
}

function applyRobotBehavior() {
  const bot = robots.find(r => r.id === configRobotId);
  if (bot) { bot.behavior = document.getElementById('robot-behavior-select').value; notify(`🤖 ${bot.name} behavior: ${bot.behavior}`); }
}

function applyRobotCrop() {
  const bot = robots.find(r => r.id === configRobotId);
  if (bot) { bot.assignedCrop = document.getElementById('robot-crop-select').value; }
}

function saveRobotCode() {
  const bot = robots.find(r => r.id === configRobotId);
  if (!bot) return;
  bot.customCode = document.getElementById('robot-code-editor').value;
  compileRobotCode(bot);
  if (bot.codeError) {
    document.getElementById('code-error-msg').textContent = `❌ ${bot.codeError}`;
    notify(`❌ Code error in ${bot.name}: ${bot.codeError}`);
  } else {
    document.getElementById('code-error-msg').textContent = '';
    notify(`✅ ${bot.name} custom code saved!`);
  }
}

function clearRobotCode() {
  const bot = robots.find(r => r.id === configRobotId);
  if (!bot) return;
  bot.customCode = ''; bot.compiledCode = null; bot.codeError = '';
  document.getElementById('robot-code-editor').value = '';
  document.getElementById('code-error-msg').textContent = '';
  notify(`🗑 ${bot.name} code cleared.`);
}

function deleteSelectedRobot() {
  const idx = robots.findIndex(r => r.id === configRobotId);
  if (idx === -1) return;
  const bot = robots[idx];
  if (!confirm(`Remove ${bot.name}? It will be returned to your inventory.`)) return;
  robotsOwned++; robots.splice(idx, 1);
  configRobotId = null; selectedRobotId = null;
  document.getElementById('robot-config-panel').classList.remove('visible');
  notify(`🤖 ${bot.name} returned to inventory.`);
  buildRobotList();
}

function startSetWorkArea() {
  closeAllModals();
  assigningWorkArea = true;
  document.getElementById('assign-overlay').classList.add('visible');
}

function cancelAssign() {
  assigningWorkArea = false;
  document.getElementById('assign-overlay').classList.remove('visible');
}
