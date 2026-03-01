/* ═══════════════════════════════════════════════════════════════════════════
 * BFS PATHFINDING
 * ═══════════════════════════════════════════════════════════════════════════ */
function isWalkable(x, y) {
  if (!inBounds(x, y)) return false;
  const t = world[y][x].type;
  return t !== 'tree' && t !== 'water' && t !== 'rock';
}

function findPath(sx, sy, gx, gy) {
  if (sx === gx && sy === gy) return [];
  const queue = [{ x: sx, y: sy }];
  const visited = new Map();
  visited.set(`${sx},${sy}`, null);
  const dirs = [[0,1],[1,0],[0,-1],[-1,0]];
  let safety = 0;
  while (queue.length > 0 && safety++ < 2000) {
    const cur = queue.shift();
    if (cur.x === gx && cur.y === gy) {
      const path = [];
      let k = `${gx},${gy}`;
      while (k !== null) {
        const [px, py] = k.split(',').map(Number);
        path.unshift({ x: px, y: py });
        k = visited.get(k);
      }
      return path.slice(1);
    }
    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx, ny = cur.y + dy;
      const key = `${nx},${ny}`;
      if (!visited.has(key) && (isWalkable(nx, ny) || (nx === gx && ny === gy))) {
        visited.set(key, `${cur.x},${cur.y}`);
        queue.push({ x: nx, y: ny });
      }
    }
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * ROBOTS
 * ═══════════════════════════════════════════════════════════════════════════ */
let robots = [];
let nextRobotId = 1;

/* ─── Robot type definitions (game-side) ─── */
const ROBOT_TYPES = (() => {
  const defs = {};
  const emojis = { rust: '🦾', basic: '🤖', pro: '⚡' };
  for (const [key, cfg] of Object.entries(S.robots)) {
    if (typeof cfg !== 'object' || !cfg.cost) continue;
    defs[key] = {
      key,
      name:          cfg.name         ?? key,
      emoji:         emojis[key]      ?? '🤖',
      cost:          cfg.cost         ?? 250,
      speed:         cfg.speed        ?? S.robots.speed ?? 2.5,
      batteryMax:    cfg.batteryMax   ?? 100,
      batteryDrain:  cfg.batteryDrain ?? 0.05,
      chargeRate:    cfg.chargeRate   ?? 7,
      defaultRadius: cfg.defaultRadius ?? 8,
      invCapacity:   cfg.invCapacity  ?? 32,
      invSlots:      cfg.invSlots     ?? 3,
      canScavenge:   cfg.canScavenge  ?? false,
      bodyColor:     cfg.hexColor     ?? '#a8b8c8',
      headColor:     cfg.hexColor     ?? '#b8c8d8',
      description:   cfg.description  ?? '',
    };
  }
  // Fallback: ensure basic always exists
  if (!defs.basic) defs.basic = { key:'basic', name:'Farm Bot', emoji:'🤖', cost:250, speed:2.5, batteryMax:100, batteryDrain:0.05, chargeRate:7, defaultRadius:8, invCapacity:32, invSlots:3, canScavenge:false, bodyColor:'#a8b8c8', headColor:'#b8c8d8', description:'' };
  return defs;
})();

class Robot {
  constructor(tx, ty, type = 'basic') {
    this.id = nextRobotId++;
    this.type = type;
    const td = ROBOT_TYPES[type] || ROBOT_TYPES.basic;
    this.name = `${td.name.split(' ')[0]}-${this.id}`;
    this.tileX = tx; this.tileY = ty;
    this.px = tx * TILE; this.py = ty * TILE;
    this.homeTileX = tx; this.homeTileY = ty;
    this.speed = td.speed;
    this.batteryMax = td.batteryMax;
    this.battery = td.batteryMax;
    this.batteryDrain = td.batteryDrain;
    this.chargeRate = td.chargeRate;
    this.defaultRadius = td.defaultRadius;
    this.canScavenge = td.canScavenge;
    this.path = [];
    this.actionTimer = 0;
    this.workTimer = 0;
    this.state = 'idle';
    this.behavior = S.robots.defaultBehavior;
    this.assignedCrop = 'wheat';
    this.workArea = null;
    this.inventory = { seeds: {}, crops: {} };
    this.memory = {};
    this.customCode = '';
    this.compiledCode = null;
    this.codeError = '';
    this.invCapacity = td.invCapacity;
    this.invSlots = td.invSlots;
    this.facingX = 0; this.facingY = 1;
    this.frame = 0; this.frameTimer = 0;
  }
}

/* ─── ROBOT API ─── */
const robotAPI = {
  pos: (r) => ({ x: r.tileX, y: r.tileY }),

  findCrop: (r, f = {}) => {
    const cx = f.cx ?? r.tileX, cy = f.cy ?? r.tileY, max = f.maxDist ?? 12;
    let best = null, bd = Infinity;
    for (let dy = -max; dy <= max; dy++) for (let dx = -max; dx <= max; dx++) {
      const tx = cx + dx, ty = cy + dy;
      if (!inBounds(tx, ty)) continue;
      const tile = world[ty][tx];
      if (!tile.crop) continue;
      const cfg = S.crops[tile.crop.type];
      if (f.type && tile.crop.type !== f.type) continue;
      if (f.ready && tile.crop.stage < cfg.stages - 1) continue;
      if (f.needsWater) { if (tile.crop.watered || tile.crop.waterCount >= cfg.waterNeeded) continue; }
      const d = Math.abs(dx) + Math.abs(dy);
      if (d < bd) { bd = d; best = { x: tx, y: ty, crop: tile.crop }; }
    }
    return best;
  },

  findTile: (r, f = {}) => {
    const cx = f.cx ?? r.tileX, cy = f.cy ?? r.tileY, max = f.maxDist ?? 12;
    let best = null, bd = Infinity;
    for (let dy = -max; dy <= max; dy++) for (let dx = -max; dx <= max; dx++) {
      const tx = cx + dx, ty = cy + dy;
      if (!inBounds(tx, ty)) continue;
      const tile = world[ty][tx];
      if (f.tileType && tile.type !== f.tileType) continue;
      if (f.empty && tile.crop) continue;
      const d = Math.abs(dx) + Math.abs(dy);
      if (d < bd) { bd = d; best = { x: tx, y: ty, tile }; }
    }
    return best;
  },

  moveTo: (r, x, y) => {
    if (r.tileX === x && r.tileY === y) return;
    if (!r._targetX || r._targetX !== x || r._targetY !== y) {
      r._targetX = x; r._targetY = y;
      r.path = findPath(r.tileX, r.tileY, x, y) || [];
    }
  },

  water: (r, x, y) => {
    if (Math.abs(r.tileX - x) > 1 || Math.abs(r.tileY - y) > 1) { robotAPI.moveTo(r, x, y); return false; }
    if (!inBounds(x, y) || !world[y][x].crop) return false;
    const crop = world[y][x].crop;
    if (crop.watered || crop.waterCount >= S.crops[crop.type].waterNeeded) return false;
    r.state = 'working'; r.actionTimer = 20;
    r._pendingAction = { type: 'water', x, y };
    return true;
  },

  harvest: (r, x, y) => {
    if (Math.abs(r.tileX - x) > 1 || Math.abs(r.tileY - y) > 1) { robotAPI.moveTo(r, x, y); return false; }
    if (!inBounds(x, y) || !world[y][x].crop) return false;
    const crop = world[y][x].crop;
    if (crop.stage < S.crops[crop.type].stages - 1) return false;
    r.state = 'working'; r.actionTimer = 20;
    r._pendingAction = { type: 'harvest', x, y };
    return true;
  },

  plant: (r, x, y, type) => {
    if (Math.abs(r.tileX - x) > 1 || Math.abs(r.tileY - y) > 1) { robotAPI.moveTo(r, x, y); return false; }
    if (!inBounds(x, y) || world[y][x].type !== 'tilled' || world[y][x].crop) return false;
    if (!r.inventory.seeds[type] || r.inventory.seeds[type] <= 0) {
      // Pull seeds from player if possible
      if (inventory.seeds[type] > 0) {
        const take = Math.min(10, inventory.seeds[type]);
        inventory.seeds[type] -= take;
        r.inventory.seeds[type] = (r.inventory.seeds[type] || 0) + take;
        updateUI();
      } else return false;
    }
    r.state = 'working'; r.actionTimer = 20;
    r._pendingAction = { type: 'plant', x, y, cropType: type };
    return true;
  },

  till: (r, x, y) => {
    if (Math.abs(r.tileX - x) > 1 || Math.abs(r.tileY - y) > 1) { robotAPI.moveTo(r, x, y); return false; }
    if (!inBounds(x, y) || !isTillableTile(world[y][x])) return false;
    r.state = 'working'; r.actionTimer = 25;
    r._pendingAction = { type: 'till', x, y };
    return true;
  },

  idle: (r) => { r.state = 'idle'; r.path = []; r._pendingAction = null; },

  mem: (r, k, v) => { if (v !== undefined) r.memory[k] = v; return r.memory[k]; },

  inventory: (r) => r.inventory,

  nearby: (r, radius) => {
    const res = [];
    for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
      const tx = r.tileX + dx, ty = r.tileY + dy;
      if (inBounds(tx, ty)) res.push({ x: tx, y: ty, ...world[ty][tx] });
    }
    return res;
  },

  distanceTo: (r, x, y) => Math.abs(r.tileX - x) + Math.abs(r.tileY - y),
};

