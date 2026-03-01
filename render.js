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

function resize() {
  W = window.innerWidth; H = window.innerHeight;
  gameCanvas.width = W; gameCanvas.height = H;
  cursorCanvas.width = W; cursorCanvas.height = H;
}

let animTime = 0;

function render() {
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

  // Draw tiles
  for (let y = vy0; y <= vy1; y++) {
    for (let x = vx0; x <= vx1; x++) {
      drawTile(x, y);
    }
  }

  // Draw crops
  for (let y = vy0; y <= vy1; y++) {
    for (let x = vx0; x <= vx1; x++) {
      if (world[y][x].crop) drawCrop(x, y);
    }
  }

  // Draw robots
  for (const bot of robots) drawRobot(bot);

  // Draw player
  drawPlayer();

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

  // Rain overlay
  if (rainDay) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawRain();
  }

  // Menu color theme tint
  if (gameState !== 'playing') {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = getMenuTint();
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
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

function drawRain() {
  ctx.strokeStyle = 'rgba(160,200,255,0.25)';
  ctx.lineWidth = 1;
  const count = 120;
  for (let i = 0; i < count; i++) {
    const rx = ((hash2(i, 1) * W + animTime * 3) % W);
    const ry = ((hash2(i, 2) * H + animTime * 8) % H);
    ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 2, ry + 10); ctx.stroke();
  }
}

function drawTile(x, y) {
  const tile = world[y][x];
  const px = x * TILE, py = y * TILE;
  const rnd = tileRnd(x, y, 0);

  if (tile.type === 'grass' || tile.type === 'flower') {
    ctx.fillStyle = GRASS_COLORS[Math.floor(rnd * 4)];
    ctx.fillRect(px, py, TILE, TILE);
    // Grass blades
    ctx.fillStyle = rnd > 0.5 ? '#3a7035' : '#4fa040';
    for (let i = 0; i < 3; i++) {
      const bx = px + tileRnd(x, y, i+1) * TILE, by = py + tileRnd(x, y, i+4) * TILE;
      ctx.fillRect(bx, by, 1, 3);
    }
    if (tile.type === 'flower') {
      const fc = FLOWER_COLORS[tile.variant];
      const fx = px + 4 + rnd * (TILE - 12), fy = py + 5 + tileRnd(x,y,8) * (TILE - 14);
      ctx.fillStyle = '#5a8a3a'; ctx.fillRect(fx + 1, fy - 2, 1, 6);
      ctx.fillStyle = fc; ctx.fillRect(fx, fy - 4, 4, 3);
      ctx.fillRect(fx - 1, fy - 3, 6, 1);
    }
  } else if (tile.type === 'tilled') {
    ctx.fillStyle = '#3c240e'; ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = '#4f3018';
    for (let i = 0; i < TILE; i += 4) { ctx.fillRect(px, py + i, TILE, 2); }
    if (tile.watered || (tile.crop && tile.crop.watered)) {
      ctx.fillStyle = 'rgba(30, 80, 150, 0.25)'; ctx.fillRect(px, py, TILE, TILE);
    }
  } else if (tile.type === 'water') {
    const wv = Math.sin(animTime * 0.05 + tile.animOffset) * 0.15 + 0.85;
    const wi = Math.floor(wv * WATER_COLORS.length) % WATER_COLORS.length;
    ctx.fillStyle = WATER_COLORS[wi]; ctx.fillRect(px, py, TILE, TILE);
    // Shimmer
    ctx.fillStyle = `rgba(255,255,255,${0.1 + Math.sin(animTime * 0.08 + rnd * 6) * 0.06})`;
    ctx.fillRect(px + 4, py + 8, TILE - 10, 2);
    ctx.fillRect(px + 10, py + 18, TILE - 16, 2);
  } else if (tile.type === 'tree') {
    ctx.fillStyle = GRASS_COLORS[0]; ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = TREE_TRUNK; ctx.fillRect(px + TILE/2 - 3, py + TILE/2 + 2, 6, TILE/2);
    ctx.fillStyle = TREE_CANOPY[tile.variant % 4];
    ctx.beginPath(); ctx.arc(px + TILE/2, py + TILE/2, TILE/2 - 1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.arc(px + TILE/2 + 2, py + TILE/2 + 2, TILE/2 - 1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = TREE_CANOPY[tile.variant % 4];
    ctx.beginPath(); ctx.arc(px + TILE/2, py + TILE/2, TILE/2 - 1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath(); ctx.arc(px + TILE/2 - 3, py + TILE/2 - 4, 4, 0, Math.PI * 2); ctx.fill();
  } else if (tile.type === 'rock') {
    ctx.fillStyle = GRASS_COLORS[0]; ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = '#888'; ctx.fillRect(px + 5, py + 8, TILE - 10, TILE - 14);
    ctx.fillStyle = '#aaa'; ctx.fillRect(px + 6, py + 9, 4, 3);
    ctx.fillStyle = '#666'; ctx.fillRect(px + 5, py + 18, TILE - 10, 4);
  }
}

function drawCrop(x, y) {
  const tile = world[y][x];
  const crop = tile.crop;
  const cfg = S.crops[crop.type];
  const px = x * TILE, py = y * TILE;
  const progress = crop.stage / (cfg.stages - 1);
  const h = Math.round(4 + progress * (TILE - 8));
  const w = Math.round(3 + progress * (TILE - 16));
  const cx = px + TILE / 2;
  const bot = py + TILE - 4;
  const wobble = Math.sin(animTime * 0.08 + tile.animOffset) * (2 * progress);

  ctx.fillStyle = '#5a8a3a';
  ctx.fillRect(cx - 1, bot - h, 2, h);

  if (crop.stage >= 1) {
    ctx.fillStyle = cfg.color;
    ctx.fillRect(cx - w/2 + wobble, bot - h, w, Math.round(h * 0.6));
    if (crop.stage >= 2) {
      ctx.fillStyle = '#6aad48';
      ctx.fillRect(cx - 4 + wobble * 0.7, bot - h * 0.5, 8, 4);
    }
    if (crop.stage >= cfg.stages - 1) {
      // Ready bounce + glow
      const bounce = Math.sin(animTime * 0.12 + tile.animOffset * 3) * 2;
      ctx.fillStyle = 'rgba(255,230,50,0.25)';
      ctx.beginPath(); ctx.arc(cx, bot - h / 2 + bounce, w/2 + 3, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = cfg.color;
      ctx.fillRect(cx - w/2 + wobble, bot - h + bounce, w, Math.round(h * 0.6));
    }
  }

  // Watered indicator
  if (tile.crop.watered) {
    ctx.fillStyle = 'rgba(70,180,255,0.4)';
    ctx.fillRect(px + 1, py + TILE - 4, TILE - 2, 3);
  }
}

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

function updateCursorCanvas() {
  cc.clearRect(0, 0, W, H);
  if (document.body.classList.contains('show-system-cursor')) return;
  const mx = mouseScreen.x, my = mouseScreen.y;
  const _ptd = ROBOT_TYPES[pendingRobotType] || ROBOT_TYPES.basic;
  const toolCursors = { hand:'✋', hoe:'⛏️', water:'💧', robot_place: _ptd.emoji };
  const seedCursors = { wheat:'🌾', carrot:'🥕', corn:'🌽', sunflower:'🌻', potato:'🥔', tomato:'🍅' };
  const icon = toolCursors[currentTool] || seedCursors[currentTool] || '✋';
  cc.font = '20px serif';
  cc.fillText(icon, mx - 10, my + 8);
}
