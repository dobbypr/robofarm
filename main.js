/* ═══════════════════════════════════════════════════════════════════════════
 * DRAG-TO-USE TOOLS  (QoL — hold mouse to apply tool to multiple tiles)
 * ═══════════════════════════════════════════════════════════════════════════ */
let mouseIsDown = false;
let lastDragTile = { x: -1, y: -1 };

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
    if (inBounds(tx, ty)) handleTileClick(tx, ty, {});
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
 * CROP HOVER TOOLTIP  (QoL — hover to see crop info)
 * ═══════════════════════════════════════════════════════════════════════════ */
function updateCropTooltip(mx, my) {
  const tooltip = document.getElementById('crop-tooltip');
  const tx = Math.floor(mouseWorld.x / TILE);
  const ty = Math.floor(mouseWorld.y / TILE);

  if (!inBounds(tx, ty) || !world[ty][tx].crop) {
    tooltip.style.display = 'none'; return;
  }

  const crop = world[ty][tx].crop;
  const cfg = S.crops[crop.type];
  if (!cfg) { tooltip.style.display = 'none'; return; }

  const isReady = crop.stage >= cfg.stages - 1;
  const stagePct = (crop.stage / (cfg.stages - 1)) * 100;
  const waterPct = Math.min(100, (crop.waterCount / cfg.waterNeeded) * 100);

  document.getElementById('ct-name').textContent = `${cfg.emoji} ${crop.type.toUpperCase()}`;
  document.getElementById('ct-stage').innerHTML =
    `Stage ${crop.stage + 1}/${cfg.stages}  ·  💧 ${crop.waterCount}/${cfg.waterNeeded}`;
  document.getElementById('ct-fill').style.width = stagePct + '%';
  const readyEl = document.getElementById('ct-ready');
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
  const totalCrops = Object.values(inventory.crops).reduce((a, b) => a + b, 0);

  if (!milestones.firstHarvest && totalCrops > 0) {
    milestones.firstHarvest = true;
    showMilestone('FIRST HARVEST!', 'You grew something. That\'s real. That\'s yours. 🌾');
  }
  if (!milestones.firstRobot && robots.length > 0) {
    milestones.firstRobot = true;
    showMilestone('FIRST ROBOT!', 'Your farm will never sleep again. 🤖');
  }
  if (!milestones.crops100 && totalCrops >= 100) {
    milestones.crops100 = true;
    showMilestone('100 CROPS!', 'A proper operation is taking shape. Keep going!');
  }
  if (!milestones.coins1000 && coins >= 1000) {
    milestones.coins1000 = true;
    showMilestone('1000 COINS!', 'Look at that bank account grow. 💰');
  }
}

function showMilestone(title, sub) {
  document.getElementById('milestone-text').textContent = title;
  document.getElementById('milestone-sub').textContent = sub;
  const el = document.getElementById('milestone-banner');
  el.style.opacity = '1';
  setTimeout(() => el.style.opacity = '0', 3200);
}

/* ─── FILES MODAL helper ─── */
function openFilesModal() {
  const info = document.getElementById('files-farm-info');
  const cropCount = world.flat().filter(t => t.crop).length;
  info.textContent = `Day ${day}  ·  ${SEASONS[season % SEASONS.length]}  ·  ${coins} coins  ·  ${robots.length} robots  ·  ${cropCount} crops planted`;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * MAIN GAME LOOP
 * ═══════════════════════════════════════════════════════════════════════════ */
function loop() {
  update();
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
loop();

/* Click outside modals to close */
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', function(e) {
    if (e.target === this) { this.classList.add('hidden'); syncCursorMode(); }
  });
});
