/* ═══════════════════════════════════════════════════════════════════════════
 * BFS PATHFINDING
 * ═══════════════════════════════════════════════════════════════════════════ */
const _robotsNormalizeCropType = window.RF_UTIL?.normalizeCropType || (type => (typeof type === 'string' && S.crops[type]) ? type : null);
const _robotsDefaultCropType = () => Object.keys(S.crops || {})[0] || 'wheat';

function _tileIdx(x, y) { return y * WW + x; }
function _idxX(i) { return i % WW; }
function _idxY(i) { return Math.floor(i / WW); }

function isWalkable(x, y, botId = null, moveCtx = null) {
  if (!inBounds(x, y)) return false;
  const t = world[y][x].type;
  if (t === 'tree' || t === 'water' || t === 'rock') return false;
  if (moveCtx && botId != null) {
    const occupant = moveCtx.occupiedByTile.get(_tileIdx(x, y));
    if (occupant != null && occupant !== botId) return false;
  }
  return true;
}

const _BFS_SIZE = WW * WH;
const _BFS_QUEUE = new Int32Array(_BFS_SIZE);
const _BFS_PARENT = new Int32Array(_BFS_SIZE);
const _BFS_STAMP = new Uint32Array(_BFS_SIZE);
const _BFS_GOAL = new Uint32Array(_BFS_SIZE);
const _BFS_DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0]];
let _bfsRunId = 1;

function _nextBfsRunId() {
  _bfsRunId++;
  if (_bfsRunId > 0xFFFFFFFF) {
    _BFS_STAMP.fill(0);
    _BFS_GOAL.fill(0);
    _bfsRunId = 1;
  }
}

function findPath(sx, sy, gx, gy, opts = {}) {
  if (!inBounds(sx, sy) || !inBounds(gx, gy)) return null;

  const moveCtx = opts.moveCtx || null;
  const botId = opts.botId ?? null;
  const stopRange = Math.max(0, Math.floor(Number(opts.stopRange) || 0));
  const start = _tileIdx(sx, sy);

  // Multi-goal BFS: path to any walkable tile within stopRange of goal.
  const goals = [];
  if (stopRange > 0) {
    for (let dy = -stopRange; dy <= stopRange; dy++) {
      for (let dx = -stopRange; dx <= stopRange; dx++) {
        if (Math.abs(dx) + Math.abs(dy) > stopRange) continue;
        const tx = gx + dx;
        const ty = gy + dy;
        if (!inBounds(tx, ty)) continue;
        if (!isWalkable(tx, ty, botId, moveCtx)) continue;
        goals.push(_tileIdx(tx, ty));
      }
    }
  }
  if (goals.length === 0) goals.push(_tileIdx(gx, gy));
  if (goals.includes(start)) return [];

  _nextBfsRunId();
  const stamp = _bfsRunId;
  for (const goal of goals) _BFS_GOAL[goal] = stamp;

  let head = 0, tail = 0;
  _BFS_QUEUE[tail++] = start;
  _BFS_STAMP[start] = stamp;
  _BFS_PARENT[start] = -1;
  let reachedGoal = -1;

  while (head < tail) {
    const cur = _BFS_QUEUE[head++];
    if (_BFS_GOAL[cur] === stamp) {
      reachedGoal = cur;
      break;
    }
    const cx = _idxX(cur);
    const cy = _idxY(cur);
    for (const [dx, dy] of _BFS_DIRS) {
      const nx = cx + dx, ny = cy + dy;
      if (!inBounds(nx, ny)) continue;
      const ni = _tileIdx(nx, ny);
      if (_BFS_STAMP[ni] === stamp) continue;
      if (_BFS_GOAL[ni] !== stamp && !isWalkable(nx, ny, botId, moveCtx)) continue;
      _BFS_STAMP[ni] = stamp;
      _BFS_PARENT[ni] = cur;
      _BFS_QUEUE[tail++] = ni;
    }
  }

  if (reachedGoal < 0) return null;

  let steps = 0;
  for (let i = reachedGoal; i !== start; i = _BFS_PARENT[i]) {
    if (i < 0) return null;
    steps++;
  }
  const path = new Array(steps);
  let i = reachedGoal;
  for (let p = steps - 1; p >= 0; p--) {
    path[p] = { x: _idxX(i), y: _idxY(i) };
    i = _BFS_PARENT[i];
  }
  return path;
}

