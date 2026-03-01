// ╔══════════════════════════════════════════════════════════════════════════╗
// ║                      ROBO RANCH — settings.js                          ║
// ║                                                                          ║
// ║  Welcome, Rancher! This file is YOUR playground. Everything in here     ║
// ║  changes how the game feels, works, and what your robots can do.        ║
// ║  No programming experience needed to tweak the basics, but if you DO   ║
// ║  want to code robot brains from scratch — buckle up!                   ║
// ║                                                                          ║
// ║  QUICK START EDITS:                                                      ║
// ║    Starting money      → player.startMoney                              ║
// ║    Day speed           → time.dayLengthMs (milliseconds per day)        ║
// ║    Add a crop          → crops: { myCrop: { ... } }                     ║
// ║    World feel          → world.seed / flowerDensity / treeClusterCount  ║
// ║    Robot speed         → robots.basic.speed                             ║
// ║    Robot AI            → robotBehaviors.myBehavior = function(...)      ║
// ╚══════════════════════════════════════════════════════════════════════════╝

const SETTINGS = {

  // ═══════════════════════════════════════════════════════════════════════
  // WORLD GENERATION
  // Controls how the map looks. Change 'seed' for a brand new world!
  // ═══════════════════════════════════════════════════════════════════════
  world: {
    width:  80,          // World width in tiles  (60–120 recommended)
    height: 60,          // World height in tiles (45–90 recommended)
    seed:   42069,       // Integer seed → deterministic world generation
    riverCount:        2,     // Rivers that snake across the map
    pondCount:         4,     // Scattered ponds and small lakes
    treeClusterCount: 10,     // Dense forest clusters
    flowerDensity:   0.06,    // 0.0 = bare, 0.15 = flower fields
    stoneDensity:    0.015,   // Boulder frequency
    clearingW:        26,     // Width of your starting cleared area (tiles)
    clearingH:        20,     // Height of your starting cleared area
  },

  // ═══════════════════════════════════════════════════════════════════════
  // TIME & SEASONS
  // ═══════════════════════════════════════════════════════════════════════
  time: {
    dayLengthMs:   180000,    // 180000ms = 3 real minutes per game day
    startHour:     6,         // Clock starts at 6am
    seasons:       ['Spring 🌸', 'Summer ☀️', 'Autumn 🍂', 'Winter ❄️'],
    daysPerSeason: 28,        // Season length in days
  },

  // ═══════════════════════════════════════════════════════════════════════
  // PLAYER
  // ═══════════════════════════════════════════════════════════════════════
  player: {
    startMoney: 500,     // Starting coins
    moveSpeed:  5.5,     // Tiles per second  (4–8 feels good)
    startX:     40,      // Starting X tile
    startY:     30,      // Starting Y tile
  },

  // ═══════════════════════════════════════════════════════════════════════
  // CROPS
  // Add your own entry to introduce a new crop into the game!
  // The shop, toolbar, and robot inventory will all pick it up automatically.
  //
  // growDays   – game days from seed to harvest
  // stages     – number of visual growth stages (3–6 looks best)
  // waterNeeds – how many times per day it wants water (1 = easy, 2 = needy)
  // sellPrice  – coins per harvested unit
  // seedCost   – cost for a pack of 5 seeds at the shop
  // color      – hex color of the ripe produce
  // ═══════════════════════════════════════════════════════════════════════
  crops: {
    wheat: {
      name: 'Wheat',  symbol: '🌾',
      growDays: 3,   stages: 4,  waterNeeds: 1,
      sellPrice: 12, seedCost: 4,   color: '#e8c84a',
    },
    carrot: {
      name: 'Carrot', symbol: '🥕',
      growDays: 4,   stages: 4,  waterNeeds: 1,
      sellPrice: 22, seedCost: 8,   color: '#ff7b1a',
    },
    tomato: {
      name: 'Tomato', symbol: '🍅',
      growDays: 6,   stages: 5,  waterNeeds: 2,
      sellPrice: 38, seedCost: 14,  color: '#e84040',
    },
    blueberry: {
      name: 'Blueberry', symbol: '🫐',
      growDays: 8,   stages: 4,  waterNeeds: 1,
      sellPrice: 55, seedCost: 22,  color: '#6a5acd',
    },
    pumpkin: {
      name: 'Pumpkin', symbol: '🎃',
      growDays: 14,  stages: 5,  waterNeeds: 2,
      sellPrice: 90, seedCost: 35,  color: '#ff8c00',
    },
    // ─── Uncomment to add a sunflower! ────────────────────────────────
    // sunflower: {
    //   name: 'Sunflower', symbol: '🌻',
    //   growDays: 10, stages: 5, waterNeeds: 1,
    //   sellPrice: 70, seedCost: 28, color: '#ffd700',
    // },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ROBOTS
  // Define robot types — their stats and which tasks they can do.
  // Add your own robot type and pair it with a behavior below!
  // ═══════════════════════════════════════════════════════════════════════
  robots: {
    // ─── Three built-in types ────────────────────────────────────────
    rust: {
      name: 'Rustbot',   cost: 100,  speed: 1.8,
      hexColor: '#b87a3a',
      batteryMax: 60, batteryDrain: 0.04, chargeRate: 3,
      defaultRadius: 5, invCapacity: 12, invSlots: 2,
      canScavenge: true,   // eats nearby ready crops for fuel — never fully dies
      description: 'Cheap and immortal. Scavenges crops for fuel. Slower and eats your harvest!',
    },
    basic: {
      name: 'Farm Bot',  cost: 250,  speed: 2.5,
      hexColor: '#a8b8c8',
      batteryMax: 100, batteryDrain: 0.05, chargeRate: 7,
      defaultRadius: 8, invCapacity: 32, invSlots: 3,
      canScavenge: false,
      description: 'Your trusty all-rounder. Does everything reliably.',
    },
    pro: {
      name: 'ProBot',    cost: 600,  speed: 4.0,
      hexColor: '#5090d0',
      batteryMax: 150, batteryDrain: 0.035, chargeRate: 12,
      defaultRadius: 14, invCapacity: 64, invSlots: 5,
      canScavenge: false,
      description: 'Large area, fast, massive storage. The premium choice.',
    },
    // ─── Custom robot example — uncomment! ────────────────────────────
    // titan: {
    //   name: 'Titan Bot', cost: 3000, speed: 1.5, hexColor: '#aa00ff',
    //   batteryMax: 200, batteryDrain: 0.03, chargeRate: 5,
    //   defaultRadius: 6, invCapacity: 128, invSlots: 4,
    //   canScavenge: false,
    //   description: 'Slow but unstoppable. Enormous storage capacity.',
    // },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ROBOT BEHAVIORS  ⚙️  ←  THE CODING SANDBOX
  // ═══════════════════════════════════════════════════════════════════════
  //
  // Each behavior is a function(robot, api) that runs on a timer.
  // Select it from the robot's dropdown in the 🤖 Bots panel.
  //
  // ────────────────────────────────────────────────────────────────────
  // API  — everything your robot can do
  // ────────────────────────────────────────────────────────────────────
  //   api.pos(robot)                     → { x, y } tile position
  //   api.moveTo(robot, x, y)            Walk toward tile (BFS)
  //   api.till(robot, x, y)              Hoe grass/flower → tilled
  //   api.plant(robot, x, y, 'crop')     Plant a seed (uses inventory)
  //   api.water(robot, x, y)             Water a planted crop
  //   api.harvest(robot, x, y)           Collect a ready crop
  //   api.idle(robot)                    Stop and wait
  //   api.mem(robot, key, val?)          Get/set persistent memory
  //   api.inventory(robot)               → { seeds:{}, crops:{} }
  //   api.nearby(robot, radius)          → array of nearby tile objects
  //   api.distanceTo(robot, x, y)        → Manhattan distance
  //
  //   api.findCrop(robot, filter)        → nearest crop tile | null
  //     filter: { ready?, needsWater?, type?, maxDist?, cx?, cy? }
  //   api.findTile(robot, filter)        → nearest tile | null
  //     filter: { tileType?, empty?, maxDist?, cx?, cy? }
  //
  // ────────────────────────────────────────────────────────────────────
  // ROBOT STATE
  // ────────────────────────────────────────────────────────────────────
  //   robot.tileX, robot.tileY   Current tile position
  //   robot.memory = {}          Scratchpad — persists between calls
  //   robot.assignedCrop         Crop type set in the UI panel
  //   robot.workArea             { x, y, radius } | null
  //   robot.homeTileX/Y          Charging/drop-off tile
  //   robot.invCapacity          Total item capacity
  //
  // ═══════════════════════════════════════════════════════════════════════

  robotBehaviors: {

    // ── idle ──────────────────────────────────────────────────────────
    // Does nothing. Useful as a placeholder.
    idle: function(robot, api) {},

    // ── autoFarm ──────────────────────────────────────────────────────
    // Does EVERYTHING in priority order:
    //   harvest ready crops → water thirsty ones → plant on tilled soil → till grass
    autoFarm: function(robot, api) {
      const held = Object.values(robot.inventory.crops).reduce((s, v) => s + v, 0);
      if (held >= robot.invCapacity) { api.moveTo(robot, robot.homeTileX, robot.homeTileY); return; }
      const max = robot.workArea?.radius || 12, cx = robot.workArea?.x, cy = robot.workArea?.y;
      const ready = api.findCrop(robot, { ready: true, maxDist: max, cx, cy });
      if (ready) { api.moveTo(robot, ready.x, ready.y); api.harvest(robot, ready.x, ready.y); return; }
      const thirsty = api.findCrop(robot, { needsWater: true, maxDist: max, cx, cy });
      if (thirsty) { api.moveTo(robot, thirsty.x, thirsty.y); api.water(robot, thirsty.x, thirsty.y); return; }
      const crop = robot.assignedCrop || 'wheat';
      const empty = api.findTile(robot, { tileType: 'tilled', empty: true, maxDist: max, cx, cy });
      if (empty) { api.moveTo(robot, empty.x, empty.y); api.plant(robot, empty.x, empty.y, crop); return; }
      const grass = api.findTile(robot, { tileType: 'grass', maxDist: max, cx, cy });
      if (grass) { api.moveTo(robot, grass.x, grass.y); api.till(robot, grass.x, grass.y); return; }
      api.idle(robot);
    },

    // ── harvester ─────────────────────────────────────────────────────
    // Only harvests. Laser-focused. Maximum crop collection.
    harvester: function(robot, api) {
      const held = Object.values(robot.inventory.crops).reduce((s, v) => s + v, 0);
      if (held >= robot.invCapacity) { api.moveTo(robot, robot.homeTileX, robot.homeTileY); return; }
      const t = api.findCrop(robot, { ready: true, maxDist: robot.workArea?.radius || 12, cx: robot.workArea?.x, cy: robot.workArea?.y });
      if (t) { api.moveTo(robot, t.x, t.y); api.harvest(robot, t.x, t.y); } else api.idle(robot);
    },

    // ── planter ───────────────────────────────────────────────────────
    // Only plants and waters. Teams well with a 'harvester' bot!
    planter: function(robot, api) {
      const max = robot.workArea?.radius || 12, cx = robot.workArea?.x, cy = robot.workArea?.y;
      const thirsty = api.findCrop(robot, { needsWater: true, maxDist: max, cx, cy });
      if (thirsty) { api.moveTo(robot, thirsty.x, thirsty.y); api.water(robot, thirsty.x, thirsty.y); return; }
      const crop = robot.assignedCrop || 'wheat';
      const empty = api.findTile(robot, { tileType: 'tilled', empty: true, maxDist: max, cx, cy });
      if (empty) { api.moveTo(robot, empty.x, empty.y); api.plant(robot, empty.x, empty.y, crop); return; }
      api.idle(robot);
    },

    // ── areaFarm ──────────────────────────────────────────────────────
    // Like autoFarm but the bot STAYS within a home territory
    // (8-tile radius from where it was first deployed).
    areaFarm: function(robot, api) {
      if (!api.mem(robot, 'homeX')) { api.mem(robot, 'homeX', robot.tileX); api.mem(robot, 'homeY', robot.tileY); }
      const cx = api.mem(robot, 'homeX'), cy = api.mem(robot, 'homeY'), max = 8;
      const held = Object.values(robot.inventory.crops).reduce((s, v) => s + v, 0);
      if (held >= robot.invCapacity) { api.moveTo(robot, robot.homeTileX, robot.homeTileY); return; }
      const ready = api.findCrop(robot, { ready: true, maxDist: max, cx, cy });
      if (ready) { api.moveTo(robot, ready.x, ready.y); api.harvest(robot, ready.x, ready.y); return; }
      const thirsty = api.findCrop(robot, { needsWater: true, maxDist: max, cx, cy });
      if (thirsty) { api.moveTo(robot, thirsty.x, thirsty.y); api.water(robot, thirsty.x, thirsty.y); return; }
      const crop = robot.assignedCrop || 'wheat';
      const empty = api.findTile(robot, { tileType: 'tilled', empty: true, maxDist: max, cx, cy });
      if (empty) { api.moveTo(robot, empty.x, empty.y); api.plant(robot, empty.x, empty.y, crop); return; }
      api.idle(robot);
    },

    // ─── Your custom behavior ─────────────────────────────────────────
    // myBehavior: function(robot, api) {
    //   const thirsty = api.findCrop(robot, { needsWater: true, maxDist: 10 });
    //   if (thirsty) {
    //     api.moveTo(robot, thirsty.x, thirsty.y);
    //     api.water(robot, thirsty.x, thirsty.y);
    //   } else {
    //     api.idle(robot);
    //   }
    // },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // UI SETTINGS
  // ═══════════════════════════════════════════════════════════════════════
  ui: {
    tileSize:        32,    // Pixels per tile  (24 = big world, 40 = detailed)
    showGrid:        false, // Tile grid overlay (toggle with G key)
    showRobotPaths:  true,  // Dashed target line on selected robots
    tooltips:        true,  // Hover info popups
    particleEffects: true,  // Sparkles on harvest, puffs on plant
  },

  // ═══════════════════════════════════════════════════════════════════════
  // KEYBINDINGS
  // ═══════════════════════════════════════════════════════════════════════
  keybindings: {
    moveUp:     'w',
    moveDown:   's',
    moveLeft:   'a',
    moveRight:  'd',
    interact:   'e',   // Use current tool on the tile you're standing on
    shop:       'b',   // Open shop panel
    inventory:  'i',   // Open inventory panel
    robots:     'r',   // Open robots panel
    toggleGrid: 'g',   // Toggle tile grid
    pause:      'p',   // Pause game time
    help:       'h',   // Show help overlay
  },
};

(function () {
  const s = SETTINGS;
  s.world = s.world || {};
  s.player = s.player || {};
  s.time = s.time || {};
  s.crops = s.crops || {};
  s.robots = s.robots || {};
  s.ui = s.ui || {};
  s.economy = s.economy || {};

  if (s.world.tileSize == null) s.world.tileSize = s.ui.tileSize ?? 32;
  if (s.world.treeFrequency == null) s.world.treeFrequency = Math.max(0, Math.min(0.25, (s.world.treeClusterCount ?? 10) / 100));
  if (s.world.rockFrequency == null) s.world.rockFrequency = s.world.stoneDensity ?? 0.015;
  if (s.world.flowerFrequency == null) s.world.flowerFrequency = s.world.flowerDensity ?? 0.06;
  if (s.world.farmZoneW == null) s.world.farmZoneW = s.world.clearingW ?? 24;
  if (s.world.farmZoneH == null) s.world.farmZoneH = s.world.clearingH ?? 18;
  if (s.world.farmZoneX == null) s.world.farmZoneX = Math.floor((s.player.startX ?? 40) - s.world.farmZoneW / 2);
  if (s.world.farmZoneY == null) s.world.farmZoneY = Math.floor((s.player.startY ?? 30) - s.world.farmZoneH / 2);

  if (s.player.startCoins == null) s.player.startCoins = s.player.startMoney ?? 500;
  if (s.player.speed == null) s.player.speed = s.player.moveSpeed ?? 5.5;
  if (s.player.startSeeds == null) s.player.startSeeds = { wheat: 10, carrot: 5, tomato: 0, blueberry: 0, pumpkin: 0 };
  if (s.player.startRobots == null) s.player.startRobots = 0;

  if (s.time.ticksPerDay == null) s.time.ticksPerDay = Math.max(1200, Math.round((s.time.dayLengthMs ?? 180000) / (1000 / 60)));
  if (s.time.seasonLength == null) s.time.seasonLength = s.time.daysPerSeason ?? 28;
  if (!Array.isArray(s.time.seasons) || s.time.seasons.length === 0) s.time.seasons = ['Spring', 'Summer', 'Autumn', 'Winter'];
  s.time.seasons = s.time.seasons.map(name => {
    const m = String(name).match(/[A-Za-z]+/);
    return m ? m[0] : String(name);
  });
  if (s.time.winterEnabled == null) s.time.winterEnabled = true;
  if (!s.time.rainChance) s.time.rainChance = { Spring: 0.22, Summer: 0.12, Autumn: 0.2, Winter: 0.08 };

  if (!s.display) s.display = {};
  if (s.display.zoomLevel == null) s.display.zoomLevel = 1;
  if (s.display.cameraSmooth == null) s.display.cameraSmooth = 0.18;
  if (s.display.showRobotPath == null) s.display.showRobotPath = s.ui.showRobotPaths ?? true;
  if (s.display.showNotifications == null) s.display.showNotifications = true;
  if (s.display.notificationDuration == null) s.display.notificationDuration = 2600;
  if (!s.display.particleCount) s.display.particleCount = s.ui.particleEffects === false ? 'low' : 'medium';

  const robotBase = s.robots.basic || {};
  if (s.robots.speed == null) s.robots.speed = robotBase.speed ?? 2.5;
  if (s.robots.defaultBehavior == null) s.robots.defaultBehavior = 'autoFarm';
  if (s.robots.workDelay == null) s.robots.workDelay = 22;
  if (s.robots.batteryMax == null) s.robots.batteryMax = 100;
  if (s.robots.batteryDrain == null) s.robots.batteryDrain = 0.05;
  if (s.robots.chargeRate == null) s.robots.chargeRate = 7;
  if (s.robots.maxRobots == null) s.robots.maxRobots = 30;

  if (!s.economy.seedPrices) s.economy.seedPrices = {};
  if (!s.economy.cropPrices) s.economy.cropPrices = {};
  for (const [type, cfg] of Object.entries(s.crops)) {
    if (cfg.emoji == null) cfg.emoji = cfg.symbol ?? '🌱';
    if (cfg.waterNeeded == null) cfg.waterNeeded = cfg.waterNeeds ?? 1;
    if (cfg.stages == null) cfg.stages = 4;
    if (cfg.growTime == null) cfg.growTime = (cfg.growDays ?? 4) * s.time.ticksPerDay;
    if (s.economy.seedPrices[type] == null) s.economy.seedPrices[type] = cfg.seedCost ?? 5;
    if (s.economy.cropPrices[type] == null) s.economy.cropPrices[type] = cfg.sellPrice ?? 10;
  }
  if (s.economy.robotCost == null) s.economy.robotCost = robotBase.cost ?? 250;
  if (s.economy.priceFluctuation == null) s.economy.priceFluctuation = true;
  if (s.economy.fluctuationAmount == null) s.economy.fluctuationAmount = 0.18;
  if (s.economy.bulkBonus == null) s.economy.bulkBonus = 1.08;

  if (!s.customBehaviors) s.customBehaviors = s.robotBehaviors || {};
  window.GAME_SETTINGS = s;
})();
