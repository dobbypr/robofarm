/* ═══════════════════════════════════════════════════════════════════════════
 * UI
 * ═══════════════════════════════════════════════════════════════════════════ */
const _UI_UPDATE_INTERVAL = Math.max(1, Math.floor(Number(S.display?.uiUpdateIntervalTicks) || 4));
const _UI_STATE = {
  lastTick: -1,
  lastSig: '',
  refs: null,
  seedRefs: {},
  cropRefs: {},
  slotRefs: {},
  robotLabelRef: null,
};

function _uiRefs() {
  if (_UI_STATE.refs) return _UI_STATE.refs;
  _UI_STATE.refs = {
    coins: document.getElementById('stat-coins'),
    day: document.getElementById('stat-day'),
    season: document.getElementById('stat-season'),
    time: document.getElementById('stat-time'),
    weather: document.getElementById('stat-weather'),
  };
  return _UI_STATE.refs;
}

function _uiRefreshHotbarRefs() {
  const seedTypes = Array.isArray(window.hotbarSeedTypes) ? window.hotbarSeedTypes : [];
  const nextSeedRefs = {};
  const nextCropRefs = {};
  const nextSlotRefs = {};
  for (const type of seedTypes) {
    nextSeedRefs[type] = document.getElementById(`cnt-seed-${type}`);
    nextCropRefs[type] = document.getElementById(`cnt-crop-${type}`);
    nextSlotRefs[type] = document.querySelector(`#hotbar [data-tool="${type}"]`);
  }
  _UI_STATE.seedRefs = nextSeedRefs;
  _UI_STATE.cropRefs = nextCropRefs;
  _UI_STATE.slotRefs = nextSlotRefs;
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

function _uiSignature(seedTypes) {
  const weatherKey = (typeof weatherType === 'string' && weatherType) ? weatherType : (rainDay ? 'rain' : 'clear');
  let sig = `${coins}|${day}|${season}|${_uiTimeBucket()}|${weatherKey}|${pendingRobotType || 'basic'}`;
  for (const type of seedTypes) {
    sig += `|${inventory.seeds[type] || 0},${inventory.crops[type] || 0}`;
  }
  return sig;
}

function updateUI(force = true) {
  const frameTick = (typeof playtime === 'number') ? playtime : animTime;
  const seedTypes = Array.isArray(window.hotbarSeedTypes) ? window.hotbarSeedTypes : [];
  if (!force && frameTick - _UI_STATE.lastTick < _UI_UPDATE_INTERVAL) return;

  const sig = _uiSignature(seedTypes);
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
  const weatherEl = refs.weather;
  if (weatherEl) {
    weatherEl.textContent = (typeof getWeatherSummary === 'function')
      ? getWeatherSummary()
      : (rainDay ? '🌧 Rain' : '☀️ Clear');
  }

  if (!_UI_STATE.robotLabelRef || Object.keys(_UI_STATE.seedRefs).length !== seedTypes.length) _uiRefreshHotbarRefs();
  for (const type of seedTypes) {
    const seedQty = inventory.seeds[type] || 0;
    const cropQty = inventory.crops[type] || 0;
    const seedEl = _UI_STATE.seedRefs[type];
    const cropEl = _UI_STATE.cropRefs[type];
    if (seedEl) seedEl.textContent = seedQty > 0 ? seedQty : '';
    if (cropEl) cropEl.textContent = cropQty > 0 ? cropQty : '';
    const slotEl = _UI_STATE.slotRefs[type];
    if (slotEl) {
      slotEl.classList.toggle('depleted', seedQty <= 0);
      slotEl.title = `${seedQty} seeds · ${cropQty} crops`;
    }
  }
  // Update robot hotbar slot to show pending type
  const rbSlot = _UI_STATE.robotLabelRef;
  if (rbSlot) {
    const _rtd = ROBOT_TYPES[pendingRobotType] || ROBOT_TYPES.basic;
    rbSlot.textContent = _rtd.name.split(' ')[0];
  }
  if (typeof updateGoalsUI === 'function') updateGoalsUI();
  checkMilestones();
}

window.requestUIUpdate = () => updateUI(true);

window.hotbarSeedTypes = [];

function buildHotbar() {
  const hotbar = document.getElementById('hotbar');
  if (!hotbar) return;

  const entries = [
    { key: '1', tool: 'hand', icon: '✋', label: 'Hand', seed: false },
    { key: '2', tool: 'hoe', icon: '⛏️', label: 'Hoe', seed: false },
    { key: '3', tool: 'water', icon: '💧', label: 'Water', seed: false },
  ];

  const seedTypes = Object.keys(S.crops || {}).slice(0, 5);
  window.hotbarSeedTypes = seedTypes;
  for (let i = 0; i < seedTypes.length; i++) {
    const type = seedTypes[i];
    const cfg = S.crops[type] || {};
    entries.push({
      key: String(4 + i),
      tool: type,
      icon: cfg.emoji || '🌱',
      label: (cfg.name || type).slice(0, 7),
      seed: true,
    });
  }

  entries.push({ key: '9', tool: 'robot_place', icon: '🤖', label: 'Bot', seed: false });

  hotbar.innerHTML = entries.map(entry => {
    const cls = entry.seed ? 'hslot seed-slot' : 'hslot';
    const selected = currentTool === entry.tool ? ' selected' : '';
    const count = entry.seed
      ? `<span class="count seed-count" id="cnt-seed-${entry.tool}">0</span><span class="count crop-count" id="cnt-crop-${entry.tool}">0</span>`
      : '';
    return `<div class="${cls}${selected}" data-tool="${entry.tool}" onclick="selectTool('${entry.tool}')"><span class="key-hint">${entry.key}</span>${entry.icon}<span class="lbl">${entry.label}</span>${count}</div>`;
  }).join('');
  _uiRefreshHotbarRefs();
  _UI_STATE.lastSig = '';
}

buildHotbar();

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
  const modal = document.getElementById(`modal-${id}`);
  if (!modal) return;
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  modal.classList.remove('hidden');
  const tooltip = document.getElementById('crop-tooltip');
  if (tooltip) tooltip.style.display = 'none';
  syncCursorMode();
  if (id === 'shop') { buildShop(); buildSellGrid(); }
  if (id === 'robots') buildRobotList();
  if (id === 'files') openFilesModal();
  if (id === 'economy') setTimeout(refreshEconomyUI, 0);
  if (id === 'inventory') buildInventoryModal();
}
function closeModal(id) {
  const modal = document.getElementById(`modal-${id}`);
  if (!modal) return;
  modal.classList.add('hidden');
  if (id === 'inventory') _clearInventoryDragState();
  syncCursorMode();
}
function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  _clearInventoryDragState();
  syncCursorMode();
}
function syncCursorMode() {
  const hasOpenModal = !!document.querySelector('.modal-overlay:not(.hidden)');
  document.body.classList.toggle('show-system-cursor', hasOpenModal);
  updateCursorCanvas();
}