function _hasPath(robot) {
  return Array.isArray(robot.path) && (robot._pathIndex || 0) < robot.path.length;
}
function _peekPathStep(robot) {
  return _hasPath(robot) ? robot.path[robot._pathIndex || 0] : null;
}
function _consumePathStep(robot) {
  if (!_hasPath(robot)) return;
  robot._pathIndex = (robot._pathIndex || 0) + 1;
  if ((robot._pathIndex || 0) >= robot.path.length) {
    robot.path = [];
    robot._pathIndex = 0;
  }
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
      name: cfg.name ?? key,
      emoji: emojis[key] ?? '🤖',
      cost: cfg.cost ?? 250,
      speed: cfg.speed ?? S.robots.speed ?? 2.5,
      batteryMax: cfg.batteryMax ?? 100,
      batteryDrain: cfg.batteryDrain ?? 0.05,
      chargeRate: cfg.chargeRate ?? 7,
      defaultRadius: cfg.defaultRadius ?? 8,
      invCapacity: cfg.invCapacity ?? 32,
      invSlots: cfg.invSlots ?? 3,
      canScavenge: cfg.canScavenge ?? false,
      bodyColor: cfg.hexColor ?? '#a8b8c8',
      headColor: cfg.hexColor ?? '#b8c8d8',
      description: cfg.description ?? '',
    };
  }
  // Fallback: ensure basic always exists
  if (!defs.basic) defs.basic = { key: 'basic', name: 'Farm Bot', emoji: '🤖', cost: 250, speed: 2.5, batteryMax: 100, batteryDrain: 0.05, chargeRate: 7, defaultRadius: 8, invCapacity: 32, invSlots: 3, canScavenge: false, bodyColor: '#a8b8c8', headColor: '#b8c8d8', description: '' };
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
    this._pathIndex = 0;
    this.actionTimer = 0;
    this.workTimer = 0;
    this.state = 'idle';
    this.behavior = S.robots.defaultBehavior;
    this.assignedCrop = _robotsDefaultCropType();
    this.workArea = null;
    this.inventory = { seeds: {}, crops: {}, harvestSeeds: {} };
    this.memory = {};
    this.customCode = '';
    this.compiledCode = null;
    this.codeError = '';
    this.invCapacity = td.invCapacity;
    this.invSlots = td.invSlots;
    this.facingX = 0; this.facingY = 1;
    this.frame = 0; this.frameTimer = 0;
    this._taskClaimKey = null;
    this._taskClaim = null;
    this._blockedSteps = 0;
    this._yieldUntilTick = 0;
    this._nextRepathTick = 0;
  }
}

const _ROBOT_TASK_KIND = 'work';
const _ROBOT_TASK_TTL = 120;
const _ROBOT_STALL_REPATH = 10;
const _ROBOT_STALL_RESET = 40;
const _ROBOT_YIELD_COOLDOWN = 8;
const _robotTaskClaims = new Map();
let _robotStepTick = 0;

function _taskKey(kind, x, y) { return `${kind}:${x},${y}`; }

function _expireRobotClaims(nowTick) {
  for (const [key, claim] of _robotTaskClaims) {
    if (claim.expiresAt < nowTick) _robotTaskClaims.delete(key);
  }
}

function _releaseRobotTask(robot) {
  if (!robot || !robot._taskClaimKey) return;
  const claim = _robotTaskClaims.get(robot._taskClaimKey);
  if (claim && claim.robotId === robot.id) _robotTaskClaims.delete(robot._taskClaimKey);
  robot._taskClaimKey = null;
  robot._taskClaim = null;
}

function _claimRobotTask(robot, kind, x, y, ttl = _ROBOT_TASK_TTL) {
  const key = _taskKey(kind, x, y);
  const prev = _robotTaskClaims.get(key);
  if (prev && prev.robotId !== robot.id && prev.expiresAt >= _robotStepTick) return false;
  if (robot._taskClaimKey && robot._taskClaimKey !== key) _releaseRobotTask(robot);
  const claim = { robotId: robot.id, kind, x, y, expiresAt: _robotStepTick + ttl };
  _robotTaskClaims.set(key, claim);
  robot._taskClaimKey = key;
  robot._taskClaim = claim;
  return true;
}

function _touchRobotTask(robot, ttl = _ROBOT_TASK_TTL) {
  if (!robot || !robot._taskClaimKey) return;
  const claim = _robotTaskClaims.get(robot._taskClaimKey);
  if (!claim || claim.robotId !== robot.id) {
    robot._taskClaimKey = null;
    robot._taskClaim = null;
    return;
  }
  claim.expiresAt = _robotStepTick + ttl;
  robot._taskClaim = claim;
}

function _isClaimedByOther(robot, kind, x, y) {
  const key = _taskKey(kind, x, y);
  const claim = _robotTaskClaims.get(key);
  if (!claim) return false;
  if (claim.expiresAt < _robotStepTick) {
    _robotTaskClaims.delete(key);
    return false;
  }
  return claim.robotId !== robot.id;
}

function _robotPriority(robot) {
  if (robot.actionTimer > 0 || robot._pendingAction) return 5;
  if (robot._taskClaimKey) return 4;
  if (_hasPath(robot)) return 3;
  return 1;
}

