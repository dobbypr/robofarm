/* ═══════════════════════════════════════════════════════════════════════════
 * CROP SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════ */
let cropTick = 0;

function updateCrops() {
  cropTick++;
  if (cropTick % 30 !== 0) return;

  const season_name = SEASONS[season % SEASONS.length];
  if (season_name === 'Winter' && S.time.winterEnabled) return;

  for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) {
    const tile = world[y][x];
    if (!tile.crop) continue;
    const crop = tile.crop;
    const cfg = S.crops[crop.type];
    if (!cfg) continue;

    if (crop.watered || rainDay) {
      crop.growTimer += 30;
      if (crop.watered) { crop.waterCount++; crop.watered = false; }
    }

    const stageTime = cfg.growTime / cfg.stages;
    const newStage = Math.min(cfg.stages - 1, Math.floor(crop.growTimer / stageTime));
    if (newStage > crop.stage) {
      crop.stage = newStage;
      if (crop.stage >= cfg.stages - 1) spawnParticles(x * TILE + TILE/2, y * TILE, 'grow', 8);
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * PARTICLES
 * ═══════════════════════════════════════════════════════════════════════════ */
let particles = [];
const MAX_PARTICLES = S.display.particleCount === 'low' ? 50 : S.display.particleCount === 'medium' ? 150 : 300;

function spawnParticles(px, py, type, count) {
  if (particles.length > MAX_PARTICLES) return;
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
