/* ═══════════════════════════════════════════════════════════════════════════
 * TILE CLICK HANDLER
 * ═══════════════════════════════════════════════════════════════════════════ */
function handleTileClick(tx, ty, e) {
  if (!inBounds(tx, ty)) return;

  // Work area assignment
  if (assigningWorkArea && selectedRobotId !== null) {
    const bot = robots.find(r => r.id === selectedRobotId);
    if (bot) {
      bot.workArea = { x: tx, y: ty, radius: 8 };
      document.getElementById('robot-area-display').textContent = `(${tx}, ${ty}) r=8`;
      notify(`🤖 ${bot.name} work area set to (${tx}, ${ty})`);
    }
    cancelAssign(); return;
  }

  const tile = world[ty][tx];

  if (currentTool === 'hand') {
    // Check if clicking a robot
    const bot = robots.find(r => r.tileX === tx && r.tileY === ty);
    if (bot) { selectedRobotId = bot.id; openModal('robots'); return; }
    // Harvest ready crop
    if (tile.crop) {
      const cfg = S.crops[tile.crop.type];
      if (tile.crop.stage >= cfg.stages - 1) {
        const got = cfg.yield;
        inventory.crops[tile.crop.type] = (inventory.crops[tile.crop.type] || 0) + got;
        productionStats.today.harvested += got;
        spawnParticles(tx * TILE + TILE/2, ty * TILE, 'harvest', 12);
        notify(`${cfg.emoji} Harvested ${got}x ${tile.crop.type}!`);
        tile.crop = null; updateUI(); checkMilestones();
      } else notify(`🕐 Crop not ready yet (${tile.crop.stage + 1}/${cfg.stages})`);
    }
  } else if (currentTool === 'hoe') {
    if (isTillableTile(tile)) {
      tile.type = 'tilled';
      spawnParticles(tx * TILE + TILE/2, ty * TILE, 'dirt', 6);
    } else if (tile.type === 'tilled' && !tile.crop) {
      tile.type = 'grass';
    }
  } else if (currentTool === 'water') {
    if (tile.type === 'tilled' && tile.crop && !tile.crop.watered) {
      const cfg = S.crops[tile.crop.type];
      if (tile.crop.waterCount < cfg.waterNeeded) {
        tile.crop.watered = true;
        spawnParticles(tx * TILE + TILE/2, ty * TILE, 'water', 8);
        notify(`💧 Watered ${tile.crop.type} (${tile.crop.waterCount + 1}/${cfg.waterNeeded})`);
      } else notify(`✅ Crop is fully watered!`);
    } else notify(`💧 Nothing to water here!`);
  } else if (currentTool === 'robot_place') {
    if (isWalkable(tx, ty)) {
      const maxBots = S.robots.maxRobots + getRFSMaxRobotBonus();
      if (robots.length >= maxBots) { notify(`⚠️ Max robots reached (${maxBots})`); return; }
      // Auto-pick type if only one kind is in stock
      if (!playerHasRobot(pendingRobotType)) {
        const inStock = Object.keys(robotsOwned).find(k => (robotsOwned[k] || 0) > 0);
        if (inStock) pendingRobotType = inStock;
        else { notify(`🤖 Buy a robot at the Shop (E) first!`); return; }
      }
      usePlayerRobot(pendingRobotType);
      const bot = new Robot(tx, ty, pendingRobotType);
      robots.push(bot);
      const td = ROBOT_TYPES[pendingRobotType] || ROBOT_TYPES.basic;
      notify(`${td.emoji} ${bot.name} deployed!`);
      updateUI(); checkMilestones();
    }
  } else {
    // Seed tools
    const cropType = currentTool;
    if (S.crops[cropType]) {
      if (!inventory.seeds[cropType] || inventory.seeds[cropType] <= 0) {
        notify(`❌ No ${cropType} seeds! Buy some at the Shop.`); return;
      }
      if (tile.type === 'tilled' && !tile.crop) {
        inventory.seeds[cropType]--;
        tile.crop = { type: cropType, stage: 0, growTimer: 0, waterCount: 0, watered: false };
        spawnParticles(tx * TILE + TILE/2, ty * TILE, 'dirt', 4);
        updateUI();
      } else if (tile.type !== 'tilled') notify(`⛏️ Till the soil first!`);
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * PLAYER ROBOT INVENTORY
 * ═══════════════════════════════════════════════════════════════════════════ */
let robotsOwned = { rust: 0, basic: S.player.startRobots || 0, pro: 0 };
let pendingRobotType = 'basic';
function playerHasRobot(type) { return (robotsOwned[type] || 0) > 0; }
function usePlayerRobot(type) { robotsOwned[type] = Math.max(0, (robotsOwned[type] || 0) - 1); }
function totalRobotsOwned() { return Object.values(robotsOwned).reduce((s,v) => s + v, 0); }

/* ═══════════════════════════════════════════════════════════════════════════
 * ECONOMY
 * ═══════════════════════════════════════════════════════════════════════════ */
let priceMultipliers = {};
function refreshPrices() {
  if (!S.economy.priceFluctuation) { for (const k of Object.keys(S.crops)) priceMultipliers[k] = 1; return; }
  for (const k of Object.keys(S.crops)) priceMultipliers[k] = 1 + (Math.random() - 0.5) * 2 * S.economy.fluctuationAmount;
}
refreshPrices();

function getCropPrice(type) { return Math.round((S.economy.cropPrices[type] || 10) * (priceMultipliers[type] || 1)); }

function buySeeds(type, qty) {
  const cost = (S.economy.seedPrices[type] || 5) * qty;
  if (coins < cost) { notify(`❌ Need ${cost} coins!`); return; }
  coins -= cost; inventory.seeds[type] = (inventory.seeds[type] || 0) + qty;
  notify(`✅ Bought ${qty}x ${S.crops[type]?.emoji} ${type} seeds!`);
  updateUI(); buildShop();
}

function buyRobot(type = 'basic') {
  const td = ROBOT_TYPES[type] || ROBOT_TYPES.basic;
  if (coins < td.cost) { notify(`❌ Need ${td.cost} coins!`); return; }
  coins -= td.cost;
  robotsOwned[type] = (robotsOwned[type] || 0) + 1;
  pendingRobotType = type;
  notify(`${td.emoji} ${td.name} purchased! Select Robot tool (9) to place.`);
  updateUI(); buildShop();
}

function sellCrop(type) {
  const qty = inventory.crops[type] || 0;
  if (qty <= 0) { notify(`❌ No ${type} to sell!`); return; }
  const threshold = getBuPopBulkThreshold();
  const bonus = qty >= threshold ? S.economy.bulkBonus : 1;
  const sellBonus = getBuPopSellBonus();
  const earned = Math.round(getCropPrice(type) * qty * bonus * sellBonus);
  coins += earned;
  productionStats.today.income += earned;
  COMPANIES.bupop.price = Math.min(2000, COMPANIES.bupop.price * (1 + earned * 0.00002));
  delete inventory.crops[type];
  notify(`💰 Sold ${qty}x ${type} for ${earned} coins${bonus > 1 ? ' (bulk bonus!)' : ''}!`);
  updateUI(); buildSellGrid();
}

function sellAll() {
  let total = 0;
  const threshold = getBuPopBulkThreshold();
  const sellBonus = getBuPopSellBonus();
  for (const [type, qty] of Object.entries(inventory.crops)) {
    if (qty > 0) {
      const bonus = qty >= threshold ? S.economy.bulkBonus : 1;
      total += Math.round(getCropPrice(type) * qty * bonus * sellBonus);
    }
  }
  if (total === 0) { notify(`❌ Nothing to sell!`); return; }
  coins += total;
  productionStats.today.income += total;
  COMPANIES.bupop.price = Math.min(2000, COMPANIES.bupop.price * (1 + total * 0.00002));
  inventory.crops = {};
  notify(`💰 Sold everything for ${total} coins!`);
  updateUI(); buildSellGrid();
}

/* ═══════════════════════════════════════════════════════════════════════════
 * PERK GETTERS (RFS & BuPop)
 * ═══════════════════════════════════════════════════════════════════════════ */
function getRFSBatteryBonus()  { return COMPANIES.rfs.sharesOwned >= 5  ? 0.9  : 1; }
function getRFSSpeedBonus()    { return COMPANIES.rfs.sharesOwned >= 15 ? 1.15 : 1; }
function getRFSMaxRobotBonus() { return COMPANIES.rfs.sharesOwned >= 30 ? 1    : 0; }
function getRFSWorkDelayBonus(){ return COMPANIES.rfs.sharesOwned >= 50 ? 0.75 : 1; }
function getBuPopSellBonus()   {
  const n = COMPANIES.bupop.sharesOwned;
  return n >= 25 ? 1.15 : n >= 3 ? 1.08 : 1;
}
function getBuPopBulkThreshold() { return COMPANIES.bupop.sharesOwned >= 8 ? 5 : 10; }

/* ═══════════════════════════════════════════════════════════════════════════
 * STOCK PRICE SIMULATION
 * ═══════════════════════════════════════════════════════════════════════════ */
function updateStockPrices() {
  // RFS: biased by robot count and recent robot harvests
  const rfsBias = 0.501 + Math.min(robots.length * 0.01, 0.1) + Math.min(productionStats.today.robotHarvests * 0.003, 0.1);
  const rfsDir = Math.random() < rfsBias ? 1 : -1;
  const rfsSwing = (0.01 + Math.random() * COMPANIES.rfs.volatility) * COMPANIES.rfs.price;
  COMPANIES.rfs.price = Math.max(5, Math.min(800, COMPANIES.rfs.price + rfsDir * rfsSwing));
  COMPANIES.rfs.priceHistory.push(Math.round(COMPANIES.rfs.price * 10) / 10);
  if (COMPANIES.rfs.priceHistory.length > 30) COMPANIES.rfs.priceHistory.shift();

  // BuPop: biased by sell income and seasonal demand
  const seasonFactors = [1.08, 1.02, 1.12, 0.88];
  const seasonMod = seasonFactors[season % 4] || 1;
  const bpBias = 0.501 + Math.min(productionStats.today.income * 0.00004, 0.1) + (seasonMod - 1) * 0.3;
  const bpDir = Math.random() < bpBias ? 1 : -1;
  const bpSwing = (0.01 + Math.random() * COMPANIES.bupop.volatility) * COMPANIES.bupop.price;
  COMPANIES.bupop.price = Math.max(5, Math.min(2000, COMPANIES.bupop.price + bpDir * bpSwing));
  COMPANIES.bupop.priceHistory.push(Math.round(COMPANIES.bupop.price * 10) / 10);
  if (COMPANIES.bupop.priceHistory.length > 30) COMPANIES.bupop.priceHistory.shift();
}

function onNewDay() {
  updateStockPrices();

  // Record production stats for the day that just ended
  productionStats.history.push({ ...productionStats.today, day: day - 1 });
  if (productionStats.history.length > 30) productionStats.history.shift();

  // Pay dividends
  const rfsDividend  = Math.floor(COMPANIES.rfs.sharesOwned  * COMPANIES.rfs.dividend);
  const bpDividend   = Math.floor(COMPANIES.bupop.sharesOwned * COMPANIES.bupop.dividend);
  const totalDiv = rfsDividend + bpDividend;
  if (totalDiv > 0) {
    coins += totalDiv;
    notify(`💹 Dividends: +${totalDiv} coins (RFS: ${rfsDividend}, BPOP: ${bpDividend})`);
  }

  // Reset today's stats
  productionStats.today = { income:0, harvested:0, robotHarvests:0, cropBreakdown:{} };

  // Refresh UI if economy modal is open
  const econModal = document.getElementById('modal-economy');
  if (econModal && !econModal.classList.contains('hidden')) refreshEconomyUI();
}

/* ═══════════════════════════════════════════════════════════════════════════
 * STOCK / PRODUCTION CHART DRAWING
 * ═══════════════════════════════════════════════════════════════════════════ */
function drawStockChart(canvas, company, mini) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const pw = rect.width || canvas.offsetWidth || 300;
  const ph = rect.height || canvas.offsetHeight || (mini ? 50 : 200);
  canvas.width  = pw * dpr;
  canvas.height = ph * dpr;
  const c = canvas.getContext('2d');
  c.scale(dpr, dpr);
  const w = pw, h = ph;
  c.clearRect(0, 0, w, h);

  const hist = company.priceHistory;
  if (hist.length < 2) {
    c.fillStyle = company.color + '30';
    c.fillRect(0, 0, w, h);
    c.fillStyle = company.color;
    c.font = `${mini ? 10 : 13}px VT323, monospace`;
    c.fillText('No data yet', 6, h / 2 + 4);
    return;
  }

  const mn = Math.min(...hist) * 0.95;
  const mx = Math.max(...hist) * 1.05;
  const rng = mx - mn || 1;
  const toY = v => h - 4 - ((v - mn) / rng) * (h - 8);
  const toX = i => (i / (hist.length - 1)) * w;
  const isUp = hist[hist.length - 1] >= hist[0];
  const lineCol = isUp ? '#4a9c3f' : '#c44040';

  // Gradient fill
  const grad = c.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, company.color + '55');
  grad.addColorStop(1, company.color + '08');
  c.beginPath();
  c.moveTo(toX(0), h);
  for (let i = 0; i < hist.length; i++) c.lineTo(toX(i), toY(hist[i]));
  c.lineTo(toX(hist.length - 1), h);
  c.closePath();
  c.fillStyle = grad;
  c.fill();

  // Line
  c.beginPath();
  c.moveTo(toX(0), toY(hist[0]));
  for (let i = 1; i < hist.length; i++) c.lineTo(toX(i), toY(hist[i]));
  c.strokeStyle = lineCol;
  c.lineWidth = mini ? 1.5 : 2;
  c.stroke();

  // Last-point dot
  const lx = toX(hist.length - 1), ly = toY(hist[hist.length - 1]);
  c.beginPath();
  c.arc(lx, ly, mini ? 2.5 : 4, 0, Math.PI * 2);
  c.fillStyle = lineCol;
  c.fill();

  if (!mini) {
    // Grid lines
    c.strokeStyle = 'rgba(255,255,255,0.08)';
    c.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const gy = h * i / 4;
      c.beginPath(); c.moveTo(0, gy); c.lineTo(w, gy); c.stroke();
      const pv = mx - rng * i / 4;
      c.fillStyle = 'rgba(255,255,255,0.35)';
      c.font = '11px VT323, monospace';
      c.fillText(Math.round(pv), 3, gy - 2);
    }
    // Day labels
    const step = Math.max(1, Math.ceil(hist.length / 8));
    c.fillStyle = 'rgba(255,255,255,0.3)';
    c.font = '10px VT323, monospace';
    for (let i = 0; i < hist.length; i += step) {
      c.fillText(`D${i+1}`, toX(i) - 6, h - 1);
    }
  }
}