/* ─── BUILT-IN BEHAVIORS ─── */
const builtinBehaviors = {
  'idle': (r, api) => api.idle(r),

  'water_area': (r, api) => {
    const t = api.findCrop(r, { needsWater: true, maxDist: r.workArea?.radius || 10, cx: r.workArea?.x, cy: r.workArea?.y });
    if (t) { api.moveTo(r, t.x, t.y); api.water(r, t.x, t.y); } else api.idle(r);
  },

  'harvest': (r, api) => {
    const held = Object.values(r.inventory.crops).reduce((s,v) => s + v, 0);
    if (held >= (r.invCapacity || ROBOT_INV_CAPACITY)) { api.moveTo(r, r.homeTileX, r.homeTileY); return; }
    const t = api.findCrop(r, { ready: true, maxDist: r.workArea?.radius || 10, cx: r.workArea?.x, cy: r.workArea?.y });
    if (t) { api.moveTo(r, t.x, t.y); api.harvest(r, t.x, t.y); } else api.idle(r);
  },

  'full_cycle': (r, api) => {
    const held = Object.values(r.inventory.crops).reduce((s,v) => s + v, 0);
    if (held >= (r.invCapacity || ROBOT_INV_CAPACITY)) { api.moveTo(r, r.homeTileX, r.homeTileY); return; }
    const max = r.workArea?.radius || 12, cx = r.workArea?.x, cy = r.workArea?.y;
    const ready = api.findCrop(r, { ready: true, maxDist: max, cx, cy });
    if (ready) { api.moveTo(r, ready.x, ready.y); api.harvest(r, ready.x, ready.y); return; }
    const thirsty = api.findCrop(r, { needsWater: true, maxDist: max, cx, cy });
    if (thirsty) { api.moveTo(r, thirsty.x, thirsty.y); api.water(r, thirsty.x, thirsty.y); return; }
    const crop = r.assignedCrop || 'wheat';
    if ((r.inventory.seeds[crop] || 0) > 0 || (inventory.seeds[crop] || 0) > 0) {
      const empty = api.findTile(r, { tileType: 'tilled', empty: true, maxDist: max, cx, cy });
      if (empty) { api.moveTo(r, empty.x, empty.y); api.plant(r, empty.x, empty.y, crop); return; }
    }
    api.idle(r);
  },
};