function _buildRobotMoveContext() {
  const occupiedByTile = new Map();
  const intentsByTile = new Map();
  const priorityByRobot = new Map();
  for (const robot of robots) {
    priorityByRobot.set(robot.id, _robotPriority(robot));
    occupiedByTile.set(_tileIdx(robot.tileX, robot.tileY), robot.id);
  }
  for (const robot of robots) {
    const next = _peekPathStep(robot);
    if (!next) continue;
    if (!inBounds(next.x, next.y)) continue;
    const key = _tileIdx(next.x, next.y);
    const mine = { robotId: robot.id, priority: priorityByRobot.get(robot.id) || 1 };
    const cur = intentsByTile.get(key);
    if (!cur || mine.priority > cur.priority || (mine.priority === cur.priority && mine.robotId < cur.robotId)) {
      intentsByTile.set(key, mine);
    }
  }
  return { occupiedByTile, intentsByTile, priorityByRobot };
}

function _canAdvanceRobot(robot, next, moveCtx) {
  const nextIdx = _tileIdx(next.x, next.y);
  const myPriority = moveCtx.priorityByRobot.get(robot.id) || 1;
  const winner = moveCtx.intentsByTile.get(nextIdx);
  if (winner && winner.robotId !== robot.id) {
    const loseTie = winner.priority > myPriority || (winner.priority === myPriority && winner.robotId < robot.id);
    if (loseTie) return false;
  }

  const occupantId = moveCtx.occupiedByTile.get(nextIdx);
  return occupantId == null || occupantId === robot.id;
}

function _repathRobotIfNeeded(robot, moveCtx) {
  if (!Number.isFinite(robot._targetX) || !Number.isFinite(robot._targetY)) return;
  if (robot.tileX === robot._targetX && robot.tileY === robot._targetY) return;
  if (_robotStepTick < (robot._nextRepathTick || 0)) return;
  if (!_hasPath(robot) || robot._blockedSteps > 0) {
    const repath = findPath(robot.tileX, robot.tileY, robot._targetX, robot._targetY, {
      botId: robot.id,
      moveCtx,
      stopRange: robot._targetStopRange || 0,
    });
    if (repath && repath.length > 0) {
      robot.path = repath;
      robot._pathIndex = 0;
    }
    robot._nextRepathTick = _robotStepTick + _ROBOT_STALL_REPATH + (robot.id % 3);
  }
}

