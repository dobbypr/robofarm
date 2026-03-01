/* ═══════════════════════════════════════════════════════════════════════════
 * WORLD FILE EXPORT / IMPORT  (Feature 6)
 * ═══════════════════════════════════════════════════════════════════════════ */
function buildSaveObject() {
  return {
    v: 2, coins, day, tick, season, isRaining, rainDay, inventory, robotsOwned,
    nextRobotId, priceMultipliers,
    economy: {
      rfs:   { price: COMPANIES.rfs.price,   priceHistory: COMPANIES.rfs.priceHistory,   sharesOwned: COMPANIES.rfs.sharesOwned   },
      bupop: { price: COMPANIES.bupop.price, priceHistory: COMPANIES.bupop.priceHistory, sharesOwned: COMPANIES.bupop.sharesOwned },
      productionHistory: productionStats.history,
    },
    robots: robots.map(r => ({
      id: r.id, name: r.name, type: r.type || 'basic',
      tileX: r.tileX, tileY: r.tileY,
      homeTileX: r.homeTileX, homeTileY: r.homeTileY,
      battery: r.battery, batteryMax: r.batteryMax,
      speed: r.speed, batteryDrain: r.batteryDrain, chargeRate: r.chargeRate,
      defaultRadius: r.defaultRadius, canScavenge: r.canScavenge,
      behavior: r.behavior, assignedCrop: r.assignedCrop,
      workArea: r.workArea, inventory: r.inventory,
      invCapacity: r.invCapacity, invSlots: r.invSlots,
      memory: r.memory, customCode: r.customCode,
    })),
    world: world.map(row => row.map(t => ({
      type: t.type, crop: t.crop ? { ...t.crop } : null, watered: t.watered
    })))
  };
}

function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportWorldFile() {
  const save = buildSaveObject();
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const cropCount = world.flat().filter(t => t.crop).length;
  const content =
`// ╔═════════════════════════════════════════════════════════════╗
// ║            ROBO FARM  —  World Save File                    ║
// ╚═════════════════════════════════════════════════════════════╝
//
//  Farm: Day ${day}  |  Season: ${SEASONS[season % SEASONS.length]}  |  Coins: ${coins}
//  Robots placed: ${robots.length}  |  Crops in ground: ${cropCount}
//  Exported: ${dateStr}
//
//  ─── HOW TO RESTORE ────────────────────────────────────────
//  1. Open index.html in your browser
//  2. Click [📁 Files] in the top bar
//  3. Click "Import World File" and select this file
//  4. Your farm is back — exactly where you left it!
//
//  ─── DO NOT EDIT THE DATA BELOW ────────────────────────────

window.__ROBOFARM_IMPORT__ = ${JSON.stringify(save, null, 2)};
`;
  downloadFile(content, `robofarm-day${day}.js`, 'text/javascript');
  notify('📁 World file downloaded!');
}

function handleWorldImportFile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const text = e.target.result;
      const match = text.match(/window\.__ROBOFARM_IMPORT__\s*=\s*(\{[\s\S]+\})\s*;?\s*$/m);
      if (!match) { notify('❌ Not a valid Robo Farm world file!'); return; }
      const save = JSON.parse(match[1]);
      if (!save || save.v !== 2) { notify('❌ Incompatible save version!'); return; }
      applyGameSave(save);
      notify('🌾 Farm restored! Welcome back, farmer.');
      closeModal('files');
    } catch(err) { notify('❌ Could not read file: ' + err.message); }
  };
  reader.readAsText(file);
  input.value = '';
}