/* ─── ALL BEHAVIORS (builtin + custom from settings.js) ─── */
function getAllBehaviors() {
  return { ...builtinBehaviors, ...(S.customBehaviors || {}) };
}

function runRobotBehavior(robot) {
  robot.workTimer++;
  if (robot.workTimer < Math.floor(S.robots.workDelay * getRFSWorkDelayBonus())) return;
  robot.workTimer = 0;

  if (robot.battery <= 0) {
    // Rustbot waits to scavenge; other robots go home to charge
    if (!robot.canScavenge) robotAPI.moveTo(robot, robot.homeTileX, robot.homeTileY);
    else robotAPI.idle(robot);
    return;
  }

  if (robot.compiledCode) {
    try { runSandboxed(robot, robot.compiledCode); robot.codeError = ''; }
    catch (e) { robot.codeError = e.message; robotAPI.idle(robot); }
    return;
  }

  const behaviors = getAllBehaviors();
  const fn = behaviors[robot.behavior] || behaviors['idle'];
  try { fn(robot, robotAPI); } catch(e) { robotAPI.idle(robot); }
}

function updateRobots() {
  for (const robot of robots) {
    // Handle pending action completion
    if (robot.actionTimer > 0) {
      robot.actionTimer--;
      if (robot.actionTimer === 0 && robot._pendingAction) {
        const a = robot._pendingAction;
        robot._pendingAction = null;
        executeRobotAction(robot, a);
      }
      continue;
    }

    // Battery — uses per-robot stats (RFS perk: -10% drain)
    const _drain = (robot.batteryDrain ?? S.robots.batteryDrain) * getRFSBatteryBonus();
    const _batMax = robot.batteryMax ?? S.robots.batteryMax;
    if (robot.state === 'working') robot.battery = Math.max(0, robot.battery - _drain);
    if (robot.tileX === robot.homeTileX && robot.tileY === robot.homeTileY && robot.battery < _batMax) {
      robot.battery = Math.min(_batMax, robot.battery + (robot.chargeRate ?? S.robots.chargeRate) / 60);
    }

    // Rustbot scavenge: eat a nearby ready crop to restore fuel when critical
    if (robot.canScavenge && robot.battery <= _batMax * 0.15) {
      const radius = robot.workArea?.radius || robot.defaultRadius || 5;
      outer: for (let _dy = -radius; _dy <= radius; _dy++) {
        for (let _dx = -radius; _dx <= radius; _dx++) {
          const nx = robot.tileX + _dx, ny = robot.tileY + _dy;
          if (!inBounds(nx, ny)) continue;
          const t = world[ny][nx];
          if (t.crop && S.crops[t.crop.type] && t.crop.stage >= S.crops[t.crop.type].stages - 1) {
            t.crop = null;
            robot.battery = Math.min(_batMax, robot.battery + _batMax * 0.35);
            spawnParticles(nx * TILE + TILE/2, ny * TILE, 'harvest', 4);
            notify(`🦾 ${robot.name} ate a crop for fuel!`);
            break outer;
          }
        }
      }
    }

    // Drop crops at home
    if (robot.tileX === robot.homeTileX && robot.tileY === robot.homeTileY) {
      for (const [type, qty] of Object.entries(robot.inventory.crops)) {
        if (qty > 0) {
          inventory.crops[type] = (inventory.crops[type] || 0) + qty;
          robot.inventory.crops[type] = 0;
          notify(`🤖 ${robot.name} delivered ${qty}x ${S.crops[type].emoji} ${type}!`);
          updateUI();
        }
      }
    }

    // Follow path
    if (robot.path && robot.path.length > 0) {
      const next = robot.path[0];
      const speed = (robot.speed ?? S.robots.speed) * TILE / 60 * getRFSSpeedBonus();
      const dx = next.x * TILE - robot.px, dy = next.y * TILE - robot.py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < speed + 1) {
        robot.px = next.x * TILE; robot.py = next.y * TILE;
        robot.tileX = next.x; robot.tileY = next.y;
        robot.path.shift();
        robot.battery = Math.max(0, robot.battery - _drain * 0.3);
      } else {
        robot.px += (dx / dist) * speed;
        robot.py += (dy / dist) * speed;
        robot.facingX = Math.sign(dx); robot.facingY = Math.sign(dy);
      }
      robot.frameTimer++;
      if (robot.frameTimer > 10) { robot.frame = (robot.frame + 1) % 4; robot.frameTimer = 0; }
      robot.state = 'moving';
    } else {
      robot.state = robot.battery <= _batMax * 0.1 ? 'charging' : 'idle';
      runRobotBehavior(robot);
    }
  }
}