/* ─── ROBOT API ─── */
const robotAPI = {
  pos: (r) => ({ x: r.tileX, y: r.tileY }),

  findCrop: (r, f = {}) => {
    const cx = f.cx ?? r.tileX, cy = f.cy ?? r.tileY, max = f.maxDist ?? 12;
    let best = null, bd = Infinity;
    for (let dy = -max; dy <= max; dy++) for (let dx = -max; dx <= max; dx++) {
      const d = Math.abs(dx) + Math.abs(dy);
      if (d > max) continue;
      const tx = cx + dx, ty = cy + dy;
      if (!inBounds(tx, ty)) continue;
      const tile = world[ty][tx];
      if (!tile.crop) continue;
      if (_isClaimedByOther(r, _ROBOT_TASK_KIND, tx, ty)) continue;
      const cropType = _robotsNormalizeCropType(tile.crop.type);
      if (!cropType) continue;
      const cfg = S.crops[cropType];
      if (f.type && cropType !== f.type) continue;
      if (f.ready && tile.crop.stage < cfg.stages - 1) continue;
      if (f.needsWater) {
        if (typeof normalizeCropHydration === 'function') normalizeCropHydration(tile.crop);
        if (tile.crop.waterCount >= cfg.waterNeeded) continue;
      }
      if (d < bd) { bd = d; best = { x: tx, y: ty, crop: tile.crop, type: cropType }; }
    }
    if (best && !_claimRobotTask(r, _ROBOT_TASK_KIND, best.x, best.y)) return null;
    return best;
  },

  findTile: (r, f = {}) => {
    const cx = f.cx ?? r.tileX, cy = f.cy ?? r.tileY, max = f.maxDist ?? 12;
    let best = null, bd = Infinity;
    for (let dy = -max; dy <= max; dy++) for (let dx = -max; dx <= max; dx++) {
      const d = Math.abs(dx) + Math.abs(dy);
      if (d > max) continue;
      const tx = cx + dx, ty = cy + dy;
      if (!inBounds(tx, ty)) continue;
      const tile = world[ty][tx];
      if (_isClaimedByOther(r, _ROBOT_TASK_KIND, tx, ty)) continue;
      if (f.tileType && tile.type !== f.tileType) continue;
      if (f.tillable && !isTillableTile(tile)) continue;
      if (f.empty && tile.crop) continue;
      if (d < bd) { bd = d; best = { x: tx, y: ty, tile }; }
    }
    if (best && !_claimRobotTask(r, _ROBOT_TASK_KIND, best.x, best.y)) return null;
    return best;
  },

  moveTo: (r, x, y, opts = {}) => {
    const stopRange = Math.max(0, Math.floor(Number(opts.stopRange) || 0));
    const d = Math.abs(r.tileX - x) + Math.abs(r.tileY - y);
    if (d <= stopRange) return;
    if (r._taskClaim && (r._taskClaim.x !== x || r._taskClaim.y !== y)) _releaseRobotTask(r);
    if (!Number.isFinite(r._targetX) ||
      r._targetX !== x ||
      r._targetY !== y ||
      (r._targetStopRange || 0) !== stopRange ||
      !_hasPath(r)
    ) {
      r._targetX = x;
      r._targetY = y;
      r._targetStopRange = stopRange;
      r.path = findPath(r.tileX, r.tileY, x, y, { botId: r.id, stopRange }) || [];
      r._pathIndex = 0;
      r._blockedSteps = 0;
      r._yieldUntilTick = 0;
      r._nextRepathTick = _robotStepTick + _ROBOT_STALL_REPATH + (r.id % 3);
    }
    _touchRobotTask(r, _ROBOT_TASK_TTL + 30);
  },

  water: (r, x, y) => {
    if (Math.abs(r.tileX - x) > 1 || Math.abs(r.tileY - y) > 1) { robotAPI.moveTo(r, x, y, { stopRange: 1 }); return false; }
    if (!inBounds(x, y) || !world[y][x].crop) { _releaseRobotTask(r); return false; }
    const crop = world[y][x].crop;
    const cropType = _robotsNormalizeCropType(crop.type);
    if (!cropType) { _releaseRobotTask(r); return false; }
    const cfg = S.crops[cropType];
    if (typeof normalizeCropHydration === 'function') normalizeCropHydration(crop);
    if (crop.waterCount >= cfg.waterNeeded) { _releaseRobotTask(r); return false; }
    r.state = 'working'; r.actionTimer = 20;
    r._pendingAction = { type: 'water', x, y };
    _touchRobotTask(r, _ROBOT_TASK_TTL + 30);
    return true;
  },

  harvest: (r, x, y) => {
    if (Math.abs(r.tileX - x) > 1 || Math.abs(r.tileY - y) > 1) { robotAPI.moveTo(r, x, y, { stopRange: 1 }); return false; }
    if (!inBounds(x, y) || !world[y][x].crop) { _releaseRobotTask(r); return false; }
    const crop = world[y][x].crop;
    const cropType = _robotsNormalizeCropType(crop.type);
    if (!cropType) { _releaseRobotTask(r); return false; }
    if (crop.stage < S.crops[cropType].stages - 1) { _releaseRobotTask(r); return false; }
    r.state = 'working'; r.actionTimer = 20;
    r._pendingAction = { type: 'harvest', x, y };
    _touchRobotTask(r, _ROBOT_TASK_TTL + 30);
    return true;
  },

  plant: (r, x, y, type) => {
    const cropType = _robotsNormalizeCropType(type);
    if (!cropType) { _releaseRobotTask(r); return false; }
    if (Math.abs(r.tileX - x) > 1 || Math.abs(r.tileY - y) > 1) { robotAPI.moveTo(r, x, y, { stopRange: 1 }); return false; }
    if (!inBounds(x, y) || world[y][x].type !== 'tilled' || world[y][x].crop) { _releaseRobotTask(r); return false; }
    if (!r.inventory.seeds[cropType] || r.inventory.seeds[cropType] <= 0) {
      // Pull seeds from player if possible
      if (inventory.seeds[cropType] > 0) {
        const room = _robotInventoryRoom(r, 'seed', cropType);
        if (room <= 0) { _releaseRobotTask(r); return false; }
        const take = Math.min(10, inventory.seeds[cropType], room);
        if (take > 0) {
          inventory.seeds[cropType] -= take;
          if (inventory.seeds[cropType] <= 0) delete inventory.seeds[cropType];
          r.inventory.seeds[cropType] = (r.inventory.seeds[cropType] || 0) + take;
          updateUI();
        }
      } else { _releaseRobotTask(r); return false; }
    }
    r.state = 'working'; r.actionTimer = 20;
    r._pendingAction = { type: 'plant', x, y, cropType };
    _touchRobotTask(r, _ROBOT_TASK_TTL + 30);
    return true;
  },

  till: (r, x, y) => {
    if (Math.abs(r.tileX - x) > 1 || Math.abs(r.tileY - y) > 1) { robotAPI.moveTo(r, x, y, { stopRange: 1 }); return false; }
    if (!inBounds(x, y) || !isTillableTile(world[y][x])) { _releaseRobotTask(r); return false; }
    r.state = 'working'; r.actionTimer = 25;
    r._pendingAction = { type: 'till', x, y };
    _touchRobotTask(r, _ROBOT_TASK_TTL + 30);
    return true;
  },

  idle: (r) => {
    r.state = 'idle';
    r.path = [];
    r._pathIndex = 0;
    r._pendingAction = null;
    r._targetX = undefined;
    r._targetY = undefined;
    r._targetStopRange = 0;
    r._blockedSteps = 0;
    _releaseRobotTask(r);
  },

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
const _invTotal = (dict) => Object.values(dict).reduce((s, v) => s + v, 0);
const _invSlotCount = (dict) => Object.keys(dict || {}).filter(k => (dict[k] || 0) > 0).length;
const _invTotalAll = (inv) => _invTotal(inv?.seeds || {}) + _invTotal(inv?.crops || {});

function _ensureRobotInventory(robot) {
  if (!robot.inventory || typeof robot.inventory !== 'object') robot.inventory = { seeds: {}, crops: {}, harvestSeeds: {} };
  if (!robot.inventory.seeds || typeof robot.inventory.seeds !== 'object') robot.inventory.seeds = {};
  if (!robot.inventory.crops || typeof robot.inventory.crops !== 'object') robot.inventory.crops = {};
  if (!robot.inventory.harvestSeeds || typeof robot.inventory.harvestSeeds !== 'object') robot.inventory.harvestSeeds = {};
}

function _robotInventoryRoom(robot, kind, cropType) {
  _ensureRobotInventory(robot);
  const cap = robot.invCapacity || 32;
  const total = _invTotalAll(robot.inventory);
  const room = cap - total;
  if (room <= 0) return 0;
  const slots = robot.invSlots || 3;
  const usedSlots = _invSlotCount(robot.inventory.seeds) + _invSlotCount(robot.inventory.crops);
  const hasStack = kind === 'seed'
    ? (robot.inventory.seeds[cropType] || 0) > 0
    : (robot.inventory.crops[cropType] || 0) > 0;
  if (!hasStack && usedSlots >= slots) return 0;
  return room;
}

function _storeRobotHarvest(robot, cropType, cropQty, seedQty) {
  const type = _robotsNormalizeCropType(cropType);
  if (!type) return false;
  _ensureRobotInventory(robot);
  const cropsToStore = Math.max(0, Math.floor(Number(cropQty) || 0));
  const seedsToStore = Math.max(0, Math.floor(Number(seedQty) || 0));
  const cap = robot.invCapacity || 32;
  const slots = robot.invSlots || 3;
  const total = _invTotalAll(robot.inventory);
  const usedSlots = _invSlotCount(robot.inventory.seeds) + _invSlotCount(robot.inventory.crops);
  const needsCropSlot = cropsToStore > 0 && (robot.inventory.crops[type] || 0) <= 0;
  const needsSeedSlot = seedsToStore > 0 && (robot.inventory.seeds[type] || 0) <= 0;
  const requiredSlots = usedSlots + (needsCropSlot ? 1 : 0) + (needsSeedSlot ? 1 : 0);
  if (total + cropsToStore + seedsToStore > cap) return false;
  if (requiredSlots > slots) return false;
  if (cropsToStore > 0) {
    robot.inventory.crops[type] = (robot.inventory.crops[type] || 0) + cropsToStore;
  }
  if (seedsToStore > 0) {
    robot.inventory.seeds[type] = (robot.inventory.seeds[type] || 0) + seedsToStore;
    robot.inventory.harvestSeeds[type] = (robot.inventory.harvestSeeds[type] || 0) + seedsToStore;
  }
  return true;
}

function _hasSeedAccess(robot, cropType) {
  if (!_robotsNormalizeCropType(cropType)) return false;
  return (robot.inventory.seeds[cropType] || 0) > 0 || (inventory.seeds[cropType] || 0) > 0;
}

function _tryPrepField(robot, api, cropType, max, cx, cy) {
  if (!_hasSeedAccess(robot, cropType)) return false;
  const raw = api.findTile(robot, { tillable: true, maxDist: max, cx, cy });
  if (!raw) return false;
  api.moveTo(robot, raw.x, raw.y);
  api.till(robot, raw.x, raw.y);
  return true;
}

const builtinBehaviors = {
  'idle': (r, api) => api.idle(r),

  'water_area': (r, api) => {
    const t = api.findCrop(r, { needsWater: true, maxDist: r.workArea?.radius || 10, cx: r.workArea?.x, cy: r.workArea?.y });
    if (t) { api.moveTo(r, t.x, t.y); api.water(r, t.x, t.y); } else api.idle(r);
  },

  'harvest': (r, api) => {
    const held = _invTotalAll(r.inventory);
    if (held >= (r.invCapacity || 32)) { _releaseRobotTask(r); api.moveTo(r, r.homeTileX, r.homeTileY); return; }
    const t = api.findCrop(r, { ready: true, maxDist: r.workArea?.radius || 10, cx: r.workArea?.x, cy: r.workArea?.y });
    if (t) { api.moveTo(r, t.x, t.y); api.harvest(r, t.x, t.y); } else api.idle(r);
  },

  'full_cycle': (r, api) => {
    const held = _invTotalAll(r.inventory);
    if (held >= (r.invCapacity || 32)) { _releaseRobotTask(r); api.moveTo(r, r.homeTileX, r.homeTileY); return; }
    const max = r.workArea?.radius || 12, cx = r.workArea?.x, cy = r.workArea?.y;
    const ready = api.findCrop(r, { ready: true, maxDist: max, cx, cy });
    if (ready) { api.moveTo(r, ready.x, ready.y); api.harvest(r, ready.x, ready.y); return; }
    const thirsty = api.findCrop(r, { needsWater: true, maxDist: max, cx, cy });
    if (thirsty) { api.moveTo(r, thirsty.x, thirsty.y); api.water(r, thirsty.x, thirsty.y); return; }
    const crop = _robotsNormalizeCropType(r.assignedCrop) || _robotsDefaultCropType();
    if (_hasSeedAccess(r, crop)) {
      const empty = api.findTile(r, { tileType: 'tilled', empty: true, maxDist: max, cx, cy });
      if (empty) { api.moveTo(r, empty.x, empty.y); api.plant(r, empty.x, empty.y, crop); return; }
      if (_tryPrepField(r, api, crop, max, cx, cy)) return;
    }
    api.idle(r);
  },

  // Back-compat aliases for older saves/settings naming.
  'autoFarm': (r, api) => builtinBehaviors['full_cycle'](r, api),
  'harvester': (r, api) => builtinBehaviors['harvest'](r, api),

  'planter': (r, api) => {
    const max = r.workArea?.radius || 12, cx = r.workArea?.x, cy = r.workArea?.y;
    const thirsty = api.findCrop(r, { needsWater: true, maxDist: max, cx, cy });
    if (thirsty) { api.moveTo(r, thirsty.x, thirsty.y); api.water(r, thirsty.x, thirsty.y); return; }
    const crop = _robotsNormalizeCropType(r.assignedCrop) || _robotsDefaultCropType();
    if (_hasSeedAccess(r, crop)) {
      const empty = api.findTile(r, { tileType: 'tilled', empty: true, maxDist: max, cx, cy });
      if (empty) { api.moveTo(r, empty.x, empty.y); api.plant(r, empty.x, empty.y, crop); return; }
      if (_tryPrepField(r, api, crop, max, cx, cy)) return;
    }
    api.idle(r);
  },

  'areaFarm': (r, api) => {
    if (!r.workArea) {
      r.workArea = { x: r.homeTileX, y: r.homeTileY, radius: Math.max(4, r.defaultRadius || 8) };
    }
    const held = _invTotalAll(r.inventory);
    if (held >= (r.invCapacity || 32)) { _releaseRobotTask(r); api.moveTo(r, r.homeTileX, r.homeTileY); return; }
    const max = r.workArea.radius, cx = r.workArea.x, cy = r.workArea.y;
    const ready = api.findCrop(r, { ready: true, maxDist: max, cx, cy });
    if (ready) { api.moveTo(r, ready.x, ready.y); api.harvest(r, ready.x, ready.y); return; }
    const thirsty = api.findCrop(r, { needsWater: true, maxDist: max, cx, cy });
    if (thirsty) { api.moveTo(r, thirsty.x, thirsty.y); api.water(r, thirsty.x, thirsty.y); return; }
    const crop = _robotsNormalizeCropType(r.assignedCrop) || _robotsDefaultCropType();
    if (_hasSeedAccess(r, crop)) {
      const empty = api.findTile(r, { tileType: 'tilled', empty: true, maxDist: max, cx, cy });
      if (empty) { api.moveTo(r, empty.x, empty.y); api.plant(r, empty.x, empty.y, crop); return; }
      if (_tryPrepField(r, api, crop, max, cx, cy)) return;
    }
    api.idle(r);
  },
};

/* ─── ALL BEHAVIORS (builtin + custom from settings.js) ─── */
function getAllBehaviors() {
  return { ...builtinBehaviors, ...(S.customBehaviors || {}) };
}

function _refreshInventoryViews() {
  updateUI();
  if (typeof _isInventoryModalOpen === 'function' &&
    typeof buildInventoryModal === 'function' &&
    _isInventoryModalOpen()) {
    buildInventoryModal();
  }
}

function runRobotBehavior(robot) {
  if ((robot._yieldUntilTick || 0) > _robotStepTick) return;
  if ((robot._yieldUntilTick || 0) > 0 && robot._yieldUntilTick <= _robotStepTick) robot._yieldUntilTick = 0;
  robot.workTimer++;
  if (robot.workTimer < Math.floor(S.robots.workDelay * getRFSWorkDelayBonus())) return;
  robot.workTimer = 0;

  if (robot.battery <= 0) {
    // Rustbot waits to scavenge; other robots go home to charge
    if (!robot.canScavenge) {
      _releaseRobotTask(robot);
      robotAPI.moveTo(robot, robot.homeTileX, robot.homeTileY);
    } else robotAPI.idle(robot);
    return;
  }

  if (robot.compiledCode) {
    try { runSandboxed(robot, robot.compiledCode); robot.codeError = ''; }
    catch (e) { robot.codeError = e.message; robotAPI.idle(robot); }
    return;
  }

  const behaviors = getAllBehaviors();
  const fn = behaviors[robot.behavior] || behaviors['idle'];
  try { fn(robot, robotAPI); } catch (e) { robotAPI.idle(robot); }
}

function updateRobots() {
  _robotStepTick++;
  _expireRobotClaims(_robotStepTick);
  const liveRobotIds = new Set(robots.map(r => r.id));
  for (const [key, claim] of _robotTaskClaims) {
    if (!liveRobotIds.has(claim.robotId)) _robotTaskClaims.delete(key);
  }
  for (const robot of robots) {
    if (!robot._taskClaimKey) continue;
    const claim = _robotTaskClaims.get(robot._taskClaimKey);
    if (!claim || claim.robotId !== robot.id) {
      robot._taskClaimKey = null;
      robot._taskClaim = null;
    } else {
      robot._taskClaim = claim;
    }
  }

  const moveCtx = _buildRobotMoveContext();

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
          const cropType = t.crop ? _robotsNormalizeCropType(t.crop.type) : null;
          if (cropType && t.crop.stage >= S.crops[cropType].stages - 1) {
            t.crop = null;
            if (typeof markTileDirty === 'function') markTileDirty(nx, ny);
            robot.battery = Math.min(_batMax, robot.battery + _batMax * 0.35);
            spawnParticles(nx * TILE + TILE / 2, ny * TILE, 'harvest', 4);
            notify(`🦾 ${robot.name} ate a crop for fuel!`);
            break outer;
          }
        }
      }
    }

    // Drop crops at home
    if (robot.tileX === robot.homeTileX && robot.tileY === robot.homeTileY) {
      let deliveredCrops = 0;
      for (const [type, qty] of Object.entries(robot.inventory.crops)) {
        if (qty > 0) {
          inventory.crops[type] = (inventory.crops[type] || 0) + qty;
          robot.inventory.crops[type] = 0;
          deliveredCrops += qty;
        }
      }

      let deliveredSeeds = 0;
      for (const [type, qty] of Object.entries(robot.inventory.harvestSeeds)) {
        if (qty > 0) {
          inventory.seeds[type] = (inventory.seeds[type] || 0) + qty;
          robot.inventory.harvestSeeds[type] = 0;
          deliveredSeeds += qty;
        }
      }

      if (deliveredCrops > 0 || deliveredSeeds > 0) {
        let msg = `🤖 ${robot.name} delivered`;
        if (deliveredCrops > 0) msg += ` ${deliveredCrops} crops`;
        if (deliveredSeeds > 0) msg += `${deliveredCrops > 0 ? ' and' : ''} ${deliveredSeeds} seeds`;
        msg += '!';
        notify(msg);
        _refreshInventoryViews();
      }
    }

    // Follow path
    if (_hasPath(robot)) {
      const next = _peekPathStep(robot);
      if (!next) continue;
      if (!inBounds(next.x, next.y)) {
        _consumePathStep(robot);
        continue;
      }
      if (!_canAdvanceRobot(robot, next, moveCtx)) {
        robot._blockedSteps = (robot._blockedSteps || 0) + 1;
        robot.state = 'yielding';
        if (robot._taskClaimKey && robot._blockedSteps < Math.floor(_ROBOT_STALL_RESET * 0.65)) {
          _touchRobotTask(robot, _ROBOT_TASK_TTL + 45);
        }
        _repathRobotIfNeeded(robot, moveCtx);
        if (robot._blockedSteps >= _ROBOT_STALL_RESET) {
          _releaseRobotTask(robot);
          robot.path = [];
          robot._pathIndex = 0;
          robot._targetX = undefined;
          robot._targetY = undefined;
          robot._targetStopRange = 0;
          robot._yieldUntilTick = _robotStepTick + _ROBOT_YIELD_COOLDOWN + (robot.id % 4);
          robot._blockedSteps = 0;
        }
        continue;
      }
      const speed = (robot.speed ?? S.robots.speed) * TILE / 60 * getRFSSpeedBonus();
      const dx = next.x * TILE - robot.px, dy = next.y * TILE - robot.py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < speed + 1) {
        const oldIdx = _tileIdx(robot.tileX, robot.tileY);
        robot.px = next.x * TILE; robot.py = next.y * TILE;
        robot.tileX = next.x; robot.tileY = next.y;
        _consumePathStep(robot);
        moveCtx.occupiedByTile.delete(oldIdx);
        moveCtx.occupiedByTile.set(_tileIdx(robot.tileX, robot.tileY), robot.id);
        robot.battery = Math.max(0, robot.battery - _drain * 0.3);
        robot._blockedSteps = 0;
        if (robot._taskClaimKey) _touchRobotTask(robot, _ROBOT_TASK_TTL + 30);
      } else {
        robot.px += (dx / dist) * speed;
        robot.py += (dy / dist) * speed;
        robot.facingX = Math.sign(dx); robot.facingY = Math.sign(dy);
      }
      robot.frameTimer++;
      if (robot.frameTimer > 10) { robot.frame = (robot.frame + 1) % 4; robot.frameTimer = 0; }
      robot.state = 'moving';
    } else {
      if ((robot._yieldUntilTick || 0) > _robotStepTick) {
        robot.state = 'yielding';
        continue;
      }
      robot.state = robot.battery <= _batMax * 0.1 ? 'charging' : 'idle';
      runRobotBehavior(robot);
    }
  }
}

