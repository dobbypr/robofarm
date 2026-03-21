/* ═══════════════════════════════════════════════════════════════════════════
 * DRAG-TO-USE TOOLS  (QoL — hold mouse to apply tool to multiple tiles)
 * ═══════════════════════════════════════════════════════════════════════════ */
const _mainGetEl = RF_UTIL.getEl;

let mouseIsDown = false;
let lastDragTile = { x: -1, y: -1 };
let _milestoneHideTimer = 0;

canvas.addEventListener('mousedown', e => {
  mouseIsDown = true;
  lastDragTile = { x: -1, y: -1 };
});
document.addEventListener('mouseup', () => { mouseIsDown = false; });

canvas.addEventListener('mousemove', e => {
  if (!mouseIsDown) return;
  const tx = Math.floor(mouseWorld.x / TILE);
  const ty = Math.floor(mouseWorld.y / TILE);
  if (tx === lastDragTile.x && ty === lastDragTile.y) return;
  lastDragTile = { x: tx, y: ty };
  // Only drag-apply for till, water, and seeds (not hand or robot_place)
  if (currentTool === 'hoe' || currentTool === 'water' || S.crops[currentTool]) {
    if (inBounds(tx, ty)) handleTileClick(tx, ty, { silent: true });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
 * CROP HOVER TOOLTIP  (QoL — hover to see crop info)
 * ═══════════════════════════════════════════════════════════════════════════ */
function updateCropTooltip(mx, my) {
  const tooltip = _mainGetEl('crop-tooltip');
  if (!tooltip) return;
  const tx = Math.floor(mouseWorld.x / TILE);
  const ty = Math.floor(mouseWorld.y / TILE);

  if (!inBounds(tx, ty) || !world[ty][tx].crop) {
    tooltip.style.display = 'none'; return;
  }

  const crop = world[ty][tx].crop;
  const cfg = S.crops[crop.type];
  if (!cfg) { tooltip.style.display = 'none'; return; }

  const stageMax = Math.max(1, cfg.stages - 1);
  const stage = Math.max(0, Math.min(stageMax, Math.floor(Number(crop.stage) || 0)));
  const isReady = stage >= stageMax;
  const stagePct = (stage / stageMax) * 100;
  const waterNeed = Math.max(1, Math.floor(Number(cfg.waterNeeded) || 1));
  const waterCount = Math.max(0, Math.floor(Number(crop.waterCount) || 0));

  const nameEl = _mainGetEl('ct-name');
  const stageEl = _mainGetEl('ct-stage');
  const fillEl = _mainGetEl('ct-fill');
  const readyEl = _mainGetEl('ct-ready');
  if (!nameEl || !stageEl || !fillEl || !readyEl) return;

  nameEl.textContent = `${cfg.emoji} ${crop.type.toUpperCase()}`;
  stageEl.innerHTML = `Stage ${stage + 1}/${Math.max(1, cfg.stages)}  ·  💧 Today ${waterCount}/${waterNeed}`;
  fillEl.style.width = stagePct + '%';
  readyEl.style.display = isReady ? 'block' : 'none';

  const pad = 12;
  tooltip.style.left = (mx + pad) + 'px';
  tooltip.style.top = (my - tooltip.offsetHeight / 2) + 'px';
  tooltip.style.display = 'block';
}

/* ═══════════════════════════════════════════════════════════════════════════
 * MILESTONE SYSTEM  (QoL — celebrate small victories)
 * ═══════════════════════════════════════════════════════════════════════════ */
let milestones = { firstHarvest: false, firstRobot: false, crops100: false, coins1000: false, crops500: false };

function checkMilestones() {
  const metrics = progressionState?.metrics || {};
  const totalHarvests = Math.max(0,
    Math.floor(Number(metrics.manualHarvests) || 0)
    + Math.floor(Number(metrics.robotHarvests) || 0)
  );

  if (!milestones.firstHarvest && totalHarvests > 0) {
    milestones.firstHarvest = true;
    showMilestone('FIRST HARVEST!', 'You grew something. That\'s real. That\'s yours. 🌾');
  }
  if (!milestones.firstRobot && robots.length > 0) {
    milestones.firstRobot = true;
    showMilestone('FIRST ROBOT!', 'Your farm will never sleep again. 🤖');
  }
  if (!milestones.crops100 && totalHarvests >= 100) {
    milestones.crops100 = true;
    showMilestone('100 CROPS!', 'A proper operation is taking shape. Keep going!');
  }
  if (!milestones.coins1000 && coins >= 1000) {
    milestones.coins1000 = true;
    showMilestone('1000 COINS!', 'Look at that bank account grow. 💰');
  }
  if (!milestones.crops500 && totalHarvests >= 500) {
    milestones.crops500 = true;
    showMilestone('500 CROPS!', 'A sprawling operation. The land is yours. 🌾🌾🌾');
  }
}

function showMilestone(title, sub) {
  const textEl = _mainGetEl('milestone-text');
  const subEl = _mainGetEl('milestone-sub');
  const el = _mainGetEl('milestone-banner');
  if (!textEl || !subEl || !el) return;
  textEl.textContent = title;
  subEl.textContent = sub;
  el.style.opacity = '1';
  if (_milestoneHideTimer) clearTimeout(_milestoneHideTimer);
  _milestoneHideTimer = setTimeout(() => {
    el.style.opacity = '0';
    _milestoneHideTimer = 0;
  }, 3200);
}

/* ─── FILES MODAL helper ─── */
function openFilesModal() {
  const info = _mainGetEl('files-farm-info');
  if (!info) return;
  let cropCount = 0;
  for (let y = 0; y < WH; y++) {
    for (let x = 0; x < WW; x++) if (world[y][x]?.crop) cropCount++;
  }
  info.textContent = `Day ${day}  ·  ${SEASONS[season % SEASONS.length]}  ·  ${coins} coins  ·  ${robots.length} robots  ·  ${cropCount} crops planted`;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * MAIN GAME LOOP
 * ═══════════════════════════════════════════════════════════════════════════ */
const _SIM_STEP_MS = 1000 / 60;
const _MAX_SIM_STEPS = 3;
let _simAccumulator = 0;
let _lastFrameTime = performance.now();

function loop(now = performance.now()) {
  const dt = Math.min(120, Math.max(0, now - _lastFrameTime));
  _lastFrameTime = now;
  _simAccumulator += dt;
  const maxAccumulatedTime = _SIM_STEP_MS * _MAX_SIM_STEPS;
  if (_simAccumulator > maxAccumulatedTime) _simAccumulator = maxAccumulatedTime;

  let steps = 0;
  while (_simAccumulator >= _SIM_STEP_MS && steps < _MAX_SIM_STEPS) {
    update();
    _simAccumulator -= _SIM_STEP_MS;
    steps++;
  }

  render();
  requestAnimationFrame(loop);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * INIT
 * ═══════════════════════════════════════════════════════════════════════════ */
window.addEventListener('resize', resize);
resize();
initAmbient();   // menu.js: generates world, seeds bots, migrates old save
openMenu();      // menu.js: shows the title screen
requestAnimationFrame(loop);

/* Click outside modals to close */
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', function (e) {
    if (e.target === this) { this.classList.add('hidden'); syncCursorMode(); }
  });
});