function applyGameSave(save) {
  coins = save.coins; day = save.day; tick = save.tick; season = save.season;
  isRaining = save.isRaining; rainDay = save.rainDay; inventory = save.inventory;
  nextRobotId = save.nextRobotId; priceMultipliers = save.priceMultipliers;
  if (save.economy) {
    COMPANIES.rfs.price        = save.economy.rfs?.price        ?? COMPANIES.rfs.basePrice;
    COMPANIES.rfs.priceHistory = save.economy.rfs?.priceHistory ?? [];
    COMPANIES.rfs.sharesOwned  = save.economy.rfs?.sharesOwned  ?? 0;
    COMPANIES.bupop.price        = save.economy.bupop?.price        ?? COMPANIES.bupop.basePrice;
    COMPANIES.bupop.priceHistory = save.economy.bupop?.priceHistory ?? [];
    COMPANIES.bupop.sharesOwned  = save.economy.bupop?.sharesOwned  ?? 0;
    productionStats.history = save.economy.productionHistory ?? [];
  }
  for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) {
    if (save.world[y] && save.world[y][x]) {
      world[y][x].type = save.world[y][x].type;
      world[y][x].crop = save.world[y][x].crop;
      world[y][x].watered = save.world[y][x].watered || false;
    }
  }
  // robotsOwned: handle both old (number) and new (object) save format
  if (typeof save.robotsOwned === 'number') {
    robotsOwned = { rust: 0, basic: save.robotsOwned, pro: 0 };
  } else {
    robotsOwned = save.robotsOwned || { rust: 0, basic: 0, pro: 0 };
  }
  robots = [];
  for (const rd of save.robots) {
    const bot = new Robot(rd.tileX, rd.tileY, rd.type || 'basic');
    Object.assign(bot, rd);
    bot.px = bot.tileX * TILE; bot.py = bot.tileY * TILE;
    bot.path = []; bot._pendingAction = null; bot.actionTimer = 0; bot.workTimer = 0;
    if (bot.customCode) compileRobotCode(bot);
    robots.push(bot);
  }
  updateUI();
}

function openModal_files() { /* wrapper */ openModal('files'); }

/* ═══════════════════════════════════════════════════════════════════════════
 * ROBOT CODE FILE EXPORT / IMPORT  (Feature 12)
 * ═══════════════════════════════════════════════════════════════════════════ */
function exportRobotCode() {
  const bot = robots.find(r => r.id === configRobotId);
  if (!bot) { notify('❌ Select a robot first!'); return; }
  const code = document.getElementById('robot-code-editor').value.trim() ||
    '// No code yet — write your behavior here!\n// See the API Reference in the editor for all available commands.';
  const content =
`// ╔═════════════════════════════════════════════════════════════╗
// ║          ROBO FARM  —  Robot Behavior File                  ║
// ╚═════════════════════════════════════════════════════════════╝
//
//  Robot:    ${bot.name}
//  Behavior: ${bot.behavior}
//
//  ─── HOW TO USE ─────────────────────────────────────────────
//  Option A: Paste into the robot's code editor in-game
//  Option B: Add to customBehaviors in settings.js:
//
//    'My Behavior': function(robot, api) {
//      // paste the code below here
//    },
//
//  ─── API QUICK REFERENCE ────────────────────────────────────
//  api.pos(robot)               → {x, y}
//  api.findCrop(robot, filter)  → crop tile | null
//    filter: { ready?, needsWater?, type?, maxDist?, cx?, cy? }
//  api.findTile(robot, filter)  → tile | null
//    filter: { tileType?, empty?, maxDist? }
//  api.moveTo(robot, x, y)      → walk toward tile
//  api.water(robot, x, y)       → water crop
//  api.harvest(robot, x, y)     → harvest ready crop
//  api.plant(robot, x, y, type) → plant seed
//  api.till(robot, x, y)        → hoe grass/flower
//  api.idle(robot)              → do nothing
//  api.mem(robot, key, val?)    → get/set persistent memory
//  api.inventory(robot)         → {seeds:{...}, crops:{...}}
//  api.nearby(robot, radius)    → array of nearby tiles
//  robot.assignedCrop           → crop type from UI panel
//  robot.workArea               → {x, y, radius} | null
//
//  ⚠️  Runs in a secure sandbox — no browser APIs available.
//     Just robot, api, and your logic.
// ────────────────────────────────────────────────────────────

${code}
`;
  const safeName = bot.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  downloadFile(content, `${safeName}-behavior.js`, 'text/javascript');
  notify(`📤 ${bot.name} code exported!`);
}