function executeRobotAction(robot, action) {
  if (!inBounds(action.x, action.y)) {
    _releaseRobotTask(robot);
    return;
  }
  _ensureRobotInventory(robot);
  const tile = world[action.y][action.x];

  if (action.type === 'water' && tile.crop) {
    const cropType = _robotsNormalizeCropType(tile.crop.type);
    const cfg = cropType ? S.crops[cropType] : null;
    if (!cfg) {
      _releaseRobotTask(robot);
      return;
    }
    if (typeof normalizeCropHydration === 'function') normalizeCropHydration(tile.crop);
    if (tile.crop.waterCount < cfg.waterNeeded) {
      tile.crop.waterCount++;
      tile.crop.waterDay = day;
      tile.crop.watered = true;
      if (typeof markTileDirty === 'function') markTileDirty(action.x, action.y);
      spawnParticles(action.x * TILE + TILE / 2, action.y * TILE, 'water', 6);
    }
  } else if (action.type === 'harvest' && tile.crop) {
    const cropType = _robotsNormalizeCropType(tile.crop.type);
    const cfg = cropType ? S.crops[cropType] : null;
    if (!cfg) {
      _releaseRobotTask(robot);
      return;
    }
    if (tile.crop.stage >= cfg.stages - 1) {
      const total = (typeof getHarvestYieldForTile === 'function')
        ? getHarvestYieldForTile(action.x, action.y, cropType)
        : Math.max(1, Math.floor(cfg.yield || 1));
      const ctype = cropType;
      if (!_storeRobotHarvest(robot, ctype, total, total)) {
        robotAPI.moveTo(robot, robot.homeTileX, robot.homeTileY);
        return;
      }
      productionStats.today.robotHarvests += total;
      if (typeof recordGoalMetric === 'function') recordGoalMetric('robotHarvests', total);
      COMPANIES.rfs.price = Math.min(800, COMPANIES.rfs.price * (1 + total * 0.001));
      spawnParticles(action.x * TILE + TILE / 2, action.y * TILE, 'harvest', 10);
      tile.crop = null;
      if (typeof markTileDirty === 'function') markTileDirty(action.x, action.y);
      _refreshInventoryViews();
    }
  } else if (action.type === 'plant') {
    if (tile.type === 'tilled' && !tile.crop) {
      const seeds = robot.inventory.seeds;
      const harvestSeeds = robot.inventory.harvestSeeds || {};
      const type = _robotsNormalizeCropType(action.cropType);
      if (!type) {
        _releaseRobotTask(robot);
        return;
      }
      if ((seeds[type] || 0) > 0) {
        seeds[type]--;
        if ((harvestSeeds[type] || 0) > 0) harvestSeeds[type]--;
        tile.crop = { type, stage: 0, growTimer: 0, waterCount: 0, watered: false, waterDay: day };
        if (typeof markTileDirty === 'function') markTileDirty(action.x, action.y);
        if (typeof markTileDeveloped === 'function') markTileDeveloped(action.x, action.y);
      }
    }
  } else if (action.type === 'till' && isTillableTile(tile)) {
    tile.type = 'tilled';
    if (typeof markTileDirty === 'function') markTileDirty(action.x, action.y);
    if (typeof markTileDeveloped === 'function') markTileDeveloped(action.x, action.y);
    spawnParticles(action.x * TILE + TILE / 2, action.y * TILE, 'dirt', 5);
  }

  robot._targetX = undefined;
  robot._targetY = undefined;
  robot._targetStopRange = 0;
  robot._blockedSteps = 0;
  robot._pathIndex = 0;
  _releaseRobotTask(robot);
}
