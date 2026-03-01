'use strict';
/**
 * headless_sim.js — Robo Farm headless simulator for optimization
 *
 * Runs the game's core logic without any browser APIs.
 * Exports runSimulation(params) → stats and scoreWorld(params) → world metrics.
 *
 * Usage:
 *   const { runSimulation, scoreWorld, scoreEconomy } = require('./headless_sim.js');
 *   const result = runSimulation({ numDays: 60 });
 *   const worldScore = scoreWorld({ world: { seed: 42069 } });
 *
 * Or run directly:
 *   node headless_sim.js [seed] [numDays]
 */

// ─── SETTINGS NORMALIZATION ──────────────────────────────────────────────────
// Mirrors the normalization in settings.js so we can accept partial param objects.

function normalizeSettings(raw = {}) {
  const s = JSON.parse(JSON.stringify(raw));

  s.world = s.world || {};
  s.world.width  = s.world.width  ?? 80;
  s.world.height = s.world.height ?? 60;
  s.world.seed   = s.world.seed   ?? 42069;
  s.world.tileSize = s.world.tileSize ?? 32;
  s.world.riverCount       = s.world.riverCount       ?? 2;
  s.world.pondCount        = s.world.pondCount        ?? 4;
  s.world.treeFrequency    = s.world.treeFrequency    ?? Math.max(0, Math.min(0.25, (s.world.treeClusterCount ?? 10) / 100));
  s.world.rockFrequency    = s.world.rockFrequency    ?? (s.world.stoneDensity ?? 0.015);
  s.world.flowerFrequency  = s.world.flowerFrequency  ?? (s.world.flowerDensity ?? 0.06);
  const startX = s.player?.startX ?? 40;
  const startY = s.player?.startY ?? 30;
  s.world.farmZoneW = s.world.farmZoneW ?? (s.world.clearingW ?? 24);
  s.world.farmZoneH = s.world.farmZoneH ?? (s.world.clearingH ?? 18);
  s.world.farmZoneX = s.world.farmZoneX ?? Math.floor(startX - s.world.farmZoneW / 2);
  s.world.farmZoneY = s.world.farmZoneY ?? Math.floor(startY - s.world.farmZoneH / 2);

  s.player = s.player || {};
  s.player.startX     = s.player.startX     ?? startX;
  s.player.startY     = s.player.startY     ?? startY;
  s.player.startCoins = s.player.startCoins ?? (s.player.startMoney ?? 500);
  s.player.startSeeds = s.player.startSeeds ?? { wheat: 10, carrot: 5 };
  s.player.startRobots = s.player.startRobots ?? 0;

  s.time = s.time || {};
  // Use a much smaller ticksPerDay for headless speed; crops still take growDays days.
  s.time.ticksPerDay   = s.time.ticksPerDay   ?? 600;
  s.time.seasonLength  = s.time.seasonLength  ?? (s.time.daysPerSeason ?? 28);
  s.time.seasons       = (s.time.seasons || ['Spring','Summer','Autumn','Winter'])
                           .map(n => String(n).match(/[A-Za-z]+/)?.[0] ?? String(n));
  s.time.winterEnabled = s.time.winterEnabled ?? true;
  s.time.rainChance    = s.time.rainChance    ?? { Spring:0.22, Summer:0.12, Autumn:0.2, Winter:0.08 };

  s.crops = s.crops || {
    wheat:     { growDays:3,  stages:4, waterNeeded:1, seedCost:4,  sellPrice:12, emoji:'🌾', yield:1 },
    carrot:    { growDays:4,  stages:4, waterNeeded:1, seedCost:8,  sellPrice:22, emoji:'🥕', yield:1 },
    tomato:    { growDays:6,  stages:5, waterNeeded:2, seedCost:14, sellPrice:38, emoji:'🍅', yield:1 },
    blueberry: { growDays:8,  stages:4, waterNeeded:1, seedCost:22, sellPrice:55, emoji:'🫐', yield:1 },
    pumpkin:   { growDays:14, stages:5, waterNeeded:2, seedCost:35, sellPrice:90, emoji:'🎃', yield:1 },
  };
  for (const [, cfg] of Object.entries(s.crops)) {
    cfg.waterNeeded  = cfg.waterNeeded  ?? cfg.waterNeeds ?? 1;
    cfg.stages       = cfg.stages       ?? 4;
    cfg.yield        = cfg.yield        ?? 1;
    cfg.growTime     = (cfg.growDays ?? 4) * s.time.ticksPerDay;
  }

  s.robots = s.robots || {};
  s.robots.speed       = s.robots.speed       ?? 2.5;
  s.robots.workDelay   = s.robots.workDelay   ?? 22;
  s.robots.batteryMax  = s.robots.batteryMax  ?? 100;
  s.robots.batteryDrain = s.robots.batteryDrain ?? 0.05;
  s.robots.chargeRate  = s.robots.chargeRate  ?? 7;
  s.robots.maxRobots   = s.robots.maxRobots   ?? 30;

  s.economy = s.economy || {};
  s.economy.robotCost        = s.economy.robotCost        ?? 250;
  s.economy.bulkBonus        = s.economy.bulkBonus        ?? 1.08;
  s.economy.fluctuationAmount = s.economy.fluctuationAmount ?? 0.18;
  s.economy.seedPrices  = s.economy.seedPrices  || {};
  s.economy.cropPrices  = s.economy.cropPrices  || {};
  for (const [type, cfg] of Object.entries(s.crops)) {
    if (s.economy.seedPrices[type]  == null) s.economy.seedPrices[type]  = cfg.seedCost  ?? 5;
    if (s.economy.cropPrices[type] == null) s.economy.cropPrices[type] = cfg.sellPrice ?? 10;
  }

  return s;
}