function handleRobotImportFile(input) {
  const file = input.files[0];
  if (!file) return;
  const bot = robots.find(r => r.id === configRobotId);
  if (!bot) { notify('❌ Select a robot first!'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    const text = e.target.result;
    // Strip comment header if present, find actual code
    const lines = text.split('\n');
    const codeLines = [];
    let pastHeader = false;
    for (const line of lines) {
      if (!pastHeader && line.startsWith('//')) continue;
      if (!pastHeader && line.trim() === '') continue;
      pastHeader = true;
      codeLines.push(line);
    }
    const code = codeLines.join('\n').trim();
    document.getElementById('robot-code-editor').value = code;
    notify(`📥 Code imported into ${bot.name}! Hit Save to apply.`);
  };
  reader.readAsText(file);
  input.value = '';
}

/* ─── CODE EDITOR TEMPLATES ─── */
const CODE_TEMPLATES = {
  blank: `// Your robot's brain goes here.
// This code runs every ${window.GAME_SETTINGS?.robots?.workDelay || 40} game ticks.

api.idle(robot);`,

  waterer: `// Smart Waterer
// Finds the nearest thirsty crop and waters it.
const t = api.findCrop(robot, { needsWater: true, maxDist: 10 });
if (t) {
  api.moveTo(robot, t.x, t.y);
  api.water(robot, t.x, t.y);
} else {
  api.idle(robot);
}`,

  fullcycle: `// Full Cycle Farmer
// Priority: Harvest → Water → Plant
const max = robot.workArea?.radius || 12;
const cx = robot.workArea?.x, cy = robot.workArea?.y;

const ready = api.findCrop(robot, { ready: true, maxDist: max, cx, cy });
if (ready) { api.moveTo(robot, ready.x, ready.y); api.harvest(robot, ready.x, ready.y); return; }

const thirsty = api.findCrop(robot, { needsWater: true, maxDist: max, cx, cy });
if (thirsty) { api.moveTo(robot, thirsty.x, thirsty.y); api.water(robot, thirsty.x, thirsty.y); return; }

const crop = robot.assignedCrop || 'wheat';
const empty = api.findTile(robot, { tileType: 'tilled', empty: true, maxDist: max, cx, cy });
if (empty) { api.moveTo(robot, empty.x, empty.y); api.plant(robot, empty.x, empty.y, crop); return; }

api.idle(robot);`,

  zone: `// Zone Farmer — stays within assigned work area
// Set the area using the "Set Area" button in the panel!
if (!robot.workArea) { api.idle(robot); return; }

const { x: cx, y: cy, radius } = robot.workArea;

const ready = api.findCrop(robot, { ready: true, maxDist: radius, cx, cy });
if (ready) { api.moveTo(robot, ready.x, ready.y); api.harvest(robot, ready.x, ready.y); return; }

const thirsty = api.findCrop(robot, { needsWater: true, maxDist: radius, cx, cy });
if (thirsty) { api.moveTo(robot, thirsty.x, thirsty.y); api.water(robot, thirsty.x, thirsty.y); return; }

const crop = robot.assignedCrop || 'wheat';
const empty = api.findTile(robot, { tileType: 'tilled', empty: true, maxDist: radius, cx, cy });
if (empty) { api.moveTo(robot, empty.x, empty.y); api.plant(robot, empty.x, empty.y, crop); return; }

api.idle(robot);`,

  patrol: `// Scout — wanders and waters anything it finds
// Uses memory to spiral outward from home position
const mem = api.mem;
if (!mem(robot, 'angle')) { mem(robot, 'angle', 0); mem(robot, 'r', 2); }

const thirsty = api.findCrop(robot, { needsWater: true, maxDist: 14 });
if (thirsty) { api.moveTo(robot, thirsty.x, thirsty.y); api.water(robot, thirsty.x, thirsty.y); return; }

// Wander when nothing to water
let angle = mem(robot, 'angle');
const r = mem(robot, 'r');
const { x, y } = api.pos(robot);
const tx = Math.round(robot.homeTileX + Math.cos(angle) * r);
const ty = Math.round(robot.homeTileY + Math.sin(angle) * r);
api.moveTo(robot, tx, ty);
mem(robot, 'angle', angle + 0.7);
if (angle > Math.PI * 2) { mem(robot, 'angle', 0); mem(robot, 'r', (r % 8) + 1); }`,
};

function toggleTemplateMenu() {
  document.getElementById('template-menu').classList.toggle('visible');
}

function applyTemplate(name) {
  const code = CODE_TEMPLATES[name] || '';
  document.getElementById('robot-code-editor').value = code;
  document.getElementById('template-menu').classList.remove('visible');
}

function toggleApiRef() {
  const body = document.getElementById('api-ref-body');
  const arrow = document.getElementById('api-ref-arrow');
  body.classList.toggle('visible');
  arrow.textContent = body.classList.contains('visible') ? '▼' : '▶';
}

// Close template menu on outside click
document.addEventListener('click', e => {
  if (!e.target.closest('.code-toolbar')) document.getElementById('template-menu')?.classList.remove('visible');
});