function executeRobotAction(robot, action) {
  if (!inBounds(action.x, action.y)) return;
  const tile = world[action.y][action.x];

  if (action.type === 'water' && tile.crop) {
    const cfg = S.crops[tile.crop.type];
    if (!tile.crop.watered && tile.crop.waterCount < cfg.waterNeeded) {
      tile.crop.watered = true;
      spawnParticles(action.x * TILE + TILE/2, action.y * TILE, 'water', 6);
    }
  } else if (action.type === 'harvest' && tile.crop) {
    const cfg = S.crops[tile.crop.type];
    if (tile.crop.stage >= cfg.stages - 1) {
      const total = cfg.yield;
      robot.inventory.crops[tile.crop.type] = (robot.inventory.crops[tile.crop.type] || 0) + total;
      productionStats.today.robotHarvests += total;
      COMPANIES.rfs.price = Math.min(800, COMPANIES.rfs.price * (1 + total * 0.001));
      spawnParticles(action.x * TILE + TILE/2, action.y * TILE, 'harvest', 10);
      tile.crop = null;
    }
  } else if (action.type === 'plant') {
    if (tile.type === 'tilled' && !tile.crop) {
      const seeds = robot.inventory.seeds;
      const type = action.cropType;
      if ((seeds[type] || 0) > 0) {
        seeds[type]--;
        tile.crop = { type, stage: 0, growTimer: 0, waterCount: 0, watered: false };
      }
    }
  } else if (action.type === 'till' && isTillableTile(tile)) {
    tile.type = 'tilled';
    spawnParticles(action.x * TILE + TILE/2, action.y * TILE, 'dirt', 5);
  }
}