// ─── RNG & MATH ──────────────────────────────────────────────────────────────

function mkRng(seed) {
  let s = seed >>> 0;
  return () => { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
}

function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) >>> 0;
  h = ((h ^ (h >> 13)) * 1274126177) >>> 0;
  return (h >>> 0) / 4294967296;
}

function tileRnd(x, y, i) { return hash2(x * 7 + i, y * 13 + i * 3); }
function smoothstep(t) { return t * t * (3 - 2 * t); }
function lerp(a, b, t) { return a + (b - a) * t; }

function valueNoise(x, y, scale) {
  const ix = Math.floor(x / scale), iy = Math.floor(y / scale);
  const fx = (x / scale) - ix,      fy = (y / scale) - iy;
  const tx = smoothstep(fx),         ty = smoothstep(fy);
  return lerp(
    lerp(hash2(ix, iy), hash2(ix + 1, iy), tx),
    lerp(hash2(ix, iy + 1), hash2(ix + 1, iy + 1), tx),
    ty
  );
}

// ─── WORLD GENERATION ────────────────────────────────────────────────────────
// Exact copy of generateWorld() from index.html, no rendering.

function generateWorld(S) {
  const WW = S.world.width, WH = S.world.height;
  const world = Array.from({ length: WH }, (_, y) =>
    Array.from({ length: WW }, (_, x) => ({ type: 'grass', crop: null, watered: false }))
  );

  const inBounds = (x, y) => x >= 0 && y >= 0 && x < WW && y < WH;

  // Trees
  for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) {
    const n = valueNoise(x, y, 6);
    const edgeDist = Math.min(x, y, WW - 1 - x, WH - 1 - y);
    const edgeBias = edgeDist < 5 ? (5 - edgeDist) / 5 : 0;
    if (n + edgeBias * 0.4 > (1 - S.world.treeFrequency)) world[y][x].type = 'tree';
  }

  // Rocks
  for (let y = 1; y < WH - 1; y++) for (let x = 1; x < WW - 1; x++) {
    if (world[y][x].type === 'grass' && tileRnd(x, y, 1) < S.world.rockFrequency)
      world[y][x].type = 'rock';
  }

  // Flowers
  for (let y = 1; y < WH - 1; y++) for (let x = 1; x < WW - 1; x++) {
    if (world[y][x].type === 'grass' && tileRnd(x, y, 2) < S.world.flowerFrequency)
      world[y][x].type = 'flower';
  }

  // Rivers
  const riverRng = mkRng(S.world.seed + 100);
  for (let r = 0; r < S.world.riverCount; r++) {
    const startEdge = Math.floor(riverRng() * 4);
    let rx, ry, dirX, dirY;
    if      (startEdge === 0) { rx = Math.floor(riverRng() * WW); ry = 0;      dirX =  0; dirY =  1; }
    else if (startEdge === 1) { rx = WW - 1; ry = Math.floor(riverRng() * WH); dirX = -1; dirY =  0; }
    else if (startEdge === 2) { rx = Math.floor(riverRng() * WW); ry = WH - 1; dirX =  0; dirY = -1; }
    else                      { rx = 0;      ry = Math.floor(riverRng() * WH); dirX =  1; dirY =  0; }

    const riverTiles = [];
    for (let step = 0; step < WW + WH; step++) {
      if (!inBounds(rx, ry)) break;
      riverTiles.push({ x: rx, y: ry });
      for (let w = -1; w <= 1; w++) {
        const wx = rx + (dirY !== 0 ? w : 0), wy = ry + (dirX !== 0 ? w : 0);
        if (inBounds(wx, wy)) world[wy][wx].type = 'water';
      }
      const turn = riverRng();
      if (turn < 0.3) { rx += dirX; if (dirX === 0) rx += (riverRng() < 0.5 ? -1 : 1); else ry += (riverRng() < 0.5 ? -1 : 1); }
      else            { rx += dirX; ry += dirY; }
      if (riverRng() < 0.15) { const tmp = dirX; dirX = dirY * (riverRng() < 0.5 ? 1 : -1); dirY = tmp * (riverRng() < 0.5 ? 1 : -1); }
    }
  }

  // Ponds
  const pondRng = mkRng(S.world.seed + 200);
  for (let p = 0; p < S.world.pondCount; p++) {
    const px = 5 + Math.floor(pondRng() * (WW - 10));
    const py = 5 + Math.floor(pondRng() * (WH - 10));
    const size = 2 + Math.floor(pondRng() * 4);
    for (let dy = -size; dy <= size; dy++) for (let dx = -size; dx <= size; dx++) {
      if (dx * dx + dy * dy <= size * size * (0.6 + pondRng() * 0.4) && inBounds(px + dx, py + dy))
        world[py + dy][px + dx].type = 'water';
    }
  }

  // Clear farm zone
  const fz = S.world;
  for (let y = fz.farmZoneY; y < fz.farmZoneY + fz.farmZoneH; y++)
    for (let x = fz.farmZoneX; x < fz.farmZoneX + fz.farmZoneW; x++)
      if (inBounds(x, y)) world[y][x] = { type: 'grass', crop: null, watered: false };

  return world;
}

