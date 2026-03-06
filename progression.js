/* ═══════════════════════════════════════════════════════════════════════════
 * GOAL TRACKER / PROGRESSION
 * ═══════════════════════════════════════════════════════════════════════════ */
let progressionState = null;
let _goalsUiCache = '';

function _defaultProgressionState() {
  return {
    metrics: {
      tilesPlanted: 0,
      waterActions: 0,
      manualHarvests: 0,
      cropsSold: 0,
      coinsFromSales: 0,
      robotsPurchased: 0,
      robotsPlaced: 0,
      robotHarvests: 0,
    },
    completed: {},
  };
}

function getGoalDefinitions() {
  return Array.isArray(S.progression?.goals) ? S.progression.goals : [];
}

function _goalUnlockedByOrder(idx, defs, done) {
  if (idx <= 0) return true;
  const prev = defs[idx - 1];
  if (!prev || !prev.id) return true;
  return !!done[prev.id];
}

function resetProgressionState() {
  progressionState = _defaultProgressionState();
  _goalsUiCache = '';
  updateGoalsUI();
}

function _ensureProgressionState() {
  if (!progressionState || typeof progressionState !== 'object') {
    progressionState = _defaultProgressionState();
  }
  if (!progressionState.metrics || typeof progressionState.metrics !== 'object') {
    progressionState.metrics = _defaultProgressionState().metrics;
  }
  if (!progressionState.completed || typeof progressionState.completed !== 'object') {
    progressionState.completed = {};
  }
  return progressionState;
}

function _addInventorySeeds(seedReward) {
  if (!seedReward || typeof seedReward !== 'object') return;
  if (!inventory || typeof inventory !== 'object') inventory = { seeds: {}, crops: {} };
  if (!inventory.seeds || typeof inventory.seeds !== 'object') inventory.seeds = {};
  for (const [crop, qty] of Object.entries(seedReward)) {
    const n = Math.max(0, Math.floor(Number(qty) || 0));
    if (n <= 0) continue;
    inventory.seeds[crop] = (inventory.seeds[crop] || 0) + n;
  }
}

function _addRobotVouchers(voucherReward) {
  if (!voucherReward || typeof voucherReward !== 'object') return;
  if (typeof robotVouchers === 'undefined' || !robotVouchers || typeof robotVouchers !== 'object') return;
  for (const [type, qty] of Object.entries(voucherReward)) {
    const n = Math.max(0, Math.floor(Number(qty) || 0));
    if (n <= 0) continue;
    robotVouchers[type] = (robotVouchers[type] || 0) + n;
  }
}

function _applyGoalReward(goal) {
  const reward = goal?.reward || {};
  const chunks = [];

  const coinReward = Math.max(0, Math.floor(Number(reward.coins) || 0));
  if (coinReward > 0) {
    coins += coinReward;
    chunks.push(`+${coinReward} coins`);
  }

  if (reward.seeds && typeof reward.seeds === 'object') {
    _addInventorySeeds(reward.seeds);
    const seedText = Object.entries(reward.seeds)
      .map(([crop, qty]) => `${Math.max(0, Math.floor(Number(qty) || 0))} ${crop}`)
      .filter(Boolean)
      .join(', ');
    if (seedText) chunks.push(`${seedText} seeds`);
  }

  if (reward.robotVouchers && typeof reward.robotVouchers === 'object') {
    _addRobotVouchers(reward.robotVouchers);
    const voucherText = Object.entries(reward.robotVouchers)
      .map(([type, qty]) => `${Math.max(0, Math.floor(Number(qty) || 0))} ${type} voucher`)
      .filter(Boolean)
      .join(', ');
    if (voucherText) chunks.push(voucherText);
  }

  const msg = chunks.length > 0 ? chunks.join(' · ') : 'progression updated';
  notify(`✅ Goal complete: ${goal.title} (${msg})`);
}

