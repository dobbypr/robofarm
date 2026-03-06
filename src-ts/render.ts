/* @generated from src-ts/render.ts — run npm run build:ts */
// @ts-nocheck
/* ═══════════════════════════════════════════════════════════════════════════
 * RENDERING
 * ═══════════════════════════════════════════════════════════════════════════ */
const gameCanvas = document.getElementById('game');
const ctx = gameCanvas.getContext('2d');
let W = 0, H = 0;

const GRASS_COLORS = ['#3d7f38','#4a8c44','#44864e','#529448'];
const WATER_COLORS = ['#1a6fa3','#2478b0','#1c7abd'];
const FLOWER_COLORS = ['#ff6b9d','#ff9f43','#ffd32a','#a29bfe','#ff7675'];
const TREE_TRUNK = '#5c3d1a';
const TREE_CANOPY = ['#2d6e25','#356b2a','#3d7a32','#2a6020'];
const _VISIBLE_CROPS = [];

const _requestIdle = (typeof window.requestIdleCallback === 'function')
  ? (cb => window.requestIdleCallback(cb, { timeout: 34 }))
  : (cb => window.setTimeout(() => cb({ didTimeout: true, timeRemaining: () => 0 }), 16));
const _cancelIdle = (typeof window.cancelIdleCallback === 'function')
  ? (id => window.cancelIdleCallback(id))
  : (id => window.clearTimeout(id));

const _RENDER_CACHE = {
  chunkTiles: Math.max(6, Math.min(24, Math.floor(Number(S.display?.renderCacheChunkTiles) || 12))),
  enabled: S.display?.renderCacheEnabled !== false,
  asyncBuild: S.display?.asyncChunkBuild !== false,
  syncBuildBudget: Math.max(1, Math.floor(Number(S.display?.chunkBuildBudgetFrame) || 1)),
  idleBuildBudget: Math.max(1, Math.floor(Number(S.display?.chunkBuildBudgetIdle) || 6)),
  worldW: 0,
  worldH: 0,
  cols: 0,
  rows: 0,
  chunkPx: 0,
  chunks: [],
  dirtyQueue: [],
  queuedCount: 0,
  idleHandle: 0,
};

function _createChunkCanvas(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d', { alpha: true });
  return {
    canvas,
    context,
    dirty: true,
    ready: false,
    queued: false,
    cx: 0,
    cy: 0,
  };
}

function _cacheChunkIndex(cx, cy) {
  return cy * _RENDER_CACHE.cols + cx;
}

function _ensureRenderCache() {
  if (!_RENDER_CACHE.enabled) return;
  if (_RENDER_CACHE.worldW === WW && _RENDER_CACHE.worldH === WH && _RENDER_CACHE.chunkPx === _RENDER_CACHE.chunkTiles * TILE && _RENDER_CACHE.chunks.length > 0) {
    return;
  }
  if (_RENDER_CACHE.idleHandle) {
    _cancelIdle(_RENDER_CACHE.idleHandle);
    _RENDER_CACHE.idleHandle = 0;
  }
  _RENDER_CACHE.worldW = WW;
  _RENDER_CACHE.worldH = WH;
  _RENDER_CACHE.chunkPx = _RENDER_CACHE.chunkTiles * TILE;
  _RENDER_CACHE.cols = Math.ceil(WW / _RENDER_CACHE.chunkTiles);
  _RENDER_CACHE.rows = Math.ceil(WH / _RENDER_CACHE.chunkTiles);
  _RENDER_CACHE.chunks = new Array(_RENDER_CACHE.cols * _RENDER_CACHE.rows);
  _RENDER_CACHE.dirtyQueue.length = 0;
  _RENDER_CACHE.queuedCount = 0;
  for (let cy = 0; cy < _RENDER_CACHE.rows; cy++) {
    for (let cx = 0; cx < _RENDER_CACHE.cols; cx++) {
      const chunk = _createChunkCanvas(_RENDER_CACHE.chunkPx);
      chunk.cx = cx;
      chunk.cy = cy;
      _RENDER_CACHE.chunks[_cacheChunkIndex(cx, cy)] = chunk;
    }
  }
}

function _queueChunkBuild(chunk) {
  if (!_RENDER_CACHE.asyncBuild) return;
  if (!chunk || !chunk.dirty || chunk.queued) return;
  chunk.queued = true;
  _RENDER_CACHE.dirtyQueue.push(chunk);
  _RENDER_CACHE.queuedCount++;
  _scheduleChunkBuildPump();
}

function _popQueuedChunk() {
  while (_RENDER_CACHE.dirtyQueue.length > 0) {
    const chunk = _RENDER_CACHE.dirtyQueue.shift();
    if (!chunk) continue;
    if (_RENDER_CACHE.queuedCount > 0) _RENDER_CACHE.queuedCount--;
    chunk.queued = false;
    if (!chunk.dirty) continue;
    return chunk;
  }
  return null;
}

function _buildQueuedChunks(maxBuilds, deadline = null) {
  let built = 0;
  const hardLimit = Math.max(1, Math.floor(Number(maxBuilds) || 1));
  while (built < hardLimit) {
    if (deadline && built > 0 && typeof deadline.timeRemaining === 'function' && deadline.timeRemaining() < 2) break;
    const chunk = _popQueuedChunk();
    if (!chunk) break;
    _rerenderTerrainChunk(chunk.cx, chunk.cy, chunk);
    built++;
  }
  return built;
}

function _scheduleChunkBuildPump() {
  if (!_RENDER_CACHE.enabled || !_RENDER_CACHE.asyncBuild) return;
  if (_RENDER_CACHE.idleHandle) return;
  if (_RENDER_CACHE.queuedCount <= 0) return;
  _RENDER_CACHE.idleHandle = _requestIdle(_runChunkBuildPump);
}

function _runChunkBuildPump(deadline) {
  _RENDER_CACHE.idleHandle = 0;
  if (!_RENDER_CACHE.enabled || !_RENDER_CACHE.asyncBuild) return;
  _buildQueuedChunks(_RENDER_CACHE.idleBuildBudget, deadline || null);
  if (_RENDER_CACHE.queuedCount > 0) _scheduleChunkBuildPump();
}

function _chunkForTile(x, y) {
  if (!_RENDER_CACHE.enabled) return null;
  _ensureRenderCache();
  const cx = Math.floor(x / _RENDER_CACHE.chunkTiles);
  const cy = Math.floor(y / _RENDER_CACHE.chunkTiles);
  if (cx < 0 || cy < 0 || cx >= _RENDER_CACHE.cols || cy >= _RENDER_CACHE.rows) return null;
  return _RENDER_CACHE.chunks[_cacheChunkIndex(cx, cy)] || null;
}

function markTileDirty(x, y) {
  const chunk = _chunkForTile(x, y);
  if (chunk) {
    chunk.dirty = true;
    _queueChunkBuild(chunk);
  }
}

function markTilesDirtyRect(x0, y0, x1, y1) {
  if (!_RENDER_CACHE.enabled) return;
  _ensureRenderCache();
  const minX = Math.max(0, Math.min(x0, x1));
  const minY = Math.max(0, Math.min(y0, y1));
  const maxX = Math.min(WW - 1, Math.max(x0, x1));
  const maxY = Math.min(WH - 1, Math.max(y0, y1));
  const cx0 = Math.floor(minX / _RENDER_CACHE.chunkTiles);
  const cy0 = Math.floor(minY / _RENDER_CACHE.chunkTiles);
  const cx1 = Math.floor(maxX / _RENDER_CACHE.chunkTiles);
  const cy1 = Math.floor(maxY / _RENDER_CACHE.chunkTiles);
  for (let cy = cy0; cy <= cy1; cy++) {
    for (let cx = cx0; cx <= cx1; cx++) {
      const chunk = _RENDER_CACHE.chunks[_cacheChunkIndex(cx, cy)];
      if (chunk) {
        chunk.dirty = true;
        _queueChunkBuild(chunk);
      }
    }
  }
}

function markAllTilesDirty() {
  if (!_RENDER_CACHE.enabled) return;
  _ensureRenderCache();
  for (const chunk of _RENDER_CACHE.chunks) {
    if (!chunk) continue;
    chunk.dirty = true;
    _queueChunkBuild(chunk);
  }
}

window.markTileDirty = markTileDirty;
window.markTilesDirtyRect = markTilesDirtyRect;
window.markAllTilesDirty = markAllTilesDirty;

function _cropStageProgress(crop, cfg) {
  const stages = Math.max(1, Math.floor(Number(cfg?.stages) || 1));
  const stageMax = Math.max(1, stages - 1);
  const stage = Math.max(0, Math.min(stageMax, Math.floor(Number(crop?.stage) || 0)));
  return { stage, stageMax, progress: stage / stageMax };
}

function resize() {
  W = window.innerWidth; H = window.innerHeight;
  gameCanvas.width = W; gameCanvas.height = H;
  cursorCanvas.width = W; cursorCanvas.height = H;
}

let animTime = 0;