// ─── WORLD QUALITY SCORER ────────────────────────────────────────────────────

function scoreWorld(rawSettings) {
  const S = normalizeSettings(rawSettings);
  const world = generateWorld(S);
  const WW = S.world.width, WH = S.world.height;
  const fz = S.world;
  const inBounds = (x, y) => x >= 0 && y >= 0 && x < WW && y < WH;
  const isWalkable = (x, y) => inBounds(x, y) && !['tree','water','rock'].includes(world[y][x].type);

  const metrics = {};
  const failures = [];

  // 1. Farm zone openness: % of tiles that are grass/flower (not blocked)
  let open = 0, total = 0;
  for (let y = fz.farmZoneY; y < fz.farmZoneY + fz.farmZoneH; y++)
    for (let x = fz.farmZoneX; x < fz.farmZoneX + fz.farmZoneW; x++) {
      if (!inBounds(x, y)) continue;
      total++;
      const t = world[y][x].type;
      if (t === 'grass' || t === 'flower') open++;
    }
  metrics.openness = total > 0 ? open / total : 0;
  if (metrics.openness < 0.65) failures.push({ metric: 'openness', value: metrics.openness, description: `Farm zone only ${(metrics.openness*100).toFixed(0)}% open — too many obstacles blocking farmable land` });
  else if (metrics.openness > 0.98) failures.push({ metric: 'openness', value: metrics.openness, description: `Farm zone ${(metrics.openness*100).toFixed(0)}% open — no natural variety or features near farm` });

  // 2. Farm zone accessibility from spawn: BFS reachability
  const spawnX = S.player.startX, spawnY = S.player.startY;
  const visited = new Set();
  const queue = [{ x: spawnX, y: spawnY }];
  visited.add(`${spawnX},${spawnY}`);
  const dirs = [[0,1],[1,0],[0,-1],[-1,0]];
  let safety = 0;
  while (queue.length && safety++ < 5000) {
    const { x, y } = queue.shift();
    for (const [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy;
      const key = `${nx},${ny}`;
      if (!visited.has(key) && isWalkable(nx, ny)) {
        visited.add(key);
        queue.push({ x: nx, y: ny });
      }
    }
  }
  let reachable = 0;
  for (let y = fz.farmZoneY; y < fz.farmZoneY + fz.farmZoneH; y++)
    for (let x = fz.farmZoneX; x < fz.farmZoneX + fz.farmZoneW; x++)
      if (visited.has(`${x},${y}`)) reachable++;
  metrics.accessibility = total > 0 ? reachable / total : 0;
  if (metrics.accessibility < 0.8) failures.push({ metric: 'accessibility', value: metrics.accessibility, description: `Only ${(metrics.accessibility*100).toFixed(0)}% of farm zone is reachable from spawn — rivers/trees may be cutting off the farm` });

  // 3. Nearest water distance: water should exist but not flood the farm
  let minWaterDist = Infinity;
  const fcx = Math.floor(fz.farmZoneX + fz.farmZoneW / 2);
  const fcy = Math.floor(fz.farmZoneY + fz.farmZoneH / 2);
  for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) {
    if (world[y][x].type === 'water') {
      const d = Math.abs(x - fcx) + Math.abs(y - fcy);
      if (d < minWaterDist) minWaterDist = d;
    }
  }
  metrics.waterDist = minWaterDist;
  if (minWaterDist < 4)  failures.push({ metric: 'waterDist', value: minWaterDist, description: `Water is ${minWaterDist} tiles from farm center — too close, may flood farm zone or be visually intrusive` });
  if (minWaterDist > 35) failures.push({ metric: 'waterDist', value: minWaterDist, description: `Nearest water is ${minWaterDist} tiles away — farm feels isolated from water features` });

  // 4. River tortuosity: rivers should wind naturally (ratio of path length to crow-fly distance)
  // We approximate by sampling water tiles in a chain and measuring compactness
  const waterTiles = [];
  for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++)
    if (world[y][x].type === 'water') waterTiles.push({ x, y });

  let tortuosity = 1.0;
  if (waterTiles.length > 20) {
    // BFS flood-fill the largest connected water body to measure its aspect ratio
    const seen = new Set();
    const startW = waterTiles[0];
    const bfsQ = [startW];
    seen.add(`${startW.x},${startW.y}`);
    const component = [];
    while (bfsQ.length) {
      const { x, y } = bfsQ.shift();
      component.push({ x, y });
      for (const [dx, dy] of dirs) {
        const nx = x + dx, ny = y + dy;
        const key = `${nx},${ny}`;
        if (!seen.has(key) && inBounds(nx, ny) && world[ny][nx].type === 'water') {
          seen.add(key); bfsQ.push({ x: nx, y: ny });
        }
      }
    }
    if (component.length > 10) {
      const xs = component.map(t => t.x), ys = component.map(t => t.y);
      const xSpan = Math.max(...xs) - Math.min(...xs) + 1;
      const ySpan = Math.max(...ys) - Math.min(...ys) + 1;
      const span = Math.max(xSpan, ySpan);
      // Tortuosity: how much more water tiles there are vs the straight-line span
      tortuosity = component.length / span;
    }
  }
  metrics.tortuosity = tortuosity;
  if (tortuosity < 1.5) failures.push({ metric: 'tortuosity', value: tortuosity, description: `River tortuosity ${tortuosity.toFixed(2)}: rivers are too straight — increase river winding for a more natural look` });
  if (tortuosity > 5.0) failures.push({ metric: 'tortuosity', value: tortuosity, description: `River tortuosity ${tortuosity.toFixed(2)}: rivers are too chaotic/blob-like — they look more like lakes than rivers` });

  // 5. Terrain variety near farm zone (scenic interest)
  const typesNearFarm = new Set();
  const scanR = 20;
  for (let y = fcy - scanR; y <= fcy + scanR; y++)
    for (let x = fcx - scanR; x <= fcx + scanR; x++)
      if (inBounds(x, y)) typesNearFarm.add(world[y][x].type);
  metrics.variety = typesNearFarm.size;
  if (metrics.variety < 3) failures.push({ metric: 'variety', value: metrics.variety, description: `Only ${metrics.variety} terrain types within ${scanR} tiles of farm — world feels monotonous` });

  // Weighted composite score (all normalized to 0–1, higher is better)
  const opennessScore    = metrics.openness >= 0.65 && metrics.openness <= 0.95
    ? 1 - Math.abs(metrics.openness - 0.82) / 0.18  // peak at 82%
    : metrics.openness < 0.65 ? metrics.openness / 0.65 : (1 - metrics.openness) / 0.05;
  const accessScore      = Math.min(1, metrics.accessibility / 0.9);
  const waterDistScore   = minWaterDist === Infinity ? 0 :
    minWaterDist < 4  ? minWaterDist / 4  :
    minWaterDist > 35 ? Math.max(0, 1 - (minWaterDist - 35) / 20) : 1;
  const tortuosityScore  = tortuosity < 1.5 ? tortuosity / 1.5 :
    tortuosity > 5.0 ? Math.max(0, 1 - (tortuosity - 5.0) / 3) : 1;
  const varietyScore     = Math.min(1, metrics.variety / 5);

  const score = (
    0.30 * opennessScore +
    0.30 * accessScore   +
    0.15 * waterDistScore +
    0.15 * tortuosityScore +
    0.10 * varietyScore
  );

  return { score, metrics, failures };
}