function evaluateGoals() {
  const st = _ensureProgressionState();
  const defs = getGoalDefinitions();
  if (!defs.length) return;

  let changed = false;
  for (let i = 0; i < defs.length; i++) {
    const g = defs[i];
    if (!g || !g.id || !g.metric) continue;
    if (st.completed[g.id]) continue;
    if (!_goalUnlockedByOrder(i, defs, st.completed)) break;
    const target = Math.max(1, Math.floor(Number(g.target) || 1));
    const value = Math.max(0, Math.floor(Number(st.metrics[g.metric]) || 0));
    if (value < target) continue;
    st.completed[g.id] = true;
    _applyGoalReward(g);
    changed = true;
  }

  if (changed) {
    if (typeof updateUI === 'function') updateUI();
    if (typeof buildShop === 'function') buildShop();
  }
}

function recordGoalMetric(metric, amount = 1) {
  if (!metric) return;
  const st = _ensureProgressionState();
  const n = Math.max(0, Math.floor(Number(amount) || 0));
  if (n <= 0) return;
  st.metrics[metric] = (st.metrics[metric] || 0) + n;
  evaluateGoals();
  updateGoalsUI();
}

function exportProgressionState() {
  const st = _ensureProgressionState();
  return JSON.parse(JSON.stringify(st));
}

function importProgressionState(data) {
  const next = _defaultProgressionState();
  if (data && typeof data === 'object') {
    const metrics = data.metrics && typeof data.metrics === 'object' ? data.metrics : {};
    for (const key of Object.keys(next.metrics)) {
      next.metrics[key] = Math.max(0, Math.floor(Number(metrics[key]) || 0));
    }
    const done = data.completed && typeof data.completed === 'object' ? data.completed : {};
    for (const [id, val] of Object.entries(done)) next.completed[id] = !!val;
  }
  progressionState = next;
  _goalsUiCache = '';
  evaluateGoals();
  updateGoalsUI();
}

function updateGoalsUI() {
  const panel = document.getElementById('goal-panel');
  const list = document.getElementById('goal-list');
  const vouchers = document.getElementById('goal-vouchers');
  if (!panel || !list || !vouchers) return;

  const st = _ensureProgressionState();
  const defs = getGoalDefinitions();
  if (!defs.length) {
    panel.style.display = 'none';
    return;
  }
  panel.style.display = 'block';

  const voucherBag = (typeof robotVouchers !== 'undefined' && robotVouchers && typeof robotVouchers === 'object')
    ? robotVouchers
    : {};
  const voucherCount = Math.max(0, Math.floor(Number(voucherBag.basic) || 0));
  const voucherSnapshot = Object.keys(voucherBag)
    .sort()
    .map(type => `${type}:${Math.max(0, Math.floor(Number(voucherBag[type]) || 0))}`)
    .join('|');
  const snapshot = JSON.stringify({ m: st.metrics, c: st.completed, vb: voucherSnapshot });
  if (snapshot === _goalsUiCache) return;
  _goalsUiCache = snapshot;

  let firstIncomplete = defs.findIndex(g => !st.completed[g.id]);
  if (firstIncomplete < 0) firstIncomplete = defs.length - 1;
  const start = Math.max(0, firstIncomplete - 1);
  const visible = defs.slice(start, start + 4);

  list.innerHTML = visible.map((goal, localIdx) => {
    const idx = start + localIdx;
    const unlocked = _goalUnlockedByOrder(idx, defs, st.completed);
    const done = !!st.completed[goal.id];
    const target = Math.max(1, Math.floor(Number(goal.target) || 1));
    const value = Math.max(0, Math.floor(Number(st.metrics[goal.metric]) || 0));
    const shown = Math.min(value, target);
    const pct = done ? 100 : Math.floor((shown / target) * 100);
    const cls = done ? 'done' : (unlocked ? 'active' : 'locked');
    const desc = goal.desc || `${goal.metric} ${target}`;
    return `
      <div class="goal-row ${cls}">
        <div class="goal-head"><span class="goal-name">${goal.title}</span><span class="goal-amt">${shown}/${target}</span></div>
        <div class="goal-desc">${desc}</div>
        <div class="goal-bar"><div class="goal-fill" style="width:${pct}%"></div></div>
      </div>`;
  }).join('');

  vouchers.textContent = voucherCount > 0
    ? `Basic vouchers: ${voucherCount}`
    : 'Basic vouchers: none';
}

resetProgressionState();