function render() {
  _CROP_TEXTURE_CACHE.frameBuilds = 0;
  _processCropTextureQueue(_CROP_TEXTURE_CACHE.syncBuildBudget);

  ctx.save();
  ctx.clearRect(0, 0, W, H);

  // Sky
  const dayProgress = tick / TPDAY;
  const skyColor = getSkyColor(dayProgress);
  ctx.fillStyle = skyColor;
  ctx.fillRect(0, 0, W, H);

  // Camera transform
  ctx.setTransform(camera.zoom, 0, 0, camera.zoom, camera.x, camera.y);

  // Viewport culling
  const vx0 = Math.max(0, Math.floor(-camera.x / (TILE * camera.zoom)) - 1);
  const vy0 = Math.max(0, Math.floor(-camera.y / (TILE * camera.zoom)) - 1);
  const vx1 = Math.min(WW - 1, Math.ceil((W - camera.x) / (TILE * camera.zoom)) + 1);
  const vy1 = Math.min(WH - 1, Math.ceil((H - camera.y) / (TILE * camera.zoom)) + 1);

  // Draw cached terrain base layer, then per-frame tile overlays.
  drawTerrainLayer(vx0, vy0, vx1, vy1);
  _VISIBLE_CROPS.length = 0;
  for (let y = vy0; y <= vy1; y++) {
    const row = world[y];
    for (let x = vx0; x <= vx1; x++) {
      drawTileDynamicOverlay(x, y);
      if (row[x].crop) {
        _VISIBLE_CROPS.push(x, y);
      }
    }
  }

  // Draw crops
  for (let i = 0; i < _VISIBLE_CROPS.length; i += 2) {
    drawCrop(_VISIBLE_CROPS[i], _VISIBLE_CROPS[i + 1]);
  }

  // Draw ambient bots whenever menu ambient mode is active.
  if (gameState === 'menu' &&
      typeof ambientActive !== 'undefined' &&
      ambientActive &&
      typeof AMBIENT_BOTS !== 'undefined') {
    for (const bot of AMBIENT_BOTS) drawRobot(bot);
  } else {
    for (const bot of robots) drawRobot(bot);
  }

  // Draw vehicle
  drawVehicle();

  // Draw player (hidden when driving)
  if (!vehicle.occupied) drawPlayer();

  // Draw particles
  for (const p of particles) {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  // Draw robot work areas
  if (S.display.showRobotPath) {
    for (const bot of robots) {
      if (bot.workArea && selectedRobotId === bot.id) {
        ctx.strokeStyle = 'rgba(255,200,50,0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc((bot.workArea.x + 0.5) * TILE, (bot.workArea.y + 0.5) * TILE, bot.workArea.radius * TILE, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (bot.path && bot.path.length > 0 && selectedRobotId === bot.id) {
        ctx.strokeStyle = 'rgba(100,200,255,0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(bot.px + TILE/2, bot.py + TILE/2);
        for (const step of bot.path) ctx.lineTo(step.x * TILE + TILE/2, step.y * TILE + TILE/2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  // Highlight hovered tile
  const htx = Math.floor(mouseWorld.x / TILE);
  const hty = Math.floor(mouseWorld.y / TILE);
  if (inBounds(htx, hty)) {
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.5 / camera.zoom;
    ctx.strokeRect(htx * TILE + 0.5, hty * TILE + 0.5, TILE - 1, TILE - 1);
  }

  // Night overlay
  const nightAlpha = getNightAlpha(dayProgress);
  if (nightAlpha > 0) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = `rgba(10, 5, 30, ${nightAlpha})`;
    ctx.fillRect(0, 0, W, H);
    // Stars at night
      if (nightAlpha > 0.3) drawStars(nightAlpha);
  }

  // Weather overlay
  if (weatherType !== 'clear' || weatherFlash > 0) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawWeatherOverlay();
  }

  ctx.restore();
}

function getSkyColor(dp) {
  if (dp < 0.2) return lerpColor('#0d1b3e', '#ff8c42', dp / 0.2);
  if (dp < 0.4) return lerpColor('#ff8c42', '#87ceeb', (dp - 0.2) / 0.2);
  if (dp < 0.7) return '#87ceeb';
  if (dp < 0.85) return lerpColor('#87ceeb', '#ff6b35', (dp - 0.7) / 0.15);
  return lerpColor('#ff6b35', '#0d1b3e', (dp - 0.85) / 0.15);
}

function getNightAlpha(dp) {
  if (dp < 0.1) return lerp(0.7, 0, dp / 0.1);
  if (dp > 0.9) return lerp(0, 0.7, (dp - 0.9) / 0.1);
  return 0;
}

function lerpColor(c1, c2, t) {
  const r1 = parseInt(c1.slice(1,3),16), g1 = parseInt(c1.slice(3,5),16), b1 = parseInt(c1.slice(5,7),16);
  const r2 = parseInt(c2.slice(1,3),16), g2 = parseInt(c2.slice(3,5),16), b2 = parseInt(c2.slice(5,7),16);
  return `rgb(${Math.round(r1+(r2-r1)*t)},${Math.round(g1+(g2-g1)*t)},${Math.round(b1+(b2-b1)*t)})`;
}

function drawStars(alpha) {
  ctx.fillStyle = `rgba(255,255,255,${alpha * 0.6})`;
  for (let i = 0; i < 80; i++) {
    const sx = hash2(i * 7, 1) * W;
    const sy = hash2(i * 3, 2) * H * 0.5;
    const blink = Math.sin(animTime * 0.05 + i) * 0.3 + 0.7;
    ctx.globalAlpha = alpha * blink * 0.7;
    ctx.fillRect(sx, sy, 1.5, 1.5);
  }
  ctx.globalAlpha = 1;
}

function drawWeatherOverlay() {
  const wt = (typeof normalizeWeatherType === 'function') ? normalizeWeatherType(weatherType) : (rainDay ? 'rain' : 'clear');
  const strength = Math.max(0.25, Math.min(1.5, Number(weatherIntensity) || 0.8));
  if (wt === 'clear') {
    if (weatherFlash > 0) drawLightningFlash(weatherFlash);
    return;
  }
  if (wt === 'rain') drawRain(strength);
  else if (wt === 'snow') drawSnow(strength);
  else if (wt === 'hail') drawHail(strength);
  else if (wt === 'thunder') drawThunder(strength);

  if (weatherFlash > 0) drawLightningFlash(weatherFlash);
}

function drawRain(strength = 1) {
  const rainCount = Math.floor(85 + strength * 130);
  const fallSpeed = 6 + strength * 4;
  const drift = 2 + strength * 2.2;
  ctx.strokeStyle = `rgba(148,196,255,${0.15 + strength * 0.08})`;
  ctx.lineWidth = 1;
  for (let i = 0; i < rainCount; i++) {
    const rx = (hash2(i, 31) * W + animTime * (2 + strength * 0.5)) % W;
    const ry = (hash2(i, 53) * H + animTime * fallSpeed + i * 11) % H;
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx - drift, ry + 9 + strength * 4);
    ctx.stroke();
  }
}

function drawSnow(strength = 1) {
  const flakeCount = Math.floor(55 + strength * 130);
  const fallSpeed = 0.7 + strength * 0.9;
  ctx.fillStyle = 'rgba(245,248,255,0.8)';
  for (let i = 0; i < flakeCount; i++) {
    const drift = Math.sin(animTime * 0.018 + i * 1.73) * (2 + strength * 5);
    const x = (hash2(i, 91) * W + drift + i * 3) % W;
    const y = (hash2(i, 129) * H + animTime * fallSpeed + i * 9) % H;
    const size = 1 + hash2(i, 147) * (1.2 + strength * 1.8);
    ctx.globalAlpha = 0.35 + hash2(i, 167) * 0.6;
    ctx.fillRect(x, y, size, size);
  }
  ctx.globalAlpha = 1;
}

function drawHail(strength = 1) {
  const pelletCount = Math.floor(45 + strength * 85);
  const fallSpeed = 7 + strength * 4.4;
  const streak = 1.5 + strength * 1.6;
  ctx.fillStyle = 'rgba(196,228,255,0.8)';
  ctx.strokeStyle = 'rgba(170,214,255,0.45)';
  ctx.lineWidth = 1;
  for (let i = 0; i < pelletCount; i++) {
    const x = (hash2(i, 201) * W + animTime * (2.3 + strength * 0.7)) % W;
    const y = (hash2(i, 241) * H + animTime * fallSpeed + i * 5) % H;
    const size = 1.6 + hash2(i, 277) * (1.3 + strength * 1.8);
    ctx.beginPath();
    ctx.moveTo(x + streak, y - streak);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.fillRect(x - size * 0.5, y - size * 0.5, size, size);
  }
}

function drawThunder(strength = 1) {
  ctx.fillStyle = `rgba(20,26,40,${Math.min(0.28, 0.08 + strength * 0.12)})`;
  ctx.fillRect(0, 0, W, H);
  drawRain(Math.min(1.5, strength * 1.15));
}

function _buildLightningSegments() {
  const segments = [];
  const seed = weatherBoltSeed || Math.floor(animTime * 17) + 1;
  let x = W * (Number.isFinite(weatherBoltX) ? weatherBoltX : 0.5);
  let y = -20;
  const maxY = H * 0.75;
  let index = 0;

  while (y < maxY && index < 24) {
    const sway = (hash2(seed + index * 7, index + 17) - 0.5) * 64;
    const nextX = Math.max(12, Math.min(W - 12, x + sway));
    const stepY = 16 + hash2(seed + index * 11, index + 31) * 30;
    const nextY = Math.min(maxY, y + stepY);
    const width = Math.max(1, 3.2 - (nextY / Math.max(1, H)) * 2.1);
    segments.push({ x1: x, y1: y, x2: nextX, y2: nextY, width });

    if (hash2(seed + index * 13, index + 43) > 0.78) {
      const branchX = nextX + (hash2(seed + index * 17, index + 59) - 0.5) * 60;
      const branchY = nextY + 10 + hash2(seed + index * 19, index + 73) * 24;
      segments.push({ x1: nextX, y1: nextY, x2: branchX, y2: branchY, width: Math.max(1, width * 0.6) });
    }

    x = nextX;
    y = nextY;
    index++;
  }
  return segments;
}

function drawLightningFlash(alpha = 0) {
  if (alpha <= 0) return;
  if (!Array.isArray(weatherBoltSegments) || weatherBoltSegments.length === 0) {
    weatherBoltSegments = _buildLightningSegments();
  }

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = `rgba(210,230,255,${Math.min(0.5, 0.08 + alpha * 0.42)})`;
  ctx.fillRect(0, 0, W, H);

  const glow = 0.12 + alpha * 0.25;
  ctx.strokeStyle = `rgba(188,222,255,${Math.min(0.75, glow)})`;
  for (const seg of weatherBoltSegments) {
    ctx.lineWidth = seg.width + 2;
    ctx.beginPath();
    ctx.moveTo(seg.x1, seg.y1);
    ctx.lineTo(seg.x2, seg.y2);
    ctx.stroke();
  }

  ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.95, 0.4 + alpha * 0.55)})`;
  for (const seg of weatherBoltSegments) {
    ctx.lineWidth = seg.width;
    ctx.beginPath();
    ctx.moveTo(seg.x1, seg.y1);
    ctx.lineTo(seg.x2, seg.y2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTerrainLayer(vx0, vy0, vx1, vy1) {
  if (!_RENDER_CACHE.enabled) {
    for (let y = vy0; y <= vy1; y++) {
      for (let x = vx0; x <= vx1; x++) {
        drawTileBase(ctx, x, y);
      }
    }
    return;
  }

  _ensureRenderCache();
  const tileSpan = _RENDER_CACHE.chunkTiles;
  const cx0 = Math.max(0, Math.floor(vx0 / tileSpan));
  const cy0 = Math.max(0, Math.floor(vy0 / tileSpan));
  const cx1 = Math.min(_RENDER_CACHE.cols - 1, Math.floor(vx1 / tileSpan));
  const cy1 = Math.min(_RENDER_CACHE.rows - 1, Math.floor(vy1 / tileSpan));
  let syncBudget = _RENDER_CACHE.asyncBuild ? _RENDER_CACHE.syncBuildBudget : Number.POSITIVE_INFINITY;

  for (let cy = cy0; cy <= cy1; cy++) {
    for (let cx = cx0; cx <= cx1; cx++) {
      const idx = _cacheChunkIndex(cx, cy);
      const chunk = _RENDER_CACHE.chunks[idx];
      if (!chunk) continue;
      if (chunk.dirty) {
        if (!chunk.ready || syncBudget > 0 || !_RENDER_CACHE.asyncBuild) {
          _rerenderTerrainChunk(cx, cy, chunk);
          if (_RENDER_CACHE.asyncBuild && Number.isFinite(syncBudget)) syncBudget--;
        } else {
          _queueChunkBuild(chunk);
        }
      }
      const px = cx * _RENDER_CACHE.chunkPx;
      const py = cy * _RENDER_CACHE.chunkPx;
      ctx.drawImage(chunk.canvas, px, py);
    }
  }

  if (_RENDER_CACHE.asyncBuild && _RENDER_CACHE.queuedCount > 0) {
    _buildQueuedChunks(Math.max(1, Math.floor(_RENDER_CACHE.syncBuildBudget * 0.5)));
  }
}

function _rerenderTerrainChunk(cx, cy, chunk) {
  const tileSpan = _RENDER_CACHE.chunkTiles;
  const x0 = cx * tileSpan;
  const y0 = cy * tileSpan;
  const x1 = Math.min(WW, x0 + tileSpan);
  const y1 = Math.min(WH, y0 + tileSpan);
  chunk.context.clearRect(0, 0, _RENDER_CACHE.chunkPx, _RENDER_CACHE.chunkPx);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      drawTileBase(chunk.context, x, y, x0, y0);
    }
  }
  chunk.dirty = false;
  chunk.ready = true;
}

function drawTileBase(targetCtx, x, y, originX = 0, originY = 0) {
  const tile = world[y][x];
  if (!tile) return;
  const px = (x - originX) * TILE;
  const py = (y - originY) * TILE;
  const rnd = tileRnd(x, y, 0);

  if (tile.type === 'grass' || tile.type === 'flower') {
    targetCtx.fillStyle = GRASS_COLORS[Math.floor(rnd * 4)];
    targetCtx.fillRect(px, py, TILE, TILE);
    targetCtx.fillStyle = rnd > 0.5 ? '#3a7035' : '#4fa040';
    for (let i = 0; i < 3; i++) {
      const bx = px + tileRnd(x, y, i + 1) * TILE;
      const by = py + tileRnd(x, y, i + 4) * TILE;
      targetCtx.fillRect(bx, by, 1, 3);
    }
    if (tile.type === 'flower') {
      const fc = FLOWER_COLORS[Math.abs(tile.variant || 0) % FLOWER_COLORS.length];
      const fx = px + 4 + rnd * (TILE - 12);
      const fy = py + 5 + tileRnd(x, y, 8) * (TILE - 14);
      targetCtx.fillStyle = '#5a8a3a';
      targetCtx.fillRect(fx + 1, fy - 2, 1, 6);
      targetCtx.fillStyle = fc;
      targetCtx.fillRect(fx, fy - 4, 4, 3);
      targetCtx.fillRect(fx - 1, fy - 3, 6, 1);
    }
  } else if (tile.type === 'tilled') {
    targetCtx.fillStyle = '#3c240e';
    targetCtx.fillRect(px, py, TILE, TILE);
    targetCtx.fillStyle = '#4f3018';
    for (let i = 0; i < TILE; i += 4) {
      targetCtx.fillRect(px, py + i, TILE, 2);
    }
  } else if (tile.type === 'tree') {
    targetCtx.fillStyle = GRASS_COLORS[0];
    targetCtx.fillRect(px, py, TILE, TILE);
    targetCtx.fillStyle = TREE_TRUNK;
    targetCtx.fillRect(px + TILE / 2 - 3, py + TILE / 2 + 2, 6, TILE / 2);
    targetCtx.fillStyle = TREE_CANOPY[tile.variant % 4];
    targetCtx.beginPath();
    targetCtx.arc(px + TILE / 2, py + TILE / 2, TILE / 2 - 1, 0, Math.PI * 2);
    targetCtx.fill();
    targetCtx.fillStyle = 'rgba(0,0,0,0.2)';
    targetCtx.beginPath();
    targetCtx.arc(px + TILE / 2 + 2, py + TILE / 2 + 2, TILE / 2 - 1, 0, Math.PI * 2);
    targetCtx.fill();
    targetCtx.fillStyle = TREE_CANOPY[tile.variant % 4];
    targetCtx.beginPath();
    targetCtx.arc(px + TILE / 2, py + TILE / 2, TILE / 2 - 1, 0, Math.PI * 2);
    targetCtx.fill();
    targetCtx.fillStyle = 'rgba(255,255,255,0.1)';
    targetCtx.beginPath();
    targetCtx.arc(px + TILE / 2 - 3, py + TILE / 2 - 4, 4, 0, Math.PI * 2);
    targetCtx.fill();
  } else if (tile.type === 'rock') {
    const ROCK_PAL = [['#888','#aaa','#666'],['#7a8c9e','#9ab0c4','#566876'],['#a09272','#bfb092','#786050']];
    const rp = ROCK_PAL[tile.variant % 3];
    targetCtx.fillStyle = GRASS_COLORS[0];
    targetCtx.fillRect(px, py, TILE, TILE);
    targetCtx.fillStyle = rp[0];
    targetCtx.fillRect(px + 5, py + 8, TILE - 10, TILE - 14);
    targetCtx.fillStyle = rp[1];
    targetCtx.fillRect(px + 6, py + 9, 4, 3);
    targetCtx.fillStyle = rp[2];
    targetCtx.fillRect(px + 5, py + 18, TILE - 10, 4);
  }
}

function drawTileDynamicOverlay(x, y) {
  const tile = world[y][x];
  if (!tile) return;
  const px = x * TILE;
  const py = y * TILE;

  if (tile.type === 'water') {
    const rnd = tileRnd(x, y, 0);
    const wv = Math.sin(animTime * 0.05 + tile.animOffset) * 0.15 + 0.85;
    const wi = Math.floor(wv * WATER_COLORS.length) % WATER_COLORS.length;
    ctx.fillStyle = WATER_COLORS[wi];
    ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = `rgba(255,255,255,${0.1 + Math.sin(animTime * 0.08 + rnd * 6) * 0.06})`;
    ctx.fillRect(px + 4, py + 8, TILE - 10, 2);
    ctx.fillRect(px + 10, py + 18, TILE - 16, 2);
    return;
  }

  if (tile.type !== 'grass' && tile.type !== 'flower' && tile.type !== 'tilled') return;

  const fertility = (typeof getTileFertilityValue === 'function') ? getTileFertilityValue(x, y) : 50;
  if (tile.type === 'tilled') {
    const wetWeather = (typeof weatherWatersCrops === 'function') ? weatherWatersCrops() : rainDay;
    if (tile.watered || (tile.crop && tile.crop.watered) || wetWeather) {
      ctx.fillStyle = 'rgba(30, 80, 150, 0.25)';
      ctx.fillRect(px, py, TILE, TILE);
    }
    const moisture = (typeof getTileMoistureValue === 'function') ? getTileMoistureValue(x, y) : 50;
    if (moisture > 62) {
      ctx.fillStyle = `rgba(60, 145, 220, ${Math.min(0.16, (moisture - 62) / 240)})`;
      ctx.fillRect(px, py, TILE, TILE);
    }
    if (fertility > 70) {
      ctx.fillStyle = `rgba(108, 220, 88, ${Math.min(0.15, (fertility - 70) / 260)})`;
      ctx.fillRect(px, py, TILE, TILE);
    } else if (fertility < 30) {
      ctx.fillStyle = `rgba(120, 86, 48, ${Math.min(0.12, (30 - fertility) / 260)})`;
      ctx.fillRect(px, py, TILE, TILE);
    }
    return;
  }

  if (fertility > 70) {
    ctx.fillStyle = `rgba(108, 220, 88, ${Math.min(0.18, (fertility - 70) / 260)})`;
    ctx.fillRect(px, py, TILE, TILE);
  } else if (fertility < 30) {
    ctx.fillStyle = `rgba(120, 86, 48, ${Math.min(0.15, (30 - fertility) / 260)})`;
    ctx.fillRect(px, py, TILE, TILE);
  }
}

function drawTile(x, y) {
  drawTileBase(ctx, x, y);
  drawTileDynamicOverlay(x, y);
}

const CROP_DRAWERS = {};
const _CROP_TEXTURE_CACHE = {
  enabled: S.display?.cropTextureCache !== false,
  asyncBuild: S.display?.cropTextureAsync !== false,
  variantCount: Math.max(1, Math.min(8, Math.floor(Number(S.display?.cropTextureVariants) || 3))),
  syncBuildBudget: Math.max(1, Math.floor(Number(S.display?.cropTextureBuildsPerFrame) || 1)),
  idleBuildBudget: Math.max(1, Math.floor(Number(S.display?.cropTextureBuildsIdle) || 6)),
  textures: new Map(),
  queue: [],
  queued: new Set(),
  idleHandle: 0,
  frameBuilds: 0,
};

function _cropTextureKey(type, stage, variant) {
  return `${type}|${stage}|${variant}`;
}

function _cropVariantBucket(tile) {
  const seed = Math.abs(Math.floor(Number(tile?.animOffset || 0) * 997));
  return seed % _CROP_TEXTURE_CACHE.variantCount;
}

function _nextCropTextureJob() {
  while (_CROP_TEXTURE_CACHE.queue.length > 0) {
    const job = _CROP_TEXTURE_CACHE.queue.shift();
    if (!job) continue;
    _CROP_TEXTURE_CACHE.queued.delete(job.key);
    if (_CROP_TEXTURE_CACHE.textures.has(job.key)) continue;
    return job;
  }
  return null;
}

function _buildCropTexture(job) {
  const cfg = S.crops[job?.type];
  if (!cfg) return null;
  const stageMax = Math.max(1, (Math.floor(Number(cfg.stages) || 1) - 1));
  const stage = Math.max(0, Math.min(stageMax, Math.floor(Number(job.stage) || 0)));
  const drawer = CROP_DRAWERS[job.type] || _drawGenericCrop;
  const stageInfo = { stage, stageMax, progress: stage / stageMax };
  const canvas = document.createElement('canvas');
  canvas.width = TILE;
  canvas.height = TILE;
  const textureCtx = canvas.getContext('2d', { alpha: true });
  if (!textureCtx) return null;
  const animOffset = (job.variant + 1) * (Math.PI * 2 / (_CROP_TEXTURE_CACHE.variantCount + 1));
  drawer(textureCtx, 0, 0, stageInfo, 0, animOffset, cfg);
  _CROP_TEXTURE_CACHE.textures.set(job.key, canvas);
  return canvas;
}

function _queueCropTexture(type, stage, variant) {
  const key = _cropTextureKey(type, stage, variant);
  if (_CROP_TEXTURE_CACHE.textures.has(key) || _CROP_TEXTURE_CACHE.queued.has(key)) return;
  _CROP_TEXTURE_CACHE.queued.add(key);
  _CROP_TEXTURE_CACHE.queue.push({ key, type, stage, variant });
  _scheduleCropTexturePump();
}

function _processCropTextureQueue(maxBuilds, deadline = null) {
  if (!_CROP_TEXTURE_CACHE.enabled) return 0;
  let built = 0;
  const limit = Math.max(1, Math.floor(Number(maxBuilds) || 1));
  while (built < limit) {
    if (deadline && built > 0 && typeof deadline.timeRemaining === 'function' && deadline.timeRemaining() < 2) break;
    const job = _nextCropTextureJob();
    if (!job) break;
    if (_buildCropTexture(job)) built++;
  }
  return built;
}

function _scheduleCropTexturePump() {
  if (!_CROP_TEXTURE_CACHE.enabled || !_CROP_TEXTURE_CACHE.asyncBuild) return;
  if (_CROP_TEXTURE_CACHE.idleHandle) return;
  if (_CROP_TEXTURE_CACHE.queue.length === 0) return;
  _CROP_TEXTURE_CACHE.idleHandle = _requestIdle(_runCropTexturePump);
}

function _runCropTexturePump(deadline) {
  _CROP_TEXTURE_CACHE.idleHandle = 0;
  if (!_CROP_TEXTURE_CACHE.enabled || !_CROP_TEXTURE_CACHE.asyncBuild) return;
  _processCropTextureQueue(_CROP_TEXTURE_CACHE.idleBuildBudget, deadline || null);
  if (_CROP_TEXTURE_CACHE.queue.length > 0) _scheduleCropTexturePump();
}

function _getCropTexture(tile, crop, stageInfo) {
  if (!_CROP_TEXTURE_CACHE.enabled) return null;
  const variant = _cropVariantBucket(tile);
  const key = _cropTextureKey(crop.type, stageInfo.stage, variant);
  let texture = _CROP_TEXTURE_CACHE.textures.get(key) || null;
  if (texture) return texture;

  if (_CROP_TEXTURE_CACHE.frameBuilds < _CROP_TEXTURE_CACHE.syncBuildBudget) {
    texture = _buildCropTexture({ key, type: crop.type, stage: stageInfo.stage, variant });
    if (texture) {
      _CROP_TEXTURE_CACHE.frameBuilds++;
      return texture;
    }
  }

  _queueCropTexture(crop.type, stageInfo.stage, variant);
  return null;
}

function _cropSwayMultiplier() {
  const wt = (typeof normalizeWeatherType === 'function')
    ? normalizeWeatherType(weatherType)
    : (weatherType || (rainDay ? 'rain' : 'clear'));
  if (wt === 'thunder') return 1.6;
  if (wt === 'hail') return 1.35;
  if (wt === 'rain') return 1.18;
  if (wt === 'snow') return 0.75;
  return 1;
}

function drawCrop(x, y) {
  const tile = world[y][x];
  const crop = tile.crop;
  const cfg = S.crops[crop?.type];
  if (!cfg) return;
  const px = x * TILE, py = y * TILE;
  const stageInfo = _cropStageProgress(crop, cfg);
  const drawer = CROP_DRAWERS[crop.type] || _drawGenericCrop;
  const texture = _getCropTexture(tile, crop, stageInfo);
  if (texture) {
    const windScale = _cropSwayMultiplier();
    const sway = Math.sin(animTime * 0.055 + tile.animOffset * 1.9) * (0.018 + stageInfo.progress * 0.04) * windScale;
    ctx.save();
    ctx.translate(px + TILE / 2, py + TILE - 4);
    ctx.rotate(sway);
    ctx.translate(-TILE / 2, -(TILE - 4));
    ctx.drawImage(texture, 0, 0);
    ctx.restore();
  } else {
    drawer(ctx, px, py, stageInfo, animTime, tile.animOffset, cfg);
  }

  // Ready-to-harvest golden glow
  if (stageInfo.stage >= stageInfo.stageMax) {
    const cx = px + TILE / 2;
    const bot = py + TILE - 4;
    const h = Math.round(4 + stageInfo.progress * (TILE - 8));
    const bounce = Math.sin(animTime * 0.12 + tile.animOffset * 3) * 2;
    ctx.fillStyle = 'rgba(255,230,50,0.25)';
    ctx.beginPath();
    ctx.arc(cx, bot - h / 2 + bounce, TILE / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Watered indicator
  if (tile.crop.watered) {
    ctx.fillStyle = 'rgba(70,180,255,0.4)';
    ctx.fillRect(px + 1, py + TILE - 4, TILE - 2, 3);
  }
}

function _drawGenericCrop(ctx, px, py, si, anim, offset, cfg) {
  const progress = si.progress;
  const h = Math.round(4 + progress * (TILE - 8));
  const w = Math.round(3 + progress * (TILE - 16));
  const cx = px + TILE / 2;
  const bot = py + TILE - 4;
  const wobble = Math.sin(anim * 0.08 + offset) * (2 * progress);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath();
  ctx.ellipse(cx, bot, w / 2 + 2, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Stem
  ctx.fillStyle = '#5a8a3a';
  ctx.fillRect(cx - 1, bot - h, 2, h);

  if (si.stage >= 1) {
    ctx.fillStyle = cfg.color;
    ctx.fillRect(cx - w / 2 + wobble, bot - h, w, Math.round(h * 0.6));
    if (si.stage >= 2) {
      ctx.fillStyle = '#6aad48';
      ctx.fillRect(cx - 4 + wobble * 0.7, bot - h * 0.5, 8, 4);
    }
  }
}

const WHEAT_STALK_BASE_OFFSETS = [-5, -2, 2, 5];
const WHEAT_STALK_HEIGHTS = [
  [4, 6, 5, 5],
  [10, 12, 11, 10],
  [16, 18, 17, 16],
  [22, 24, 23, 22]
];
const WHEAT_STAGE_BEND_RESPONSE = [0.58, 0.76, 0.96, 1.12];
const _WHEAT_PROFILE_SCRATCH = {};
const _WHEAT_TIP_SCRATCH = { tipX: 0, tipY: 0 };

function _wheatWindProfile(anim, offset, out) {
  const profile = out || {};
  const wt = (typeof normalizeWeatherType === 'function')
    ? normalizeWeatherType(weatherType)
    : ((typeof weatherType === 'string' && weatherType) ? weatherType : (rainDay ? 'rain' : 'clear'));
  const intensity = Math.max(0.25, Math.min(1.6, Number(weatherIntensity) || 0.8));

  profile.windScale = 0.72;
  profile.baseFreq = 0.045;
  profile.flutterFreq = 0.16;
  profile.flutterScale = 0.78;
  profile.gustScale = 0.28;
  profile.gustFreq = 0.095;
  profile.chopScale = 0;
  profile.chopFreq = 0.42;
  profile.breathFreq = 0.014;
  profile.inertia = 0.92;
  profile.pulse = 0;

  if (wt === 'rain') {
    profile.windScale = 0.92;
    profile.baseFreq = 0.052;
    profile.flutterFreq = 0.2;
    profile.flutterScale = 0.9;
    profile.gustScale = 0.42;
    profile.gustFreq = 0.108;
    profile.breathFreq = 0.016;
    profile.inertia = 0.98;
  } else if (wt === 'snow') {
    profile.windScale = 0.82;
    profile.baseFreq = 0.034;
    profile.flutterFreq = 0.11;
    profile.flutterScale = 0.52;
    profile.gustScale = 0.32;
    profile.gustFreq = 0.078;
    profile.breathFreq = 0.011;
    profile.inertia = 0.74;
  } else if (wt === 'hail') {
    profile.windScale = 1.12;
    profile.baseFreq = 0.061;
    profile.flutterFreq = 0.29;
    profile.flutterScale = 1.14;
    profile.gustScale = 0.58;
    profile.gustFreq = 0.145;
    profile.chopScale = 0.18;
    profile.chopFreq = 0.54;
    profile.breathFreq = 0.019;
    profile.inertia = 1.08;
  } else if (wt === 'thunder') {
    profile.windScale = 1.28;
    profile.baseFreq = 0.067;
    profile.flutterFreq = 0.33;
    profile.flutterScale = 1.2;
    profile.gustScale = 0.82;
    profile.gustFreq = 0.168;
    profile.chopScale = 0.1;
    profile.chopFreq = 0.46;
    profile.breathFreq = 0.022;
    profile.inertia = 1.12;
  }

  const intensityScale = 0.78 + intensity * 0.34;
  profile.windScale *= intensityScale;
  profile.gustScale *= (0.75 + intensity * 0.45);
  profile.chopScale *= (0.7 + intensity * 0.5);

  const breathWave = Math.sin(anim * profile.breathFreq + offset * 0.83 + intensity * 0.7);
  profile.gustEnvelope = 0.52 + (breathWave * 0.5 + 0.5) * 0.48;

  if (wt === 'thunder') {
    const thunderPulse = Math.sin(anim * 0.115 + offset * 2.2);
    const pulse = thunderPulse > 0 ? thunderPulse * thunderPulse : 0;
    profile.pulse = pulse * pulse;
    profile.gustEnvelope += profile.pulse * 0.9;
  } else if (wt === 'hail') {
    const hailPulse = Math.sin(anim * 0.17 + offset * 2.8 + Math.sin(anim * 0.05));
    profile.pulse = hailPulse > 0 ? hailPulse * hailPulse * 0.28 : 0;
    profile.gustEnvelope += profile.pulse;
  }

  profile.gustEnvelope = Math.min(1.7, profile.gustEnvelope);
  profile.motionScale = profile.windScale * (0.82 + intensity * 0.32);
  profile.leafResponse = 0.9 + profile.motionScale * 0.32 + profile.chopScale * 0.5;
  profile.headResponse = 0.8 + profile.motionScale * 0.36 + profile.pulse * 0.22;
  return profile;
}

function _wheatWind(anim, offset, phase, amount, profile) {
  const baseSway = Math.sin(anim * profile.baseFreq + offset + phase) * amount * profile.windScale;
  const flutter = Math.sin(
    anim * profile.flutterFreq +
    offset * 1.8 +
    phase * 2.2 +
    Math.sin(anim * 0.013 + phase * 1.1) * (0.18 + profile.chopScale * 0.35)
  ) * (0.24 + amount * 0.065) * profile.flutterScale * (0.65 + 0.35 * profile.inertia);
  const gustPulse = Math.sin(anim * (profile.gustFreq * 0.37) + offset * 0.92 + phase * 0.4);
  const gustGate = gustPulse > 0 ? gustPulse * gustPulse : 0;
  const gust = Math.sin(anim * profile.gustFreq + offset * 0.62 + phase * 1.35) *
    amount * 0.28 * profile.gustScale * (0.25 + profile.gustEnvelope * 0.7 + gustGate * 0.75 + profile.pulse);
  const chop = Math.sin(anim * profile.chopFreq + offset * 3.3 + phase * 4.9) *
    amount * 0.11 * profile.chopScale;
  return baseSway + flutter + gust + chop;
}

function _drawWheatStalk(ctx, baseX, baseY, height, bend, lineWidth, tipOut) {
  const segments = 4;
  let prevX = baseX;
  let prevY = baseY;

  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(prevX, prevY);

  for (let s = 1; s <= segments; s++) {
    const t = s / segments;
    const smoothT = t * t * (3 - 2 * t);
    const lag = smoothT * smoothT; // tip lag: upper segments bend more than base.
    const nextX = baseX + bend * (0.1 + 0.9 * lag);
    const nextY = baseY - height * t;
    const ctrlT = (s - 0.5) / segments;
    const ctrlSmooth = ctrlT * ctrlT * (3 - 2 * ctrlT);
    const ctrlLag = ctrlSmooth * ctrlSmooth;
    const ctrlX = baseX + bend * (0.1 + 0.9 * ctrlLag);
    const ctrlY = baseY - height * ctrlT;
    ctx.quadraticCurveTo(ctrlX, ctrlY, nextX, nextY);
    prevX = nextX;
    prevY = nextY;
  }

  ctx.stroke();
  if (tipOut) {
    tipOut.tipX = prevX;
    tipOut.tipY = prevY;
    return tipOut;
  }
  return { tipX: prevX, tipY: prevY };
}

function _drawWheat(ctx, px, py, si, anim, offset, cfg) {
  const { stage, progress } = si;
  const stageIndex = Math.max(0, Math.min(WHEAT_STALK_HEIGHTS.length - 1, stage));
  const cx = px + TILE / 2;
  const bot = py + TILE - 4;
  const heights = WHEAT_STALK_HEIGHTS[stageIndex];
  const stageResponse = (WHEAT_STAGE_BEND_RESPONSE[stageIndex] || 1) * (0.9 + progress * 0.18);
  const profile = _wheatWindProfile(anim, offset, _WHEAT_PROFILE_SCRATCH);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath();
  ctx.ellipse(cx, bot, 6 + progress * 3 + profile.motionScale * 0.7, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  const stalkCount = 4;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < stalkCount; i++) {
    const phase = i * 0.93;
    const bendAmount = (1.15 + progress * 1.85) * stageResponse * profile.motionScale;
    const bendRaw = _wheatWind(anim, offset, phase, bendAmount, profile);
    const smoothCarry = Math.sin(anim * (profile.baseFreq * 0.62) + offset * 0.74 + phase * 0.8) * bendAmount * 0.22;
    const bend = bendRaw * 0.82 + smoothCarry * 0.18;
    const x = cx + WHEAT_STALK_BASE_OFFSETS[i] +
      Math.sin(anim * (0.03 + profile.baseFreq * 0.2) + offset + phase * 0.6) * (0.35 + profile.motionScale * 0.13);
    const h = heights[i];
    const lineWidth = stage >= 2 ? 1.5 : 1.3;

    ctx.strokeStyle = stage === 0 ? '#7cb342' : '#8bc34a';
    const tip = _drawWheatStalk(ctx, x, bot, h, bend, lineWidth, _WHEAT_TIP_SCRATCH);

    if (stage >= 1) {
      const leafT = 0.48 + (i % 2 === 0 ? 0.08 : -0.06);
      const leafY = bot - h * leafT;
      const leafLag = leafT * leafT * (2 - leafT);
      const leafAnchorX = x + bend * leafLag;
      const leafDir = Math.abs(bend) < 0.25 ? (i % 2 === 0 ? -1 : 1) : Math.sign(bend);
      const leafLenBase = stage >= 2 ? 5.8 : 4.6;
      const leafLen = leafLenBase + profile.leafResponse * 0.9 + Math.min(1.2, Math.abs(bend) * 0.08);
      const leafLift = (stage >= 2 ? 3.7 : 3) + profile.leafResponse * 0.55;
      const leafCurve = leafLen * (0.48 + profile.chopScale * 0.2);

      ctx.strokeStyle = `rgba(139,195,74,${Math.min(0.9, 0.72 + profile.motionScale * 0.08)})`;
      ctx.lineWidth = 1.02 + profile.motionScale * 0.06;
      ctx.beginPath();
      ctx.moveTo(leafAnchorX, leafY);
      ctx.quadraticCurveTo(
        leafAnchorX + leafDir * leafCurve * 0.45,
        leafY - leafLift * 0.32,
        leafAnchorX + leafDir * leafLen * 0.68 + bend * 0.04,
        leafY - leafLift * 0.82
      );
      ctx.quadraticCurveTo(
        leafAnchorX + leafDir * leafLen * 1.05 + bend * 0.1,
        leafY - leafLift * 1.08,
        leafAnchorX + leafDir * leafLen * 1.12 + bend * 0.12,
        leafY - leafLift * 0.92
      );
      ctx.stroke();
    }

    if (stage >= 2) {
      const headBobX = Math.sin(anim * (0.11 + profile.baseFreq * 0.5) + offset * 1.3 + i * 1.7) *
        (0.38 + profile.headResponse * 0.32);
      const headBobY = Math.cos(anim * (0.125 + profile.flutterFreq * 0.32) + offset * 1.1 + i * 1.4) *
        (0.24 + profile.headResponse * 0.22);
      const gustBob = Math.sin(anim * profile.gustFreq + phase * 1.2 + offset * 0.6) * 0.18 * profile.gustEnvelope;
      const headX = tip.tipX + bend * (0.05 + stageResponse * 0.03) + headBobX + gustBob;
      const headY = tip.tipY + 2 + headBobY + Math.abs(gustBob) * 0.25;
      const headTilt = bend * 0.04 + Math.sin(anim * 0.09 + i * 0.6) * (0.06 + profile.headResponse * 0.03);
      ctx.fillStyle = cfg.color || '#e8c84a';
      ctx.beginPath();
      ctx.ellipse(headX, headY, 2, 3 + profile.gustEnvelope * 0.08, headTilt, 0, Math.PI * 2);
      ctx.fill();

      if (stage >= 3) {
        ctx.fillStyle = `rgba(255,240,140,${Math.min(0.6, 0.46 + profile.gustEnvelope * 0.06)})`;
        ctx.beginPath();
        ctx.arc(headX - 1, headY - 1, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  if (stage >= 3) {
    ctx.fillStyle = 'rgba(255,200,100,0.15)';
    ctx.beginPath();
    ctx.ellipse(cx + Math.sin(anim * 0.04 + offset) * 0.35, bot - 16, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
CROP_DRAWERS.wheat = _drawWheat;

function _drawCarrot(ctx, px, py, si, anim, offset, cfg) {
  const { stage, progress } = si;
  const cx = px + TILE / 2;
  const bot = py + TILE - 4;
  const sway = Math.sin(anim * 0.07 + offset) * (1.2 * progress);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath();
  ctx.ellipse(cx, bot, 5 + progress * 4, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  const stemH = Math.round(4 + progress * 16);
  ctx.fillStyle = '#4a7a2a';
  ctx.fillRect(cx - 1, bot - stemH, 2, stemH);

  if (stage >= 1) {
    const frondCount = stage >= 2 ? 5 : 3;
    const frondLen = 6 + progress * 8;
    const angles = stage >= 2
      ? [-Math.PI * 0.35, -0.15, 0, 0.15, Math.PI * 0.35]
      : [-0.25, 0, 0.25];

    ctx.strokeStyle = 'rgba(100,180,60,0.7)';
    ctx.lineWidth = 1.2;
    for (const angle of angles) {
      ctx.beginPath();
      ctx.moveTo(cx + sway, bot - stemH);
      const endX = cx + sway + Math.sin(angle) * frondLen;
      const endY = bot - stemH - Math.cos(angle) * frondLen;
      ctx.quadraticCurveTo(
        cx + sway + Math.sin(angle) * frondLen * 0.5,
        bot - stemH - Math.cos(angle) * frondLen * 0.6,
        endX, endY
      );
      ctx.stroke();
    }
  }

  if (stage >= 2) {
    const carrotW = 4 + progress * 2;
    ctx.fillStyle = cfg.color;
    ctx.beginPath();
    ctx.moveTo(cx - carrotW / 2, bot);
    ctx.lineTo(cx + carrotW / 2, bot);
    ctx.lineTo(cx, bot + carrotW);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255,200,100,0.4)';
    ctx.beginPath();
    ctx.moveTo(cx - carrotW * 0.3, bot + 1);
    ctx.lineTo(cx + carrotW * 0.2, bot + carrotW * 0.6);
    ctx.lineTo(cx - carrotW * 0.2, bot + 1);
    ctx.closePath();
    ctx.fill();
  }

  if (stage >= 3) {
    ctx.fillStyle = 'rgba(120,200,80,0.3)';
    ctx.beginPath();
    ctx.ellipse(cx + sway, bot - stemH - 4, 5 + progress * 2, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}
CROP_DRAWERS.carrot = _drawCarrot;

function _drawTomato(ctx, px, py, si, anim, offset, cfg) {
  const progress = si.progress;
  const cx = px + TILE / 2;
  const bot = py + TILE - 4;
  const h = Math.round(6 + progress * (TILE - 10));
  const sway = Math.sin(anim * 0.065 + offset) * (1.5 * progress);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath();
  ctx.ellipse(cx, bot + 1, 5 + progress * 3, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Central stake
  ctx.fillStyle = '#5a7a30';
  ctx.fillRect(cx + sway * 0.3 - 1, bot - h, 2, h);

  if (si.stage >= 1) {
    ctx.strokeStyle = 'rgba(80,130,40,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx + sway * 0.3, bot - h * 0.7);
    ctx.quadraticCurveTo(cx - 6 + sway, bot - h * 0.6, cx - 8 + sway, bot - h * 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + sway * 0.3, bot - h * 0.5);
    ctx.quadraticCurveTo(cx + 6 + sway, bot - h * 0.4, cx + 8 + sway, bot - h * 0.3);
    ctx.stroke();

    const leafPositions = [
      { x: -5, y: 0.65, s: 1 },
      { x: 4, y: 0.45, s: -1 },
    ];
    if (si.stage >= 2) leafPositions.push({ x: -6, y: 0.3, s: 1 });
    for (const lp of leafPositions) {
      const lx = cx + lp.x + sway * 0.6;
      const ly = bot - h * lp.y;
      ctx.fillStyle = 'rgba(80,150,40,0.75)';
      ctx.beginPath();
      ctx.ellipse(lx, ly, 3.5, 2, lp.s * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(120,190,60,0.35)';
      ctx.beginPath();
      ctx.ellipse(lx - lp.s, ly - 0.5, 2, 1.2, lp.s * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (si.stage >= 2) {
    const fruitColor = si.stage >= si.stageMax ? '#e84040' : si.stage >= 3 ? '#d05540' : '#70a040';
    const fruitPositions = [{ x: -4, y: 0.55 }];
    if (si.stage >= 3) fruitPositions.push({ x: 3, y: 0.35 });
    if (si.stage >= si.stageMax) fruitPositions.push({ x: -1, y: 0.7 });

    for (const fp of fruitPositions) {
      const fx = cx + fp.x + sway * 0.5;
      const fy = bot - h * fp.y;
      const r = 2.5 + progress * 1.5;
      ctx.fillStyle = fruitColor;
      ctx.beginPath();
      ctx.arc(fx, fy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(fx - r * 0.3, fy - r * 0.3, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4a7a30';
      ctx.fillRect(fx - 0.5, fy - r - 1.5, 1, 2);
    }
  }
}
CROP_DRAWERS.tomato = _drawTomato;

function _drawBlueberry(ctx, px, py, si, anim, offset, cfg) {
  const progress = si.progress;
  const cx = px + TILE / 2;
  const bot = py + TILE - 4;
  const sway = Math.sin(anim * 0.055 + offset) * (1 * progress);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath();
  ctx.ellipse(cx, bot, TILE / 3 + 2, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Stem
  ctx.fillStyle = '#5a6a3a';
  ctx.fillRect(cx - 1, bot - 8, 2, 4);

  if (si.stage >= 1) {
    ctx.fillStyle = 'rgba(50,110,40,0.6)';
    ctx.beginPath();
    ctx.ellipse(cx + sway * 0.3, bot - 10, 8, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4a9a38';
    ctx.beginPath();
    ctx.ellipse(cx + sway * 0.5, bot - 10, 7, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    if (si.stage >= 2) {
      ctx.fillStyle = '#5aaa44';
      ctx.beginPath();
      ctx.ellipse(cx + sway * 0.7, bot - 11, 5, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      const berryColor = si.stage >= 3 ? cfg.color : '#7a80a8';
      const berryPositions = [
        { x: 3, y: -12 }, { x: -2, y: -11 }, { x: 1, y: -8 },
      ];
      if (si.stage >= 3) {
        berryPositions.push({ x: 4, y: -13 }, { x: -4, y: -8 }, { x: 2, y: -14 });
      }
      for (const b of berryPositions) {
        ctx.fillStyle = berryColor;
        ctx.beginPath();
        ctx.arc(cx + sway + b.x, bot + b.y, si.stage >= 3 ? 1.8 : 1.5, 0, Math.PI * 2);
        ctx.fill();
        if (si.stage >= 3) {
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.fillRect(cx + sway + b.x, bot + b.y - 1, 1, 1);
        }
      }

      if (si.stage >= 3) {
        ctx.fillStyle = 'rgba(130,200,80,0.25)';
        ctx.beginPath();
        ctx.ellipse(cx + sway * 0.5 - 2, bot - 12, 3, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
CROP_DRAWERS.blueberry = _drawBlueberry;

function _drawPumpkin(ctx, px, py, si, anim, offset, cfg) {
  const progress = si.progress;
  const cx = px + TILE / 2;
  const bot = py + TILE - 4;
  const sway = Math.sin(anim * 0.05 + offset) * (0.8 * progress);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath();
  ctx.ellipse(cx, bot, 6 + progress * 4, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  if (si.stage === 0) {
    ctx.strokeStyle = '#4a8a30';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, bot - 2);
    ctx.lineTo(cx + sway, bot - 6);
    ctx.stroke();
  } else {
    // Vines
    const vineLen = 6 + progress * 8;
    ctx.strokeStyle = '#4a8a30';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + sway, bot);
    ctx.quadraticCurveTo(cx - vineLen * 0.6 + sway, bot - 4 - progress * 3, cx - vineLen + sway, bot - vineLen * 0.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + sway, bot);
    ctx.quadraticCurveTo(cx + vineLen * 0.6 + sway, bot - 4 - progress * 3, cx + vineLen + sway, bot - vineLen * 0.7);
    ctx.stroke();

    // Leaves
    const leafCount = si.stage >= 2 ? 3 : 2;
    for (let i = 0; i < leafCount; i++) {
      const angle = (i - (leafCount - 1) / 2) * 0.6 + sway * 0.1;
      const lx = cx + Math.cos(angle) * (vineLen * 0.6);
      const ly = bot - 6 - Math.abs(i - 1) * 3 - progress * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.beginPath();
      ctx.ellipse(lx, ly + 1, 3 + progress, 5 + progress, angle * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4a9a38';
      ctx.beginPath();
      ctx.ellipse(lx, ly, 3 + progress, 5 + progress, angle * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a7a28';
      ctx.fillRect(lx - 0.5, ly - 3, 1, 4);
    }

    // Fruit (stage 2+)
    if (si.stage >= 2) {
      const fruitColor = si.stage >= si.stageMax ? '#ff8c00' : si.stage >= 3 ? '#cc8020' : '#6a9a40';
      const pumpR = 3 + progress * 5;
      const pumpY = bot - pumpR - 1;

      ctx.fillStyle = fruitColor;
      ctx.beginPath();
      ctx.ellipse(cx + sway, pumpY, pumpR, pumpR * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();

      if (si.stage >= 3) {
        ctx.strokeStyle = si.stage >= si.stageMax ? '#cc6000' : '#8a5010';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(cx + sway, pumpY - pumpR * 0.8);
        ctx.lineTo(cx + sway, pumpY + pumpR * 0.8);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + sway - pumpR * 0.5, pumpY - pumpR * 0.6);
        ctx.quadraticCurveTo(cx + sway - pumpR * 0.6, pumpY, cx + sway - pumpR * 0.5, pumpY + pumpR * 0.6);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + sway + pumpR * 0.5, pumpY - pumpR * 0.6);
        ctx.quadraticCurveTo(cx + sway + pumpR * 0.6, pumpY, cx + sway + pumpR * 0.5, pumpY + pumpR * 0.6);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.ellipse(cx + sway - pumpR * 0.3, pumpY - pumpR * 0.2, pumpR * 0.3, pumpR * 0.25, -0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Stem
      ctx.fillStyle = '#5a8a3a';
      ctx.fillRect(cx + sway - 1, pumpY - pumpR * 0.8 - 3, 2, 4);

      // Curly tendril (mature)
      if (si.stage >= si.stageMax) {
        ctx.strokeStyle = '#4a8a30';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(cx + sway + 1, pumpY - pumpR * 0.8 - 2);
        ctx.quadraticCurveTo(cx + sway + 5, pumpY - pumpR - 5, cx + sway + 3, pumpY - pumpR - 1);
        ctx.stroke();
      }
    }
  }
}
CROP_DRAWERS.pumpkin = _drawPumpkin;

function drawPlayer() {
  const px = player.px + 2, py = player.py;
  const leg = (player.frame % 2 === 0 && player.moving) ? 2 : 0;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(px + 2, py + TILE - 6, TILE - 10, 4);

  // Legs
  ctx.fillStyle = '#4a3a8c';
  ctx.fillRect(px + 4, py + TILE - 12, 4, 8 - leg);
  ctx.fillRect(px + TILE - 14, py + TILE - 12, 4, 8 + leg);

  // Body (overalls)
  ctx.fillStyle = '#6a9ae8';
  ctx.fillRect(px + 2, py + TILE - 20, TILE - 10, 10);

  // Arms
  ctx.fillStyle = '#c07848';
  ctx.fillRect(px - 2, py + TILE - 20, 4, 8);
  ctx.fillRect(px + TILE - 8, py + TILE - 20, 4, 8);

  // Head
  ctx.fillStyle = '#d49060';
  ctx.fillRect(px + 4, py + TILE - 28, TILE - 14, 10);

  // Hat
  ctx.fillStyle = '#8b5e2a';
  ctx.fillRect(px + 2, py + TILE - 28, TILE - 10, 3);
  ctx.fillRect(px + 5, py + TILE - 32, TILE - 16, 6);

  // Eyes
  ctx.fillStyle = '#222';
  ctx.fillRect(px + 7, py + TILE - 25, 2, 2);
  ctx.fillRect(px + 13, py + TILE - 25, 2, 2);
}

function drawRobot(bot) {
  const px = bot.px + 2, py = bot.py;
  const selected = bot.id === selectedRobotId;
  const isRust = bot.type === 'rust';
  const isPro  = bot.type === 'pro';

  // Per-type palette
  const bodyCol  = isRust ? '#a06030' : isPro ? '#4880c0' : '#a8b8c8';
  const bodySelC = isRust ? '#c08040' : isPro ? '#68a0e0' : '#c8d8f0';
  const headCol  = isRust ? '#b87040' : isPro ? '#5890d0' : '#b8c8d8';
  const headSelC = isRust ? '#d09050' : isPro ? '#78b0f0' : '#d8e8ff';
  const trackCol = isRust ? '#5a3a20' : isPro ? '#1a3a5a' : '#333333';
  const detailCol= isRust ? '#7a4a20' : isPro ? '#2a5090' : '#7a8a98';

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(px + 2, py + TILE - 4, TILE - 10, 4);

  // Wheels/tracks
  ctx.fillStyle = trackCol;
  ctx.fillRect(px + 1, py + TILE - 10, TILE - 8, 5);

  // Body
  ctx.fillStyle = selected ? bodySelC : bodyCol;
  ctx.fillRect(px + 3, py + TILE - 22, TILE - 12, 14);

  // Panel details
  ctx.fillStyle = detailCol;
  ctx.fillRect(px + 5, py + TILE - 20, 6, 4);
  ctx.fillRect(px + TILE - 18, py + TILE - 20, 6, 4);

  // Type-specific body marks
  if (isRust) {
    // Rust patches
    ctx.fillStyle = '#5a3010';
    ctx.fillRect(px + 4, py + TILE - 15, 2, 3);
    ctx.fillRect(px + TILE - 12, py + TILE - 13, 3, 2);
    ctx.fillRect(px + 9, py + TILE - 18, 1, 2);
  } else if (isPro) {
    // Accent stripe + ventilation
    ctx.fillStyle = '#40a0ff';
    ctx.fillRect(px + 3, py + TILE - 12, TILE - 12, 2);
    ctx.fillStyle = '#2060a0';
    ctx.fillRect(px + 7, py + TILE - 16, 2, 3);
    ctx.fillRect(px + 11, py + TILE - 16, 2, 3);
  }

  // Head
  ctx.fillStyle = selected ? headSelC : headCol;
  ctx.fillRect(px + 5, py + TILE - 30, TILE - 16, 10);

  // Eyes (LED) — colour varies by type + state
  const batPct = bot.battery / (bot.batteryMax ?? S.robots.batteryMax);
  const eyeColor = isRust
    ? (batPct > 0.25 ? '#ffaa00' : '#ff6600')
    : isPro
      ? (batPct > 0.2 ? '#00ccff' : '#ff4040')
      : (batPct > 0.3 ? (bot.state === 'working' ? '#40ff80' : '#ffcc00') : '#ff4040');
  ctx.fillStyle = eyeColor;
  ctx.fillRect(px + 7, py + TILE - 28, 3, 3);
  ctx.fillRect(px + TILE - 18, py + TILE - 28, 3, 3);
  ctx.globalAlpha = 0.28;
  ctx.fillRect(px + 6, py + TILE - 29, 5, 5);
  ctx.fillRect(px + TILE - 19, py + TILE - 29, 5, 5);
  ctx.globalAlpha = 1;

  // Antenna
  if (isPro) {
    ctx.fillStyle = '#3070b0';
    ctx.fillRect(px + TILE/2 - 7, py + TILE - 35, 2, 7);
    ctx.fillRect(px + TILE/2 - 2, py + TILE - 37, 2, 9);
    ctx.fillStyle = selected ? '#80e0ff' : '#00ccff';
    ctx.fillRect(px + TILE/2 - 8, py + TILE - 38, 4, 4);
    ctx.fillRect(px + TILE/2 - 3, py + TILE - 40, 4, 4);
  } else {
    ctx.fillStyle = isRust ? '#7a5030' : '#888';
    ctx.fillRect(px + TILE/2 - 5, py + TILE - 34, 2, 6);
    ctx.fillStyle = selected ? '#ffcc00' : (isRust ? '#cc7722' : '#cc4444');
    ctx.fillRect(px + TILE/2 - 6, py + TILE - 37, 4, 4);
  }

  // Battery bar above robot
  const barW = TILE - 8;
  const barColor = isRust
    ? (batPct > 0.5 ? '#cc8800' : batPct > 0.2 ? '#cc5500' : '#cc2200')
    : (batPct > 0.5 ? '#40cc40' : batPct > 0.2 ? '#ffaa00' : '#ff4040');
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(px + 1, py - 8, barW, 5);
  ctx.fillStyle = barColor;
  ctx.fillRect(px + 1, py - 8, barW * batPct, 5);

  // Selection highlight
  if (selected) {
    ctx.strokeStyle = isPro ? '#40c0ff' : '#ffcc00';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(px, py + TILE - 32, TILE - 6, 32);
    ctx.setLineDash([]);
  }

  // Error indicator
  if (bot.codeError) {
    ctx.fillStyle = '#ff4040';
    ctx.fillRect(px + TILE - 14, py + TILE - 38, 8, 8);
    ctx.fillStyle = 'white';
    ctx.font = '6px sans-serif';
    ctx.fillText('!', px + TILE - 12, py + TILE - 32);
  }
}

function drawVehicle() {
  const vx = vehicle.px, vy = vehicle.py;
  const angle = vehicle.angle;
  const turboActive = vehicle.turboTimer > 0;
  const turboDuration = Math.max(1, Math.floor(S.vehicle?.turboDuration ?? 22));
  const turboBlend = turboActive ? Math.min(1, vehicle.turboTimer / turboDuration) : 0;
  const turboCharge = Math.max(0, Math.min(1, vehicle.turboCharge || 0));

  ctx.save();
  ctx.translate(vx + TILE / 2, vy + TILE / 2);
  ctx.rotate(angle);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(-TILE * 0.55, -TILE * 0.3 + 3, TILE * 1.1, TILE * 0.6);

  // Body
  const bodyBoost = turboBlend * 55;
  ctx.fillStyle = `rgb(${Math.round(192 + bodyBoost)},${Math.round(57 + bodyBoost * 0.25)},${Math.round(43 + bodyBoost * 0.35)})`;
  ctx.fillRect(-TILE * 0.5, -TILE * 0.3, TILE * 1.0, TILE * 0.6);

  // Roof
  ctx.fillStyle = `rgb(${Math.round(231 + bodyBoost * 0.3)},${Math.round(76 + bodyBoost * 0.35)},${Math.round(60 + bodyBoost * 0.4)})`;
  ctx.fillRect(-TILE * 0.15, -TILE * 0.22, TILE * 0.45, TILE * 0.44);

  // Windshield
  ctx.fillStyle = 'rgba(135,206,235,0.7)';
  ctx.fillRect(TILE * 0.15, -TILE * 0.18, TILE * 0.12, TILE * 0.36);

  // Rear window
  ctx.fillStyle = 'rgba(135,206,235,0.5)';
  ctx.fillRect(-TILE * 0.15, -TILE * 0.16, TILE * 0.1, TILE * 0.32);

  // Wheels
  ctx.fillStyle = '#2c2c2c';
  const ww = TILE * 0.14, wh = TILE * 0.1;
  ctx.fillRect(-TILE * 0.42, -TILE * 0.35, ww, wh);
  ctx.fillRect(-TILE * 0.42, TILE * 0.25, ww, wh);
  ctx.fillRect(TILE * 0.28, -TILE * 0.35, ww, wh);
  ctx.fillRect(TILE * 0.28, TILE * 0.25, ww, wh);

  // Headlights
  ctx.fillStyle = '#f1c40f';
  ctx.fillRect(TILE * 0.44, -TILE * 0.22, TILE * 0.06, TILE * 0.1);
  ctx.fillRect(TILE * 0.44, TILE * 0.12, TILE * 0.06, TILE * 0.1);

  if (turboActive) {
    ctx.fillStyle = `rgba(255,150,60,${0.4 + turboBlend * 0.35})`;
    for (let i = 0; i < 3; i++) {
      const flicker = ((animTime + i * 7) % 12) / 12;
      const flameLen = TILE * (0.18 + flicker * 0.16);
      const flameY = (i - 1) * TILE * 0.12;
      ctx.beginPath();
      ctx.moveTo(-TILE * 0.5, flameY);
      ctx.lineTo(-TILE * 0.5 - flameLen, flameY - TILE * 0.07);
      ctx.lineTo(-TILE * 0.5 - flameLen, flameY + TILE * 0.07);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Drift sparks
  if (vehicle.drifting && vehicle.occupied) {
    ctx.fillStyle = `rgba(255,200,50,${0.3 + Math.random() * 0.4})`;
    for (let i = 0; i < 3; i++) {
      const sx = -TILE * 0.4 + Math.random() * TILE * 0.2;
      const sy = (Math.random() > 0.5 ? 1 : -1) * (TILE * 0.3 + Math.random() * TILE * 0.1);
      ctx.fillRect(sx, sy, 2, 2);
    }
  }

  ctx.restore();

  if (vehicle.occupied && gameState === 'playing') {
    const meterW = TILE * 1.35;
    const meterH = 5;
    const meterX = vx + TILE / 2 - meterW / 2;
    const meterY = vy - 16;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(meterX - 1, meterY - 1, meterW + 2, meterH + 2);
    ctx.fillStyle = 'rgba(40,40,40,0.9)';
    ctx.fillRect(meterX, meterY, meterW, meterH);
    const fillW = Math.max(0, Math.min(meterW, meterW * turboCharge));
    const chargeGlow = Math.floor(120 + turboCharge * 120);
    ctx.fillStyle = turboActive
      ? 'rgba(255,180,80,0.95)'
      : (vehicle.turboReady ? 'rgba(255,235,120,0.95)' : `rgba(${chargeGlow},220,255,0.9)`);
    ctx.fillRect(meterX, meterY, fillW, meterH);
    ctx.font = `${Math.max(6, Math.round(7 / camera.zoom))}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = turboActive ? 'rgba(255,220,170,0.98)' : 'rgba(255,255,255,0.9)';
    ctx.fillText(
      turboActive ? 'TURBO!' : (vehicle.turboReady ? 'TURBO READY' : 'DRIFT CHARGE'),
      vx + TILE / 2,
      meterY - 3,
    );
    ctx.restore();
  }

  // "Press V" prompt when nearby and not driving
  if (!vehicle.occupied && gameState === 'playing') {
    const distX = Math.abs(player.px - vehicle.px);
    const distY = Math.abs(player.py - vehicle.py);
    if (distX < TILE * 2 && distY < TILE * 2) {
      ctx.save();
      ctx.font = `${Math.round(8 / camera.zoom)}px monospace`;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.textAlign = 'center';
      ctx.fillText('[V] Drive', vx + TILE / 2, vy - 8);
      ctx.restore();
    }
  }
}

function updateCursorCanvas() {
  cc.clearRect(0, 0, W, H);
  if (document.body.classList.contains('show-system-cursor')) return;
  const mx = mouseScreen.x, my = mouseScreen.y;
  const _ptd = ROBOT_TYPES[pendingRobotType] || ROBOT_TYPES.basic;
  const toolCursors = { hand:'✋', hoe:'⛏️', water:'💧', robot_place: _ptd.emoji };
  const icon = toolCursors[currentTool] || S.crops[currentTool]?.emoji || '✋';
  cc.font = '20px serif';
  cc.fillText(icon, mx - 10, my + 8);
}