function switchTab(modal, tab) {
  const m = document.getElementById(`modal-${modal}`);
  if (!m) return;
  m.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  m.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  m.querySelector(`#${modal}-tab-${tab}`)?.classList.add('active');
  const btn = [...m.querySelectorAll('.tab-btn')].find(b => b.textContent.toLowerCase().includes(tab.split('_')[0]));
  if (btn) btn.classList.add('active');
}

/* ─── SHOP ─── */
function _getSeedBuyQty(type, e) {
  const price = Math.max(1, S.economy.seedPrices[type] || 5);
  if (e?.altKey) return Math.max(1, Math.floor(coins / price));
  if (e?.ctrlKey || e?.metaKey) return 25;
  if (e?.shiftKey) return 1;
  return 5;
}

function buildShop() {
  const grid = document.getElementById('seed-shop-grid');
  grid.innerHTML = '';
  for (const [type, cfg] of Object.entries(S.crops)) {
    const price = S.economy.seedPrices[type] || 5;
    const owned = inventory.seeds[type] || 0;
    const el = document.createElement('div');
    el.className = 'shop-item';
    el.innerHTML = `<span class="item-emoji">${cfg.emoji}</span><span class="item-name">${type}</span><span class="item-price">${price} coins/ea</span><span class="item-qty">Owned: ${owned} seeds</span>`;
    el.onclick = (e) => buySeeds(type, _getSeedBuyQty(type, e));
    grid.appendChild(el);
  }
  const eGrid = document.getElementById('equipment-robot-grid');
  if (eGrid) {
    eGrid.innerHTML = '';
    for (const [key, td] of Object.entries(ROBOT_TYPES)) {
      const owned = robotsOwned[key] || 0;
      const vouchers = Math.max(0, Math.floor(Number(robotVouchers?.[key]) || 0));
      const finalCost = vouchers > 0 ? 0 : td.cost;
      const isPending = pendingRobotType === key;
      const el = document.createElement('div');
      el.className = 'shop-item' + (isPending ? ' selected' : '');
      if (isPending) el.style.borderColor = 'var(--gold)';
      el.innerHTML = `
        <span class="item-emoji">${td.emoji}</span>
        <span class="item-name">${td.name}</span>
        <span class="item-price">${finalCost} coins${vouchers > 0 ? ' (voucher)' : ''}</span>
        <span class="item-qty">Owned: ${owned}${isPending ? ' ✦' : ''}${vouchers > 0 ? ` · Vouchers: ${vouchers}` : ''}</span>
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
    const cfg = S.crops[type] || null;
    const price = getCropPrice(type);
    const emoji = cfg?.emoji || '❔';
    const label = cfg?.name || type;
    const el = document.createElement('div');
    el.className = 'sell-item';
    el.innerHTML = `<span class="item-emoji">${emoji}</span><div class="sell-info"><div class="name">${label}</div><div class="count">${qty} units · ${price} ea</div></div><button class="sell-btn" onclick="sellCrop('${type}')">SELL</button>`;
    grid.appendChild(el);
  }
}

/* ─── INVENTORY ─── */
const PLAYER_SEED_SLOTS = 12;
const PLAYER_INV_SLOTS = 12;
const PLAYER_INV_MAX = 45;
const ROBOT_INV_CAPACITY = 32;
const ROBOT_INV_SLOTS = 3;
let invSelectedStack = null;
let invDragPayload = null;
const _findRobotById = id => RF_UTIL.getRobotById(id, robots);

function _sumDict(dict) {
  return Object.values(dict || {}).reduce((s, v) => s + (Number(v) || 0), 0);
}

function _activeEntryList(dict) {
  return Object.entries(dict || {})
    .filter(([, qty]) => (qty || 0) > 0)
    .sort((a, b) => b[1] - a[1]);
}

function _normalizePlayerInventory() {
  if (!inventory || typeof inventory !== 'object') inventory = { seeds: {}, crops: {} };
  if (!inventory.seeds || typeof inventory.seeds !== 'object') inventory.seeds = {};
  if (!inventory.crops || typeof inventory.crops !== 'object') inventory.crops = {};
}

function _ensureRobotInventory(bot) {
  if (!bot.inventory || typeof bot.inventory !== 'object') bot.inventory = { seeds: {}, crops: {}, harvestSeeds: {} };
  if (!bot.inventory.seeds || typeof bot.inventory.seeds !== 'object') bot.inventory.seeds = {};
  if (!bot.inventory.crops || typeof bot.inventory.crops !== 'object') bot.inventory.crops = {};
  if (!bot.inventory.harvestSeeds || typeof bot.inventory.harvestSeeds !== 'object') bot.inventory.harvestSeeds = {};
}

function _robotSnapshot(bot) {
  _ensureRobotInventory(bot);
  const seedEntries = _activeEntryList(bot.inventory.seeds);
  const cropEntries = _activeEntryList(bot.inventory.crops);
  const seedTotal = _sumDict(bot.inventory.seeds);
  const cropTotal = _sumDict(bot.inventory.crops);
  const total = seedTotal + cropTotal;
  const cap = bot.invCapacity || ROBOT_INV_CAPACITY;
  const slots = bot.invSlots || ROBOT_INV_SLOTS;
  const usedSlots = seedEntries.length + cropEntries.length;
  return { seedEntries, cropEntries, seedTotal, cropTotal, total, cap, slots, usedSlots };
}

function _isInvSelection(kind, cropType) {
  return !!invSelectedStack && invSelectedStack.kind === kind && invSelectedStack.cropType === cropType;
}

function _setInvSelection(kind, cropType) {
  if (_isInvSelection(kind, cropType)) invSelectedStack = null;
  else invSelectedStack = { kind, cropType };
}

function _isInventoryModalOpen() {
  const modal = document.getElementById('modal-inventory');
  return !!modal && !modal.classList.contains('hidden');
}

function _bindInventoryHotbarDragSources() {
  const slots = document.querySelectorAll('#hotbar .hslot.seed-slot');
  for (const slot of slots) {
    if (slot.dataset.invDragBound === '1') continue;
    slot.dataset.invDragBound = '1';
    slot.draggable = true;
    slot.addEventListener('dragstart', e => {
      if (!_isInventoryModalOpen()) { e.preventDefault(); return; }
      const cropType = slot.dataset.tool;
      if (!cropType) return;
      invDragPayload = { kind: 'hotbar-seed', cropType };
      document.body.classList.add('inv-drag-active');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', JSON.stringify(invDragPayload));
      slot.classList.add('dragging');
    });
    slot.addEventListener('dragend', () => {
      slot.classList.remove('dragging');
      _clearInventoryDragState();
    });
  }
}

function _clearInventoryDragState() {
  invDragPayload = null;
  document.body.classList.remove('inv-drag-active');
  document.querySelectorAll('.drag-target').forEach(el => el.classList.remove('drag-target'));
}

function _readInventoryDragPayload(e) {
  if (invDragPayload) return invDragPayload;
  const raw = e?.dataTransfer?.getData('text/plain');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch (_) {
    return null;
  }
}

function _canDropOnPlayerGrid(payload) {
  return payload?.kind === 'robot-crop';
}

function _canDropOnPlayerSeedGrid(payload) {
  return payload?.kind === 'robot-seed' || payload?.kind === 'hotbar-seed';
}

function _canDropOnRobotRow(payload) {
  return payload?.kind === 'player-crop' || payload?.kind === 'player-seed' || payload?.kind === 'hotbar-seed';
}

function buildInventoryModal() {
  _normalizePlayerInventory();
  _bindInventoryHotbarDragSources();
  _buildPlayerSeedGrid();
  _buildPlayerGrid();
  _buildRobotList();
  const cropTotal = _sumDict(inventory.crops);
  const seedTotal = _sumDict(inventory.seeds);
  const cropSlots = _activeEntryList(inventory.crops).length;
  const el = document.getElementById('inv-summary');
  if (el) el.textContent = `${cropTotal} crops · ${seedTotal} seeds`;
  const cropSlotEl = document.getElementById('inv-crop-slot-count');
  if (cropSlotEl) cropSlotEl.textContent = `${cropSlots}/${PLAYER_INV_SLOTS} slots`;
  const seedSlotEl = document.getElementById('inv-seed-slot-count');
  if (seedSlotEl) seedSlotEl.textContent = `${Math.min(_activeEntryList(inventory.seeds).length, PLAYER_SEED_SLOTS)}/${PLAYER_SEED_SLOTS} slots`;
}

function _buildPlayerSeedGrid() {
  const grid = document.getElementById('inv-player-seed-grid');
  if (!grid) return;
  grid.classList.remove('drag-target');
  grid.ondragover = e => {
    const payload = _readInventoryDragPayload(e);
    if (!_canDropOnPlayerSeedGrid(payload)) return;
    e.preventDefault();
    grid.classList.add('drag-target');
  };
  grid.ondragleave = () => grid.classList.remove('drag-target');
  grid.ondrop = e => {
    const payload = _readInventoryDragPayload(e);
    grid.classList.remove('drag-target');
    if (!_canDropOnPlayerSeedGrid(payload)) return;
    e.preventDefault();
    if (payload.kind === 'robot-seed') {
      const got = collectRobotSeedToPlayer(payload.robotId, payload.cropType, { notifySingle: true });
      if (got > 0) { buildInventoryModal(); updateUI(); }
    } else if (payload.kind === 'hotbar-seed') {
      selectTool(payload.cropType);
      if ((inventory.seeds[payload.cropType] || 0) > 0) {
        invSelectedStack = { kind: 'seed', cropType: payload.cropType };
        notify(`🎯 ${payload.cropType} seeds selected.`);
      } else {
        invSelectedStack = null;
        notify(`🎯 ${payload.cropType} selected on hotbar.`);
      }
      buildInventoryModal();
    }
    _clearInventoryDragState();
  };

  grid.innerHTML = '';
  const seeds = _activeEntryList(inventory.seeds);
  for (let i = 0; i < PLAYER_SEED_SLOTS; i++) {
    const el = document.createElement('div');
    if (i < seeds.length) {
      const [type, qty] = seeds[i];
      const cfg = S.crops[type];
      const isSel = _isInvSelection('seed', type);
      el.className = 'inv-slot filled seed-stack' + (isSel ? ' selected-send' : '');
      el.title = isSel
        ? `Click again to deselect · ${qty}× ${type} seeds`
        : `${qty}× ${type} seeds — click/drag to send to a robot`;
      el.innerHTML = `<span class="is-emoji">${cfg?.emoji||'?'}</span><span class="is-count">${qty}</span><span class="is-name">${type}</span>`;
      el.onclick = () => { _setInvSelection('seed', type); buildInventoryModal(); };
      el.draggable = true;
      el.addEventListener('dragstart', e => {
        invSelectedStack = { kind: 'seed', cropType: type };
        invDragPayload = { kind: 'player-seed', cropType: type };
        document.body.classList.add('inv-drag-active');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', JSON.stringify(invDragPayload));
        el.classList.add('dragging');
      });
      el.addEventListener('dragend', () => {
        el.classList.remove('dragging');
        _clearInventoryDragState();
      });
    } else {
      el.className = 'inv-slot empty';
      el.textContent = '·';
    }
    grid.appendChild(el);
  }
}

function _buildPlayerGrid() {
  const grid = document.getElementById('inv-player-grid');
  if (!grid) return;
  grid.classList.remove('drag-target');
  grid.ondragover = e => {
    const payload = _readInventoryDragPayload(e);
    if (!_canDropOnPlayerGrid(payload)) return;
    e.preventDefault();
    grid.classList.add('drag-target');
  };
  grid.ondragleave = () => grid.classList.remove('drag-target');
  grid.ondrop = e => {
    const payload = _readInventoryDragPayload(e);
    grid.classList.remove('drag-target');
    if (!_canDropOnPlayerGrid(payload)) return;
    e.preventDefault();
    if (payload.kind === 'robot-crop') {
      const got = collectRobotCropToPlayer(payload.robotId, payload.cropType, { notifySingle: true });
      if (got > 0) { buildInventoryModal(); updateUI(); }
    }
    _clearInventoryDragState();
  };

  grid.innerHTML = '';
  const crops = _activeEntryList(inventory.crops);
  for (let i = 0; i < PLAYER_INV_SLOTS; i++) {
    const el = document.createElement('div');
    if (i < crops.length) {
      const [type, qty] = crops[i];
      const cfg = S.crops[type];
      const isSel = _isInvSelection('crop', type);
      el.className = 'inv-slot filled' + (isSel ? ' selected-send' : '');
      el.title = isSel
        ? `Click again to deselect · ${qty}× ${type}`
        : `${qty}× ${type} — click to send, or drag to a robot`;
      el.innerHTML = `<span class="is-emoji">${cfg?.emoji||'?'}</span><span class="is-count">${qty}</span><span class="is-name">${type}</span>`;
      el.onclick = () => { _setInvSelection('crop', type); buildInventoryModal(); };
      el.draggable = true;
      el.addEventListener('dragstart', e => {
        invSelectedStack = { kind: 'crop', cropType: type };
        invDragPayload = { kind: 'player-crop', cropType: type };
        document.body.classList.add('inv-drag-active');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', JSON.stringify(invDragPayload));
        el.classList.add('dragging');
      });
      el.addEventListener('dragend', () => {
        el.classList.remove('dragging');
        _clearInventoryDragState();
      });
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
    const inv = _robotSnapshot(bot);
    const pct = Math.min(100, inv.total / inv.cap * 100);
    const slotEntries = [
      ...inv.seedEntries.map(([type, qty]) => ({ kind: 'seed', type, qty })),
      ...inv.cropEntries.map(([type, qty]) => ({ kind: 'crop', type, qty })),
    ];
    let slotsHTML = '';
    for (let i = 0; i < inv.slots; i++) {
      if (i < slotEntries.length) {
        const item = slotEntries[i];
        const type = item.type;
        const qty = item.qty;
        const cfg = S.crops[type];
        const dragKind = item.kind === 'seed' ? 'robot-seed' : 'robot-crop';
        slotsHTML += `<div class="inv-robot-slot has-item drag-source ${item.kind}" draggable="true" data-drag-kind="${dragKind}" data-robot-id="${bot.id}" data-crop-type="${type}" title="Drag to your bag to collect ${item.kind}">${cfg?.emoji||'?'}<br><span style="font-family:'Press Start 2P',monospace;font-size:6px;color:var(--gold)">${qty}</span><span class="slot-kind">${item.kind === 'seed' ? 'SEED' : 'CROP'}</span></div>`;
      } else {
        slotsHTML += `<div class="inv-robot-slot" style="color:#333">—</div>`;
      }
    }
    const selectedQty = invSelectedStack
      ? ((invSelectedStack.kind === 'seed' ? inventory.seeds[invSelectedStack.cropType] : inventory.crops[invSelectedStack.cropType]) || 0)
      : 0;
    const canGive = selectedQty > 0;
    const canCollect = inv.total > 0;
    const _invTd = ROBOT_TYPES[bot.type] || ROBOT_TYPES.basic;
    const _typeColor = bot.type==='rust'?'#cc8844':bot.type==='pro'?'#60a0e0':'var(--text-dim)';
    const el = document.createElement('div');
    el.className = 'inv-robot-row';
    el.dataset.robotId = bot.id;
    el.innerHTML = `
      <div style="font-size:22px">${_invTd.emoji}</div>
      <div style="flex:1;min-width:0">
        <div style="color:var(--text);font-size:15px;margin-bottom:3px">${bot.name} <span style="color:${_typeColor};font-size:12px">[${_invTd.name}]</span></div>
        <div class="inv-robot-slots">${slotsHTML}</div>
        <div class="inv-cap-bar"><div class="inv-cap-fill${pct>=90?' warn':''}" style="width:${pct}%"></div></div>
        <div style="color:var(--text-dim);font-size:11px;margin-top:2px">${inv.total}/${inv.cap} held · ${inv.cropTotal} crops · ${inv.seedTotal} seeds</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">
        ${canGive ? `<button class="game-btn primary" onclick="sendSelectedStackToRobot(${bot.id})" style="font-size:6px;padding:5px 7px">GIVE ▶</button>` : ''}
        ${canCollect ? `<button class="game-btn success" onclick="collectRobotCrops(${bot.id})" style="font-size:6px;padding:5px 7px">TAKE ALL</button>` : ''}
      </div>`;
    el.ondragover = e => {
      const payload = _readInventoryDragPayload(e);
      if (!_canDropOnRobotRow(payload)) return;
      e.preventDefault();
      el.classList.add('drag-target');
    };
    el.ondragleave = () => el.classList.remove('drag-target');
    el.ondrop = e => {
      const payload = _readInventoryDragPayload(e);
      el.classList.remove('drag-target');
      if (!_canDropOnRobotRow(payload)) return;
      e.preventDefault();
      let moved = 0;
      if (payload.kind === 'player-crop') {
        moved = sendCropTypeToRobot(bot.id, payload.cropType, { clearSelection: true });
      } else if (payload.kind === 'player-seed' || payload.kind === 'hotbar-seed') {
        moved = sendSeedTypeToRobot(bot.id, payload.cropType);
      }
      if (moved > 0) { buildInventoryModal(); updateUI(); }
      _clearInventoryDragState();
    };
    list.appendChild(el);

    const dragSlots = el.querySelectorAll('.inv-robot-slot.drag-source');
    for (const ds of dragSlots) {
      ds.addEventListener('dragstart', e => {
        const robotId = Number(ds.dataset.robotId);
        const cropType = ds.dataset.cropType;
        const kind = ds.dataset.dragKind;
        if (!robotId || !cropType) return;
        if (kind !== 'robot-crop' && kind !== 'robot-seed') return;
        invDragPayload = { kind, robotId, cropType };
        document.body.classList.add('inv-drag-active');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', JSON.stringify(invDragPayload));
        ds.classList.add('dragging');
      });
      ds.addEventListener('dragend', () => {
        ds.classList.remove('dragging');
        _clearInventoryDragState();
      });
    }
  }
}

function sortInventory() {
  const sortedCrops = _activeEntryList(inventory.crops);
  const sortedSeeds = _activeEntryList(inventory.seeds);
  inventory.crops = Object.fromEntries(sortedCrops);
  inventory.seeds = Object.fromEntries(sortedSeeds);
  buildInventoryModal();
}

function sendSelectedStackToRobot(robotId) {
  if (!invSelectedStack) return 0;
  let sent = 0;
  if (invSelectedStack.kind === 'seed') sent = sendSeedTypeToRobot(robotId, invSelectedStack.cropType);
  else sent = sendCropTypeToRobot(robotId, invSelectedStack.cropType, { clearSelection: true });
  if (sent > 0) { buildInventoryModal(); updateUI(); }
  return sent;
}

function sendCropToRobot(robotId) {
  return sendSelectedStackToRobot(robotId);
}

function _robotTransferRoom(bot, kind, cropType) {
  const inv = _robotSnapshot(bot);
  const hasStack = kind === 'seed'
    ? (bot.inventory.seeds[cropType] || 0) > 0
    : (bot.inventory.crops[cropType] || 0) > 0;
  if (!hasStack && inv.usedSlots >= inv.slots) {
    notify(`⚠️ ${bot.name} has no free slots!`);
    return 0;
  }
  const room = inv.cap - inv.total;
  if (room <= 0) {
    notify(`⚠️ ${bot.name} inventory full!`);
    return 0;
  }
  return room;
}

function sendCropTypeToRobot(robotId, cropType, opts = {}) {
  if (!cropType) return 0;
  const bot = _findRobotById(robotId);
  if (!bot) return 0;
  _normalizePlayerInventory();
  _ensureRobotInventory(bot);
  const qty = inventory.crops[cropType] || 0;
  if (qty <= 0) { notify(`❌ No ${cropType} to send!`); return 0; }
  const room = _robotTransferRoom(bot, 'crop', cropType);
  if (room <= 0) return 0;
  const maxSend = Number.isFinite(opts.maxSend) ? Math.max(0, Math.floor(Number(opts.maxSend))) : Infinity;
  const send = Math.min(qty, room, maxSend);
  if (send <= 0) return 0;
  inventory.crops[cropType] -= send;
  if (inventory.crops[cropType] <= 0) delete inventory.crops[cropType];
  bot.inventory.crops[cropType] = (bot.inventory.crops[cropType] || 0) + send;
  if (!opts.silent) notify(`📦 Sent ${send}× ${S.crops[cropType]?.emoji||''} ${cropType} → ${bot.name}`);
  if (opts.clearSelection && invSelectedStack?.kind === 'crop' && invSelectedStack.cropType === cropType) invSelectedStack = null;
  return send;
}

function sendSeedTypeToRobot(robotId, cropType, opts = {}) {
  if (!cropType) return 0;
  const bot = _findRobotById(robotId);
  if (!bot) return 0;
  _normalizePlayerInventory();
  _ensureRobotInventory(bot);
  const qty = inventory.seeds[cropType] || 0;
  if (qty <= 0) { notify(`❌ No ${cropType} seeds to give!`); return 0; }
  const room = _robotTransferRoom(bot, 'seed', cropType);
  if (room <= 0) return 0;
  const maxSend = Number.isFinite(opts.maxSend) ? Math.max(0, Math.floor(Number(opts.maxSend))) : Infinity;
  const send = Math.min(qty, room, maxSend);
  if (send <= 0) return 0;
  inventory.seeds[cropType] -= send;
  if (inventory.seeds[cropType] <= 0) delete inventory.seeds[cropType];
  bot.inventory.seeds[cropType] = (bot.inventory.seeds[cropType] || 0) + send;
  if (invSelectedStack?.kind === 'seed' && invSelectedStack.cropType === cropType && (inventory.seeds[cropType] || 0) <= 0) {
    invSelectedStack = null;
  }
  if (!opts.silent) notify(`🌱 Gave ${send}× ${S.crops[cropType]?.emoji||''} ${cropType} seeds → ${bot.name}`);
  return send;
}

function collectRobotCrops(robotId, opts = {}) {
  const bot = _findRobotById(robotId);
  if (!bot) return { crops: 0, seeds: 0 };
  _normalizePlayerInventory();
  _ensureRobotInventory(bot);
  let collectedCrops = 0;
  let collectedSeeds = 0;
  for (const [type, qty] of Object.entries(bot.inventory.crops)) {
    if (qty <= 0) continue;
    collectedCrops += collectRobotCropToPlayer(bot.id, type);
  }
  for (const [type, qty] of Object.entries(bot.inventory.seeds)) {
    if (qty <= 0) continue;
    collectedSeeds += collectRobotSeedToPlayer(bot.id, type);
  }
  if (collectedCrops > 0 || collectedSeeds > 0) {
    if (!opts.silent) {
      let msg = `📦 Collected from ${bot.name}:`;
      if (collectedCrops > 0) msg += ` ${collectedCrops} crops`;
      if (collectedSeeds > 0) msg += `${collectedCrops > 0 ? ' and' : ''} ${collectedSeeds} seeds`;
      msg += '!';
      notify(msg);
    }
    if (!opts.suppressRefresh) {
      buildInventoryModal();
      updateUI();
    }
  }
  return { crops: collectedCrops, seeds: collectedSeeds };
}

function collectAllRobotsToPlayer(opts = {}) {
  let totalCrops = 0;
  let totalSeeds = 0;
  let touched = 0;
  for (const bot of robots) {
    const got = collectRobotCrops(bot.id, { silent: true, suppressRefresh: true });
    if (!got) continue;
    if ((got.crops || 0) > 0 || (got.seeds || 0) > 0) touched++;
    totalCrops += got.crops || 0;
    totalSeeds += got.seeds || 0;
  }
  if (!opts.suppressRefresh) {
    if (typeof buildInventoryModal === 'function' && typeof _isInventoryModalOpen === 'function' && _isInventoryModalOpen()) {
      buildInventoryModal();
    }
    updateUI();
  }
  if (!opts.silent) {
    if (totalCrops > 0 || totalSeeds > 0) {
      notify(`📦 Collected from ${touched} robots: ${totalCrops} crops${totalSeeds > 0 ? `, ${totalSeeds} seeds` : ''}.`);
    } else {
      notify('📦 Robots have nothing to collect right now.');
    }
  }
  return { crops: totalCrops, seeds: totalSeeds, robots: touched };
}

function distributeAssignedSeedsToAllRobots(opts = {}) {
  const perRobot = Math.max(1, Math.min(99, Math.floor(Number(opts.perRobot) || 10)));
  let total = 0;
  let touched = 0;
  for (const bot of robots) {
    const cropType = bot.assignedCrop || Object.keys(S.crops || {})[0];
    if (!cropType || !S.crops[cropType]) continue;
    const sent = sendSeedTypeToRobot(bot.id, cropType, { silent: true, maxSend: perRobot });
    if (sent > 0) {
      touched++;
      total += sent;
    }
  }
  if (!opts.suppressRefresh) {
    if (typeof buildInventoryModal === 'function' && typeof _isInventoryModalOpen === 'function' && _isInventoryModalOpen()) {
      buildInventoryModal();
    }
    buildRobotList();
    updateUI();
  }
  if (!opts.silent) {
    if (total > 0) notify(`🌱 Distributed ${total} seeds across ${touched} robots.`);
    else notify('🌱 No seeds were distributed (check inventory and robot space).');
  }
  return { sent: total, robots: touched };
}

function collectRobotSeedToPlayer(robotId, cropType, opts = {}) {
  if (!cropType) return 0;
  const bot = _findRobotById(robotId);
  if (!bot) return 0;
  _normalizePlayerInventory();
  _ensureRobotInventory(bot);
  const qty = bot.inventory.seeds[cropType] || 0;
  if (qty <= 0) return 0;
  const take = qty;
  inventory.seeds[cropType] = (inventory.seeds[cropType] || 0) + take;
  bot.inventory.seeds[cropType] -= take;
  if ((bot.inventory.seeds[cropType] || 0) <= 0) delete bot.inventory.seeds[cropType];
  if ((bot.inventory.harvestSeeds[cropType] || 0) > 0) {
    const harvestTake = Math.min(take, bot.inventory.harvestSeeds[cropType]);
    bot.inventory.harvestSeeds[cropType] -= harvestTake;
    if ((bot.inventory.harvestSeeds[cropType] || 0) <= 0) delete bot.inventory.harvestSeeds[cropType];
  }
  if (opts.notifySingle) {
    const emoji = S.crops[cropType]?.emoji || '';
    notify(`📥 Collected ${take}× ${emoji} ${cropType} seeds`);
  }
  return take;
}

function collectRobotCropToPlayer(robotId, cropType, opts = {}) {
  if (!cropType) return 0;
  const bot = _findRobotById(robotId);
  if (!bot) return 0;
  _normalizePlayerInventory();
  _ensureRobotInventory(bot);
  const qty = bot.inventory.crops[cropType] || 0;
  if (qty <= 0) return 0;
  const playerTypes = _activeEntryList(inventory.crops).map(([type]) => type);
  if (!(inventory.crops[cropType] > 0) && playerTypes.length >= PLAYER_INV_SLOTS) {
    notify('⚠️ Bag full! Sell some crops first.');
    return 0;
  }
  const space = PLAYER_INV_MAX - (inventory.crops[cropType] || 0);
  if (space <= 0) {
    notify(`⚠️ ${cropType} stack is full.`);
    return 0;
  }
  const take = Math.min(qty, space);
  inventory.crops[cropType] = (inventory.crops[cropType] || 0) + take;
  const seedTake = Math.min(take, bot.inventory.harvestSeeds[cropType] || 0);
  if (seedTake > 0) {
    inventory.seeds[cropType] = (inventory.seeds[cropType] || 0) + seedTake;
    bot.inventory.harvestSeeds[cropType] -= seedTake;
    if ((bot.inventory.harvestSeeds[cropType] || 0) <= 0) delete bot.inventory.harvestSeeds[cropType];
    if ((bot.inventory.seeds?.[cropType] || 0) > 0) {
      bot.inventory.seeds[cropType] = Math.max(0, bot.inventory.seeds[cropType] - seedTake);
    }
  }
  bot.inventory.crops[cropType] -= take;
  if ((bot.inventory.crops[cropType] || 0) <= 0) delete bot.inventory.crops[cropType];
  if (opts.notifySingle) {
    const emoji = S.crops[cropType]?.emoji || '';
    notify(`📥 Collected ${take}× ${emoji} ${cropType}${seedTake > 0 ? ` (+${seedTake} seeds)` : ''}`);
  }
  return take;
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
  const bot = _findRobotById(id);
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

  const cropSelect = document.getElementById('robot-crop-select');
  if (cropSelect) {
    cropSelect.innerHTML = '';
    for (const [cropType, cfg] of Object.entries(S.crops || {})) {
      const opt = document.createElement('option');
      opt.value = cropType;
      opt.textContent = `${cfg.emoji || '🌱'} ${cfg.name || cropType}`;
      cropSelect.appendChild(opt);
    }
    if (!cropSelect.querySelector(`option[value="${bot.assignedCrop}"]`)) {
      bot.assignedCrop = Object.keys(S.crops || {})[0] || 'wheat';
    }
    cropSelect.value = bot.assignedCrop || 'wheat';
  }
  document.getElementById('robot-area-display').textContent = bot.workArea ? `(${bot.workArea.x}, ${bot.workArea.y}) r=${bot.workArea.radius}` : 'Not set';
  const areaRadiusInput = document.getElementById('robot-area-radius');
  const areaRadiusVal = document.getElementById('robot-area-radius-val');
  if (areaRadiusInput) {
    const defaultRadius = Math.max(2, Math.min(24, Math.floor(Number(bot.defaultRadius) || 8)));
    const radius = bot.workArea ? Math.max(2, Math.min(24, Math.floor(Number(bot.workArea.radius) || defaultRadius))) : defaultRadius;
    areaRadiusInput.value = String(radius);
    if (areaRadiusVal) areaRadiusVal.textContent = String(radius);
  }
  document.getElementById('robot-code-editor').value = bot.customCode || '';
  document.getElementById('code-error-msg').textContent = bot.codeError || '';

  document.querySelectorAll('.robot-list-item').forEach((el, i) => {
    el.classList.toggle('selected', robots[i]?.id === id);
  });
}

function applyRobotBehavior() {
  const bot = _findRobotById(configRobotId);
  if (bot) { bot.behavior = document.getElementById('robot-behavior-select').value; notify(`🤖 ${bot.name} behavior: ${bot.behavior}`); }
}

function applyRobotCrop() {
  const bot = _findRobotById(configRobotId);
  if (bot) { bot.assignedCrop = document.getElementById('robot-crop-select').value; }
}

function applyRobotBehaviorToAll() {
  const src = _findRobotById(configRobotId);
  if (!src) return;
  let applied = 0;
  for (const bot of robots) {
    if (bot.behavior === src.behavior) continue;
    bot.behavior = src.behavior;
    applied++;
  }
  notify(`🤖 Applied behavior "${src.behavior}" to ${applied} robots.`);
  buildRobotList();
}

function applyRobotCropToAll() {
  const src = _findRobotById(configRobotId);
  if (!src) return;
  let applied = 0;
  for (const bot of robots) {
    if (bot.assignedCrop === src.assignedCrop) continue;
    bot.assignedCrop = src.assignedCrop;
    applied++;
  }
  notify(`🌱 Applied crop "${src.assignedCrop}" to ${applied} robots.`);
  buildRobotList();
}

function giveAssignedSeedsToSelectedRobot() {
  const bot = _findRobotById(configRobotId);
  if (!bot) return;
  const cropType = bot.assignedCrop || Object.keys(S.crops || {})[0];
  if (!cropType) return;
  const sent = sendSeedTypeToRobot(bot.id, cropType);
  if (sent > 0) {
    updateUI();
    if (typeof _isInventoryModalOpen === 'function' &&
      typeof buildInventoryModal === 'function' &&
      _isInventoryModalOpen()) {
      buildInventoryModal();
    }
    buildRobotList();
  }
}

function collectSelectedRobotAll() {
  const bot = _findRobotById(configRobotId);
  if (!bot) return;
  collectRobotCrops(bot.id);
  buildRobotList();
}

function syncRobotAreaRadiusLabel() {
  const input = document.getElementById('robot-area-radius');
  const out = document.getElementById('robot-area-radius-val');
  if (!input) return;
  const radius = Math.max(2, Math.min(24, Math.floor(Number(input.value) || 8)));
  input.value = String(radius);
  if (out) out.textContent = String(radius);
  const bot = _findRobotById(configRobotId);
  if (bot?.workArea) {
    bot.workArea.radius = radius;
    const areaDisplay = document.getElementById('robot-area-display');
    if (areaDisplay) areaDisplay.textContent = `(${bot.workArea.x}, ${bot.workArea.y}) r=${radius}`;
  }
}

function saveRobotCode() {
  const bot = _findRobotById(configRobotId);
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
  const bot = _findRobotById(configRobotId);
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
  if (!robotsOwned || typeof robotsOwned !== 'object') robotsOwned = { rust: 0, basic: 0, pro: 0 };
  const rType = bot.type || 'basic';
  robotsOwned[rType] = (robotsOwned[rType] || 0) + 1;
  robots.splice(idx, 1);
  configRobotId = null; selectedRobotId = null;
  document.getElementById('robot-config-panel').classList.remove('visible');
  notify(`🤖 ${bot.name} returned to inventory.`);
  buildRobotList();
}

function startSetWorkArea() {
  syncRobotAreaRadiusLabel();
  closeAllModals();
  assigningWorkArea = true;
  document.getElementById('assign-overlay').classList.add('visible');
}

function cancelAssign() {
  assigningWorkArea = false;
  document.getElementById('assign-overlay').classList.remove('visible');
}
