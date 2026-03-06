/* ═══════════════════════════════════════════════════════════════════════════
 * CROP SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════ */
let cropTick = 0;
let _activeGrowthPass = null;
const _growthPassQueue = [];

function getHarvestYieldForTile(x, y, cropType) {
  const cfg = S.crops[cropType];
  if (!cfg) return 1;
  const base = Math.max(1, Math.floor(cfg.yield || 1));
  const fertility = (typeof getTileFertilityValue === 'function') ? getTileFertilityValue(x, y) : 50;

  // Moderate fertility impact: slight downside for poor land, slight upside for rich land.
  if (fertility < 35 && base > 1 && Math.random() < 0.1) return base - 1;
  if (fertility > 75 && Math.random() < 0.15) return base + 1;
  return base;
}

function normalizeCropHydration(crop) {
  if (!crop || typeof crop !== 'object') return;
  if (!Number.isFinite(crop.waterCount) || crop.waterCount < 0) crop.waterCount = 0;
  if (!Number.isFinite(crop.waterDay)) crop.waterDay = day;
  if (crop.waterDay !== day) {
    crop.waterDay = day;
    crop.waterCount = 0;
    crop.watered = false;
  }
}

function normalizeCropState(crop, cfg) {
  if (!crop || typeof crop !== 'object' || !cfg) return false;
  const stageMax = Math.max(0, (cfg.stages || 1) - 1);
  const stageTime = Math.max(1, Number(cfg.growTime) / Math.max(1, cfg.stages - 1));
  if (!Number.isFinite(crop.stage)) crop.stage = 0;
  crop.stage = Math.max(0, Math.min(stageMax, Math.floor(crop.stage)));
  if (!Number.isFinite(crop.growTimer) || crop.growTimer < 0) {
    crop.growTimer = crop.stage * stageTime;
  }
  normalizeCropHydration(crop);
  return true;
}

function _queueGrowthPass(growEvery) {
  const seasonName = SEASONS[season % SEASONS.length];
  if (seasonName === 'Winter' && S.time.winterEnabled) return;
  _growthPassQueue.push({
    x: 0,
    y: 0,
    growEvery,
    growthBoost: Math.max(0.25, Number(S.time.cropGrowthMultiplier) || 1.35),
    dryRate: Math.max(0, Math.min(1, Number(S.time.dryGrowthRate ?? 0.45))),
    weatherHydration: (typeof getWeatherHydration === 'function')
      ? Math.max(0, Math.min(1, getWeatherHydration()))
      : (rainDay ? 1 : 0),
    weatherGrowth: (typeof getWeatherGrowthMultiplier === 'function')
      ? Math.max(0.5, getWeatherGrowthMultiplier())
      : 1,
  });
}

function _processGrowthPass(pass, tileBudget) {
  const budget = Math.max(1, Math.floor(Number(tileBudget) || 1));
  let processed = 0;

  while (pass.y < WH && processed < budget) {
    const row = world[pass.y];
    if (!Array.isArray(row)) {
      pass.y++;
      pass.x = 0;
      continue;
    }

    while (pass.x < WW && processed < budget) {
      const x = pass.x;
      const y = pass.y;
      pass.x++;
      processed++;

      const tile = row[x];
      if (!tile || !tile.crop) continue;
      const crop = tile.crop;
      const cfg = S.crops[crop.type];
      if (!cfg) continue;
      if (!normalizeCropState(crop, cfg)) continue;

      const waterNeed = Math.max(1, Number(cfg.waterNeeded) || 1);
      const moistureBonus = (typeof getTileMoistureBonus === 'function') ? getTileMoistureBonus(x, y) : 0;
      const hydration = Math.max(pass.weatherHydration, Math.min(1, (crop.waterCount + moistureBonus) / waterNeed));
      const fertilityGrowth = (typeof getTileFertilityGrowthMult === 'function') ? getTileFertilityGrowthMult(x, y) : 1;
      const growthRate = (pass.dryRate + (1 - pass.dryRate) * hydration) * fertilityGrowth;
      crop.growTimer += pass.growEvery * growthRate * pass.growthBoost * pass.weatherGrowth;

      const stageMax = Math.max(1, (Math.floor(Number(cfg.stages) || 2) - 1));
      const stageTime = Math.max(1, Number(cfg.growTime) / stageMax);
      const newStage = Math.min(stageMax, Math.floor(crop.growTimer / stageTime));
      if (newStage > crop.stage) {
        crop.stage = newStage;
        if (crop.stage >= stageMax) spawnParticles(x * TILE + TILE / 2, y * TILE, 'grow', 8);
      }
    }

    if (pass.x >= WW) {
      pass.x = 0;
      pass.y++;
    }
  }

  return pass.y >= WH;
}

function resetCropGrowthScheduler() {
  cropTick = 0;
  _activeGrowthPass = null;
  _growthPassQueue.length = 0;
}

window.resetCropGrowthScheduler = resetCropGrowthScheduler;

function updateCrops() {
  cropTick++;
  const growEvery = Math.max(5, Math.floor(S.time.growthTickInterval || 20));
  if (cropTick % growEvery === 0) _queueGrowthPass(growEvery);
  if (!_activeGrowthPass && _growthPassQueue.length > 0) _activeGrowthPass = _growthPassQueue.shift();
  if (!_activeGrowthPass) return;

  const baseBudget = Math.max(320, Math.floor(Number(S.time.cropGrowthTileBudget) || (WW * 8)));
  const catchupMul = 1 + Math.min(4, _growthPassQueue.length);
  const done = _processGrowthPass(_activeGrowthPass, baseBudget * catchupMul);
  if (done) _activeGrowthPass = null;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * PARTICLES
 * ═══════════════════════════════════════════════════════════════════════════ */
let particles = [];
const MAX_PARTICLES = S.display.particleCount === 'low' ? 50 : S.display.particleCount === 'medium' ? 150 : 300;

function spawnDrivingDust(px, py) {
  const count = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < count; i++) {
    particles.push({
      x: px + (Math.random() - 0.5) * TILE * 0.8,
      y: py + (Math.random() - 0.5) * TILE * 0.4,
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5,
      life: 0.6 + Math.random() * 0.3,
      size: 2 + Math.random() * 2,
      color: '#b89c78',
    });
  }
}

function spawnParticles(px, py, type, count) {
  if (particles.length >= MAX_PARTICLES) return;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 2.5;
    let color = '#ffffff';
    if (type === 'water') color = ['#4fc3f7','#29b6f6','#81d4fa'][i%3];
    else if (type === 'harvest') color = ['#f5c842','#a5d86e','#ff9944'][i%3];
    else if (type === 'dirt') color = ['#7d5a2a','#5c3d18','#9b7a45'][i%3];
    else if (type === 'grow') color = ['#66bb6a','#a5d86e','#fff176'][i%3];
    particles.push({ x: px, y: py, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed - 1, life: 1, color, size: 2 + Math.random() * 3 });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy;
    p.vy += 0.08; p.life -= 0.03;
    if (p.life <= 0) particles.splice(i, 1);
  }
}