// ─── GAME SIMULATION ─────────────────────────────────────────────────────────

function runSimulation(rawSettings = {}, numDays = 60) {
  const S = normalizeSettings(rawSettings);
  const TPDAY = S.time.ticksPerDay;
  const SEASONS = S.time.seasons;
  const WW = S.world.width, WH = S.world.height;
  const inBounds = (x, y) => x >= 0 && y >= 0 && x < WW && y < WH;
  const isWalkable = (x, y) => inBounds(x, y) && !['tree','water','rock'].includes(world[y][x].type);

  // Game state
  const world = generateWorld(S);
  let coins = S.player.startCoins;
  let day = 1, tick = 0, season = 0;
  let rainDay = false;
  let priceMultipliers = {};
  const inventory = {
    seeds: { ...S.player.startSeeds },
    crops: {}
  };
  for (const type of Object.keys(S.crops)) {
    if (inventory.seeds[type] == null) inventory.seeds[type] = 0;
    inventory.crops[type] = 0;
  }

  // Stats for scoring
  const stats = {
    dayLog: [],             // per-day snapshot { day, coins, income, cropTypes, robots, constraintMoment }
    cropTypesBought: new Set(),
    totalIncome: 0,
    constraintMoments: 0,   // days player wanted to buy something but couldn't
    robotCostPaid: 0,
    robotHarvestValue: 0,
    priceHistory: [],       // daily price snapshots
    incomeHistory: [],      // daily income
    cropsHarvested: {},     // by type
    coinsHistory: [],       // daily ending coins
  };

  // Price fluctuation
  function refreshPrices() {
    for (const k of Object.keys(S.crops))
      priceMultipliers[k] = 1 + (Math.random() - 0.5) * 2 * S.economy.fluctuationAmount;
  }
  function getCropPrice(type) {
    return Math.round((S.economy.cropPrices[type] || 10) * (priceMultipliers[type] || 1));
  }
  refreshPrices();
  stats.priceHistory.push(Object.fromEntries(Object.keys(S.crops).map(t => [t, getCropPrice(t)])));

  // ── ROBOTS ──
  let robotsOwned = S.player.startRobots;
  let robots = [];
  let nextBotId = 1;

  function mkRobot(tx, ty) {
    return {
      id: nextBotId++, tileX: tx, tileY: ty,
      homeTileX: tx, homeTileY: ty,
      battery: S.robots.batteryMax,
      workTimer: 0, assignedCrop: 'wheat',
      memory: {}, inventory: { seeds: {}, crops: {} },
    };
  }

  // Place starter robots
  for (let i = 0; i < S.player.startRobots; i++)
    robots.push(mkRobot(S.player.startX + 2 + i, S.player.startY + 2));

  // Robot BFS (instant — headless robots teleport)
  function robotFindNearest(bot, predicate, maxDist = 18) {
    let best = null, bd = Infinity;
    const cx = S.world.farmZoneX + Math.floor(S.world.farmZoneW / 2);
    const cy = S.world.farmZoneY + Math.floor(S.world.farmZoneH / 2);
    // Search farm zone + surroundings
    for (let dy = -maxDist; dy <= maxDist; dy++)
      for (let dx = -maxDist; dx <= maxDist; dx++) {
        const tx = bot.tileX + dx, ty = bot.tileY + dy;
        if (!inBounds(tx, ty)) continue;
        const tile = world[ty][tx];
        if (!predicate(tile, tx, ty)) continue;
        const d = Math.abs(dx) + Math.abs(dy);
        if (d < bd) { bd = d; best = { tile, x: tx, y: ty }; }
      }
    return best;
  }

  function updateRobots() {
    for (const bot of robots) {
      bot.workTimer++;
      if (bot.workTimer < S.robots.workDelay) continue;
      bot.workTimer = 0;

      // Battery drain (per work cycle)
      if (bot.battery > 0) {
        bot.battery = Math.max(0, bot.battery - S.robots.batteryDrain * S.robots.workDelay);
      }

      // Charge at home
      if (bot.battery <= 0) {
        bot.tileX = bot.homeTileX; bot.tileY = bot.homeTileY;
        bot.battery = Math.min(S.robots.batteryMax, bot.battery + S.robots.chargeRate);
        continue;
      }

      // Drop crops at home (instant transfer)
      for (const [type, qty] of Object.entries(bot.inventory.crops)) {
        if (qty > 0) {
          const value = qty * getCropPrice(type);
          stats.robotHarvestValue += value;
          inventory.crops[type] = (inventory.crops[type] || 0) + qty;
          stats.cropsHarvested[type] = (stats.cropsHarvested[type] || 0) + qty;
          bot.inventory.crops[type] = 0;
        }
      }

      // AutoFarm behavior: harvest → water → plant → till
      // HARVEST
      const ready = robotFindNearest(bot, (t) => t.crop && (() => {
        const cfg = S.crops[t.crop.type];
        return cfg && t.crop.stage >= cfg.stages - 1;
      })());
      if (ready) {
        const tile = ready.tile;
        const cfg = S.crops[tile.crop.type];
        const got = cfg.yield ?? 1;
        bot.inventory.crops[tile.crop.type] = (bot.inventory.crops[tile.crop.type] || 0) + got;
        tile.crop = null;
        bot.tileX = ready.x; bot.tileY = ready.y;
        continue;
      }

      // WATER — water any unwatered planted crop (no waterCount check for simplicity)
      const thirsty = robotFindNearest(bot, (t) => t.crop && !t.crop.watered);
      if (thirsty) {
        thirsty.tile.crop.watered = true;
        bot.tileX = thirsty.x; bot.tileY = thirsty.y;
        continue;
      }

      // PLANT — use seeds from bot inventory or pull from global
      const empty = robotFindNearest(bot, (t) => t.type === 'tilled' && !t.crop);
      if (empty) {
        const crop = bot.assignedCrop || 'wheat';
        const hasSeed = (bot.inventory.seeds[crop] || 0) > 0 || (inventory.seeds[crop] || 0) > 0;
        if (hasSeed) {
          if ((bot.inventory.seeds[crop] || 0) > 0) bot.inventory.seeds[crop]--;
          else inventory.seeds[crop]--;
          empty.tile.crop = { type: crop, stage: 0, growTimer: 0, waterCount: 0, watered: false };
          bot.tileX = empty.x; bot.tileY = empty.y;
          continue;
        }
      }

      // TILL — if farm zone has untilled grass
      const tillable = robotFindNearest(bot, (t) => t.type === 'grass' || t.type === 'flower');
      if (tillable) { tillable.tile.type = 'tilled'; bot.tileX = tillable.x; bot.tileY = tillable.y; }
    }
  }

  // ── CROP SYSTEM ──
  let cropTick = 0;
  function updateCrops() {
    cropTick++;
    if (cropTick % 30 !== 0) return;
    const sn = SEASONS[season % SEASONS.length];
    if (sn === 'Winter' && S.time.winterEnabled) return;
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
      if (newStage > crop.stage) crop.stage = newStage;
    }
  }

  // ── PLAYER AI ──
  // The player is a "reasonable autonomous farmer": they act once per day.
  let playerBuyLog = [];

  function playerDailyActions() {
    // 1. Harvest all ready crops
    for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) {
      const tile = world[y][x];
      if (!tile.crop) continue;
      const cfg = S.crops[tile.crop.type];
      if (cfg && tile.crop.stage >= cfg.stages - 1) {
        const got = cfg.yield ?? 1;
        inventory.crops[tile.crop.type] = (inventory.crops[tile.crop.type] || 0) + got;
        stats.cropsHarvested[tile.crop.type] = (stats.cropsHarvested[tile.crop.type] || 0) + got;
        tile.crop = null;
      }
    }

    // 2. Water all unwatered planted crops
    for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) {
      const tile = world[y][x];
      if (tile.crop && !tile.crop.watered) tile.crop.watered = true;
    }

    // 3. Sell all crops (simple: sell everything)
    let income = 0;
    for (const [type, qty] of Object.entries(inventory.crops)) {
      if (!qty) continue;
      const bonus = qty >= 10 ? S.economy.bulkBonus : 1;
      income += Math.round(getCropPrice(type) * qty * bonus);
      inventory.crops[type] = 0;
    }
    coins += income;
    stats.totalIncome += income;
    stats.incomeHistory.push(income);

    // 4. Till more farm zone tiles (expand incrementally)
    const tillTarget = Math.min(day * 3, S.world.farmZoneW * S.world.farmZoneH);
    let tilled = 0;
    outer: for (let y = S.world.farmZoneY; y < S.world.farmZoneY + S.world.farmZoneH; y++)
      for (let x = S.world.farmZoneX; x < S.world.farmZoneX + S.world.farmZoneW; x++) {
        if (world[y][x].type === 'grass' || world[y][x].type === 'flower') {
          world[y][x].type = 'tilled';
          tilled++;
          if (tilled >= 3) break outer;
        }
      }

    // 5. Choose best ROI crop to buy (roi = sellPrice / (seedCost/5) per unit)
    const cropROIs = Object.entries(S.crops).map(([type, cfg]) => {
      const seedCostPerUnit = (S.economy.seedPrices[type] || 5) / 5;
      const roi = getCropPrice(type) / seedCostPerUnit;
      return { type, roi, seedCost: S.economy.seedPrices[type] || 5, growDays: cfg.growDays || 4 };
    }).sort((a, b) => b.roi - a.roi);

    // Track today's prices for diversity scoring
    stats.priceHistory.push(Object.fromEntries(Object.keys(S.crops).map(t => [t, getCropPrice(t)])));

    let wantedToBuy = false;
    // Try to buy seeds for top 2 ROI crops
    for (const { type, seedCost } of cropROIs.slice(0, 2)) {
      const qty = 10;
      const cost = seedCost * qty;
      if (coins >= cost) {
        coins -= cost;
        inventory.seeds[type] = (inventory.seeds[type] || 0) + qty;
        stats.cropTypesBought.add(type);
      } else {
        wantedToBuy = true;
      }
    }

    // 6. Plant all available seeds on tilled tiles
    for (const [type, qty] of Object.entries(inventory.seeds)) {
      if (!qty) continue;
      for (let y = S.world.farmZoneY; y < S.world.farmZoneY + S.world.farmZoneH; y++)
        for (let x = S.world.farmZoneX; x < S.world.farmZoneX + S.world.farmZoneW; x++) {
          if (!inventory.seeds[type] || inventory.seeds[type] <= 0) break;
          const tile = world[y][x];
          if (tile.type === 'tilled' && !tile.crop) {
            inventory.seeds[type]--;
            tile.crop = { type, stage: 0, growTimer: 0, waterCount: 0, watered: false };
          }
        }
    }

    // 7. Buy robot if we can afford it and have robots to deploy
    const maxBots = S.robots.maxRobots;
    if (robots.length < maxBots) {
      if (coins >= S.economy.robotCost) {
        coins -= S.economy.robotCost;
        stats.robotCostPaid += S.economy.robotCost;
        const spawnX = S.player.startX + 1 + robots.length;
        const spawnY = S.player.startY + 1;
        const bot = mkRobot(spawnX, spawnY);
        bot.assignedCrop = cropROIs[0]?.type || 'wheat';
        robots.push(bot);
        robotsOwned++;
      } else if (coins >= S.economy.robotCost * 0.4) {
        // Close to affording robot = constraint moment
        wantedToBuy = true;
      }
    }

    if (wantedToBuy) stats.constraintMoments++;

    stats.coinsHistory.push(coins);
    stats.dayLog.push({
      day, coins, income,
      cropTypes: stats.cropTypesBought.size,
      robots: robots.length,
      constraintMoment: wantedToBuy,
    });
  }

  // ── MAIN LOOP ──
  while (day <= numDays) {
    tick++;
    if (tick >= TPDAY) {
      tick = 0; day++;
      const prevSeason = season;
      season = Math.floor((day - 1) / S.time.seasonLength) % SEASONS.length;
      rainDay = Math.random() < (S.time.rainChance[SEASONS[season]] || 0.2);
      refreshPrices();
      playerDailyActions();
      if (day > numDays) break;
    }
    updateCrops();
    if (robots.length > 0) updateRobots();
  }

  return { S, stats };
}