function drawIncomeChart(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const pw = rect.width || canvas.offsetWidth || 400;
  const ph = rect.height || canvas.offsetHeight || 140;
  canvas.width  = pw * dpr;
  canvas.height = ph * dpr;
  const c = canvas.getContext('2d');
  c.scale(dpr, dpr);
  const w = pw, h = ph;
  c.clearRect(0, 0, w, h);

  const bars = [...productionStats.history.slice(-13), { ...productionStats.today, day }];
  if (!bars.length) return;

  const maxVal = Math.max(...bars.map(d => d.income), 1);
  const barW = w / bars.length;
  const pad = 2;
  const labelH = 18;

  bars.forEach((d, i) => {
    const isToday = i === bars.length - 1;
    const barH = Math.max(1, (d.income / maxVal) * (h - labelH - 4));
    const x = i * barW + pad;
    const y = h - labelH - barH;
    c.fillStyle = isToday ? '#f5c842' : '#c9973a66';
    c.fillRect(x, y, barW - pad * 2, barH);
    c.fillStyle = isToday ? 'rgba(245,200,66,0.2)' : 'transparent';
    if (isToday) c.fillRect(x, 0, barW - pad * 2, h - labelH);
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.font = '10px VT323, monospace';
    const label = d.day !== undefined ? String(d.day) : '?';
    c.fillText(label, x + (barW - pad * 2) / 2 - 3, h - 4);
  });

  // Y label
  c.fillStyle = 'rgba(255,255,255,0.5)';
  c.font = '11px VT323, monospace';
  c.fillText(maxVal, 2, 12);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * ECONOMY UI
 * ═══════════════════════════════════════════════════════════════════════════ */
function refreshEconomyUI() {
  const rfs   = COMPANIES.rfs;
  const bupop = COMPANIES.bupop;

  // --- Market tab ---
  const fmt = v => Math.round(v * 10) / 10;

  // RFS price + change
  const rfsPrev = rfs.priceHistory.length >= 2 ? rfs.priceHistory[rfs.priceHistory.length - 2] : rfs.price;
  const rfsChg  = rfs.price - rfsPrev;
  const rfsChgPct = rfsPrev ? ((rfsChg / rfsPrev) * 100).toFixed(1) : '0.0';
  const rfsPriceEl  = document.getElementById('econ-rfs-price');
  const rfsChangeEl = document.getElementById('econ-rfs-change');
  if (rfsPriceEl)  rfsPriceEl.textContent  = fmt(rfs.price) + ' ¢';
  if (rfsChangeEl) {
    rfsChangeEl.textContent = (rfsChg >= 0 ? '▲' : '▼') + Math.abs(rfsChgPct) + '%';
    rfsChangeEl.className   = 'stock-change ' + (rfsChg >= 0 ? 'up' : 'down');
  }
  const rfsSharesEl = document.getElementById('econ-rfs-shares');
  const rfsValueEl  = document.getElementById('econ-rfs-value');
  if (rfsSharesEl) rfsSharesEl.textContent = rfs.sharesOwned;
  if (rfsValueEl)  rfsValueEl.textContent  = Math.round(rfs.sharesOwned * rfs.price) + ' ¢';
  const rfsCostEl = document.getElementById('econ-rfs-cost');
  const rfsQtyEl  = document.getElementById('rfs-qty');
  if (rfsCostEl && rfsQtyEl) {
    const q = parseInt(rfsQtyEl.value) || 1;
    rfsCostEl.textContent = `Buy ${q}: ${Math.round(rfs.price * q)} ¢  |  Sell ${q}: ${Math.round(rfs.price * q)} ¢`;
  }

  // BuPop price + change
  const bpPrev = bupop.priceHistory.length >= 2 ? bupop.priceHistory[bupop.priceHistory.length - 2] : bupop.price;
  const bpChg  = bupop.price - bpPrev;
  const bpChgPct = bpPrev ? ((bpChg / bpPrev) * 100).toFixed(1) : '0.0';
  const bpPriceEl  = document.getElementById('econ-bupop-price');
  const bpChangeEl = document.getElementById('econ-bupop-change');
  if (bpPriceEl)  bpPriceEl.textContent  = fmt(bupop.price) + ' ¢';
  if (bpChangeEl) {
    bpChangeEl.textContent = (bpChg >= 0 ? '▲' : '▼') + Math.abs(bpChgPct) + '%';
    bpChangeEl.className   = 'stock-change ' + (bpChg >= 0 ? 'up' : 'down');
  }
  const bpSharesEl = document.getElementById('econ-bupop-shares');
  const bpValueEl  = document.getElementById('econ-bupop-value');
  if (bpSharesEl) bpSharesEl.textContent = bupop.sharesOwned;
  if (bpValueEl)  bpValueEl.textContent  = Math.round(bupop.sharesOwned * bupop.price) + ' ¢';
  const bpCostEl = document.getElementById('econ-bupop-cost');
  const bpQtyEl  = document.getElementById('bupop-qty');
  if (bpCostEl && bpQtyEl) {
    const q = parseInt(bpQtyEl.value) || 1;
    bpCostEl.textContent = `Buy ${q}: ${Math.round(bupop.price * q)} ¢  |  Sell ${q}: ${Math.round(bupop.price * q)} ¢`;
  }

  // Sparklines
  const slRFS = document.getElementById('sparkline-rfs');
  if (slRFS) drawStockChart(slRFS, rfs, true);
  const slBP = document.getElementById('sparkline-bupop');
  if (slBP) drawStockChart(slBP, bupop, true);

  // --- Charts tab ---
  const priceCanvas = document.getElementById('price-chart-canvas');
  if (priceCanvas && priceCanvas.getBoundingClientRect().width > 0) {
    drawStockChart(priceCanvas, chartViewCompany === 'rfs' ? rfs : bupop, false);
  }
  const chartLabel = document.getElementById('chart-label');
  const co = chartViewCompany === 'rfs' ? rfs : bupop;
  if (chartLabel) chartLabel.textContent = `${co.ticker} — ${co.priceHistory.length}-day price history`;

  // --- Production tab ---
  const prodIncome = document.getElementById('prod-income');
  const prodHarv   = document.getElementById('prod-harvested');
  const prodRobot  = document.getElementById('prod-robot-harvests');
  if (prodIncome)  prodIncome.textContent  = productionStats.today.income;
  if (prodHarv)    prodHarv.textContent    = productionStats.today.harvested;
  if (prodRobot)   prodRobot.textContent   = productionStats.today.robotHarvests;
  const incomeCanvas = document.getElementById('income-chart-canvas');
  if (incomeCanvas && incomeCanvas.getBoundingClientRect().width > 0) drawIncomeChart(incomeCanvas);

  // --- Companies tab: perk unlock state ---
  const rfsPerks  = [[5,'rfs-perk-0','rfs-badge-0'],[15,'rfs-perk-1','rfs-badge-1'],[30,'rfs-perk-2','rfs-badge-2'],[50,'rfs-perk-3','rfs-badge-3']];
  const bpPerks   = [[3,'bupop-perk-0','bupop-badge-0'],[8,'bupop-perk-1','bupop-badge-1'],[15,'bupop-perk-2','bupop-badge-2'],[25,'bupop-perk-3','bupop-badge-3']];
  rfsPerks.forEach(([req, perkId, badgeId]) => {
    const unlocked = rfs.sharesOwned >= req;
    const perkEl  = document.getElementById(perkId);
    const badgeEl = document.getElementById(badgeId);
    if (perkEl)  { perkEl.classList.toggle('unlocked', unlocked); }
    if (badgeEl) { badgeEl.textContent = unlocked ? '✓ ACTIVE' : 'LOCKED'; badgeEl.className = 'perk-badge ' + (unlocked ? 'unlocked' : 'locked'); }
  });
  bpPerks.forEach(([req, perkId, badgeId]) => {
    const unlocked = bupop.sharesOwned >= req;
    const perkEl  = document.getElementById(perkId);
    const badgeEl = document.getElementById(badgeId);
    if (perkEl)  { perkEl.classList.toggle('unlocked', unlocked); perkEl.classList.toggle('bp', unlocked); }
    if (badgeEl) { badgeEl.textContent = unlocked ? '✓ ACTIVE' : 'LOCKED'; badgeEl.className = 'perk-badge ' + (unlocked ? 'unlocked bp' : 'locked'); }
  });
}

function setChartView(id) {
  chartViewCompany = id;
  document.getElementById('chart-btn-rfs').className   = 'chart-toggle-btn' + (id === 'rfs'   ? ' active-rfs'   : '');
  document.getElementById('chart-btn-bupop').className = 'chart-toggle-btn' + (id === 'bupop' ? ' active-bupop' : '');
  refreshEconomyUI();
}

/* ═══════════════════════════════════════════════════════════════════════════
 * BUY / SELL SHARES
 * ═══════════════════════════════════════════════════════════════════════════ */
function buyShares(companyId, rawQty) {
  const co = COMPANIES[companyId];
  if (!co) return;
  const qty = Math.max(1, parseInt(rawQty) || 1);
  const cost = Math.round(co.price * qty);
  if (coins < cost) { notify(`❌ Need ${cost} coins to buy ${qty}x ${co.ticker}!`); return; }
  coins -= cost;
  co.sharesOwned += qty;
  notify(`📈 Bought ${qty}x ${co.ticker} for ${cost} coins!`);
  updateUI(); refreshEconomyUI();
}

function sellShares(companyId, rawQty) {
  const co = COMPANIES[companyId];
  if (!co) return;
  const qty = Math.max(1, parseInt(rawQty) || 1);
  if (co.sharesOwned < qty) { notify(`❌ You only own ${co.sharesOwned}x ${co.ticker}!`); return; }
  const earned = Math.round(co.price * qty);
  coins += earned;
  co.sharesOwned -= qty;
  notify(`📉 Sold ${qty}x ${co.ticker} for ${earned} coins!`);
  updateUI(); refreshEconomyUI();
}