// ─── ECONOMY BALANCE SCORER ───────────────────────────────────────────────────

function scoreEconomy(rawSettings, numDays = 60) {
  const { S, stats } = runSimulation(rawSettings, numDays);
  const metrics = {};
  const failures = [];

  // 1. Crop diversity: how many of the available crop types did the player actually use?
  const totalCropTypes = Object.keys(S.crops).length;
  metrics.cropDiversity = stats.cropTypesBought.size / totalCropTypes;
  if (stats.cropTypesBought.size <= 1)
    failures.push({ metric: 'cropDiversity', value: metrics.cropDiversity,
      description: `Player only ever bought 1 crop type — price differences are too small or one crop dominates so overwhelmingly that other crops feel pointless` });
  else if (stats.cropTypesBought.size < totalCropTypes / 2)
    failures.push({ metric: 'cropDiversity', value: metrics.cropDiversity,
      description: `Player only used ${stats.cropTypesBought.size}/${totalCropTypes} crop types — consider tightening price gaps or making slower crops more lucrative` });

  // 2. Constraint pressure: fraction of days with coin-pressure decisions
  metrics.constraintRate = stats.constraintMoments / numDays;
  if (metrics.constraintRate < 0.05)
    failures.push({ metric: 'constraintRate', value: metrics.constraintRate,
      description: `Player almost never felt coin-constrained (${(metrics.constraintRate*100).toFixed(0)}% of days) — economy may be too easy; try increasing robot cost or seed prices` });
  if (metrics.constraintRate > 0.5)
    failures.push({ metric: 'constraintRate', value: metrics.constraintRate,
      description: `Player was coin-constrained ${(metrics.constraintRate*100).toFixed(0)}% of days — economy is too punishing; prices or starting money may need adjustment` });

  // 3. Robot ROI: did robots earn back their cost in harvest value?
  if (stats.robotCostPaid > 0) {
    metrics.robotROI = stats.robotHarvestValue / stats.robotCostPaid;
    if (metrics.robotROI < 0.8)
      failures.push({ metric: 'robotROI', value: metrics.robotROI,
        description: `Robots earned back only ${(metrics.robotROI*100).toFixed(0)}% of their cost — robots feel economically worthless; lower robot cost or increase crop yields` });
    if (metrics.robotROI > 20)
      failures.push({ metric: 'robotROI', value: metrics.robotROI,
        description: `Robots have ${metrics.robotROI.toFixed(1)}x ROI — robots are too efficient, making manual farming feel pointless from day 1` });
  } else {
    metrics.robotROI = 0;
    failures.push({ metric: 'robotROI', value: 0,
      description: `Player never bought a robot — robot cost (${S.economy.robotCost}) may be too high relative to starting coins (${S.player.startCoins})` });
  }

  // 4. Income growth curve: ideally rises steadily, then plateaus (not flat or instantly maxed)
  const inc = stats.incomeHistory;
  if (inc.length >= 4) {
    const q1 = inc.slice(0, Math.floor(inc.length / 3));
    const q3 = inc.slice(Math.floor(inc.length * 2 / 3));
    const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length || 0;
    const earlyIncome = avg(q1), lateIncome = avg(q3);
    metrics.growthRatio = earlyIncome > 0 ? lateIncome / earlyIncome : (lateIncome > 0 ? Infinity : 1);
    if (metrics.growthRatio < 1.5)
      failures.push({ metric: 'growthRatio', value: metrics.growthRatio,
        description: `Income barely grew (${earlyIncome.toFixed(0)} early → ${lateIncome.toFixed(0)} late, ratio ${metrics.growthRatio.toFixed(2)}) — robots or investment choices have minimal payoff` });
    if (metrics.growthRatio > 15)
      failures.push({ metric: 'growthRatio', value: metrics.growthRatio,
        description: `Income exploded too fast (${earlyIncome.toFixed(0)} → ${lateIncome.toFixed(0)}, ratio ${metrics.growthRatio.toFixed(2)}) — early game may feel too slow and late game trivially easy` });
  } else {
    metrics.growthRatio = 1;
  }

  // 5. Relative price spread: are crops meaningfully differentiated?
  const prices = Object.values(S.economy.cropPrices);
  const minP = Math.min(...prices), maxP = Math.max(...prices);
  metrics.priceSpread = minP > 0 ? maxP / minP : 1;
  if (metrics.priceSpread < 2)
    failures.push({ metric: 'priceSpread', value: metrics.priceSpread,
      description: `Crop price range is only ${minP}–${maxP} (${metrics.priceSpread.toFixed(1)}x spread) — crops feel interchangeable; try widening price differences` });
  if (metrics.priceSpread > 15)
    failures.push({ metric: 'priceSpread', value: metrics.priceSpread,
      description: `Crop prices span ${metrics.priceSpread.toFixed(1)}x — cheapest crops become completely irrelevant once the player discovers expensive ones` });

  // Weighted composite score
  const diversityScore     = Math.min(1, metrics.cropDiversity / 0.6);
  const constraintScore    = metrics.constraintRate < 0.05 ? metrics.constraintRate / 0.05 :
    metrics.constraintRate > 0.5 ? Math.max(0, 1 - (metrics.constraintRate - 0.5) / 0.3) : 1;
  const roiScore           = metrics.robotROI === 0 ? 0 :
    metrics.robotROI < 1 ? metrics.robotROI :
    metrics.robotROI > 15 ? Math.max(0, 1 - (metrics.robotROI - 15) / 10) : 1;
  const growthScore        = metrics.growthRatio < 1.5 ? metrics.growthRatio / 1.5 :
    metrics.growthRatio > 15 ? Math.max(0, 1 - (metrics.growthRatio - 15) / 30) : 1;
  const spreadScore        = metrics.priceSpread < 2 ? metrics.priceSpread / 2 :
    metrics.priceSpread > 15 ? Math.max(0, 1 - (metrics.priceSpread - 15) / 10) : 1;

  const score = (
    0.25 * diversityScore  +
    0.20 * constraintScore +
    0.20 * roiScore        +
    0.20 * growthScore     +
    0.15 * spreadScore
  );

  return { score, metrics, failures, stats };
}

// ─── CLI ENTRY POINT ──────────────────────────────────────────────────────────

if (require.main === module) {
  const seed    = parseInt(process.argv[2]) || 42069;
  const numDays = parseInt(process.argv[3]) || 60;

  const settings = { world: { seed } };

  console.log(`\n=== World Quality (seed=${seed}) ===`);
  const wResult = scoreWorld(settings);
  console.log(`Score: ${wResult.score.toFixed(3)}`);
  console.log('Metrics:', JSON.stringify(wResult.metrics, null, 2));
  if (wResult.failures.length) {
    console.log('Failures:');
    wResult.failures.forEach(f => console.log(`  [${f.metric}] ${f.description}`));
  }

  console.log(`\n=== Economy Balance (${numDays} days) ===`);
  const eResult = scoreEconomy(settings, numDays);
  console.log(`Score: ${eResult.score.toFixed(3)}`);
  console.log('Metrics:', JSON.stringify(eResult.metrics, null, 2));
  if (eResult.failures.length) {
    console.log('Failures:');
    eResult.failures.forEach(f => console.log(`  [${f.metric}] ${f.description}`));
  }
  console.log(`\nFinal coins: ${eResult.stats.coinsHistory.at(-1)}`);
  console.log(`Crops harvested:`, eResult.stats.cropsHarvested);
  console.log(`Robots bought: ${eResult.stats.dayLog.filter(d => d.robots > 0).length > 0 ? eResult.stats.dayLog.at(-1)?.robots : 0}`);
}

module.exports = { runSimulation, scoreWorld, scoreEconomy, normalizeSettings, generateWorld };
