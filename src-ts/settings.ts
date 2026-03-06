/* @generated from src-ts/settings.ts — run npm run build:ts */
// @ts-nocheck
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
    width: 112,          // World width in tiles  (80–180 recommended)
    height: 84,          // World height in tiles (60–140 recommended)
    seed: 42069,       // Integer seed → deterministic world generation
    defaultArchetype: 'balanced',
    riverCount: 2,     // Rivers that snake across the map
    pondCount: 4,     // Scattered ponds and small lakes
    treeClusterCount: 10,     // Dense forest clusters
    flowerDensity: 0.06,    // 0.0 = bare, 0.15 = flower fields
    stoneDensity: 0.015,   // Boulder frequency
    clearingW: 30,     // Width of your starting cleared area (tiles)
    clearingH: 22,     // Height of your starting cleared area
    archetypes: {
      balanced: { label: 'Balanced' },
      flatlands: { label: 'Flatlands', treeMul: 0.55, rockMul: 0.6, riverMul: 0.8, pondMul: 0.7, flowerMul: 1.15 },
      forest_farm: { label: 'Forest Farm', treeMul: 1.55, rockMul: 0.95, riverMul: 1, pondMul: 0.9, flowerMul: 0.95 },
      wetlands: { label: 'Wetlands', treeMul: 0.85, rockMul: 0.7, riverMul: 1.4, pondMul: 1.7, flowerMul: 1.1 },
      rocky_basin: { label: 'Rocky Basin', treeMul: 0.75, rockMul: 1.75, riverMul: 0.85, pondMul: 0.75, flowerMul: 0.7 },
    },
    advancedDefaults: {
      treeMultiplier: 1,
      rockMultiplier: 1,
      pondSizeMultiplier: 1,
      riverWidthBias: 0,
      waterSpread: 1,
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // TIME & SEASONS
  // ═══════════════════════════════════════════════════════════════════════
  time: {
    dayLengthMs: 180000,    // 180000ms = 3 real minutes per game day
    startHour: 6,         // Clock starts at 6am
    seasons: ['Spring 🌸', 'Summer ☀️', 'Autumn 🍂', 'Winter ❄️'],
    daysPerSeason: 28,        // Season length in days
    // Crop growth pacing:
    // cropGrowthMultiplier > 1 makes all crops mature faster than listed growDays.
    // dryGrowthRate keeps some progress even when you miss watering (0..1).
    // growthTickInterval controls how often growth updates (in game ticks).
    // cropGrowthTileBudget limits how many world tiles are processed per frame for growth.
    cropGrowthMultiplier: 1.35,
    dryGrowthRate: 0.45,
    growthTickInterval: 20,
    cropGrowthTileBudget: 1200,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // PLAYER
  // ═══════════════════════════════════════════════════════════════════════
  player: {
    startMoney: 320,     // Starting coins
    moveSpeed: 5.5,     // Tiles per second  (4–8 feels good)
    startX: 56,      // Starting X tile
    startY: 42,      // Starting Y tile
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
      name: 'Wheat', symbol: '🌾',
      growDays: 3, stages: 4, waterNeeds: 1,
      sellPrice: 12, seedCost: 4, color: '#e8c84a',
    },
    carrot: {
      name: 'Carrot', symbol: '🥕',
      growDays: 4, stages: 4, waterNeeds: 1,
      sellPrice: 22, seedCost: 8, color: '#ff7b1a',
    },
    tomato: {
      name: 'Tomato', symbol: '🍅',
      growDays: 6, stages: 5, waterNeeds: 2,
      sellPrice: 38, seedCost: 14, color: '#e84040',
    },
    blueberry: {
      name: 'Blueberry', symbol: '🫐',
      growDays: 8, stages: 4, waterNeeds: 1,
      sellPrice: 55, seedCost: 22, color: '#6a5acd',
    },
    pumpkin: {
      name: 'Pumpkin', symbol: '🎃',
      growDays: 14, stages: 5, waterNeeds: 2,
      sellPrice: 90, seedCost: 35, color: '#ff8c00',
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
      name: 'Rustbot', cost: 320, speed: 1.8,
      hexColor: '#b87a3a',
      batteryMax: 60, batteryDrain: 0.04, chargeRate: 3,
      defaultRadius: 5, invCapacity: 12, invSlots: 2,
      canScavenge: true,   // eats nearby ready crops for fuel — never fully dies
      description: 'Cheap and immortal. Scavenges crops for fuel. Slower and eats your harvest!',
    },
    basic: {
      name: 'Farm Bot', cost: 900, speed: 2.5,
      hexColor: '#a8b8c8',
      batteryMax: 100, batteryDrain: 0.05, chargeRate: 7,
      defaultRadius: 8, invCapacity: 32, invSlots: 3,
      canScavenge: false,
      description: 'Your trusty all-rounder. Does everything reliably.',
    },
    pro: {
      name: 'ProBot', cost: 2400, speed: 4.0,
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
  // PROGRESSION GOALS
  // Soft guidance for the early game: manual farming first, automation second.
  // Goals unlock in order and rewards are auto-claimed.
  // ═══════════════════════════════════════════════════════════════════════
  progression: {
    goals: [
      {
        id: 'seed_starter',
        title: 'Field Prep',
        desc: 'Plant 24 crops by hand.',
        metric: 'tilesPlanted',
        target: 24,
        reward: { coins: 120 },
      },
      {
        id: 'water_cycle',
        title: 'Daily Care',
        desc: 'Water crops 30 times.',
        metric: 'waterActions',
        target: 30,
        reward: { seeds: { wheat: 12, carrot: 8 } },
      },
      {
        id: 'first_market_run',
        title: 'Market Run',
        desc: 'Sell 40 crops.',
        metric: 'cropsSold',
        target: 40,
        reward: { coins: 220 },
      },
      {
        id: 'automation_budget',
        title: 'Automation Fund',
        desc: 'Earn 900 coins from crop sales.',
        metric: 'coinsFromSales',
        target: 900,
        reward: { robotVouchers: { basic: 1 } },
      },
      {
        id: 'first_purchase',
        title: 'Buy Your First Bot',
        desc: 'Purchase 1 robot from the shop.',
        metric: 'robotsPurchased',
        target: 1,
        reward: { coins: 180, seeds: { wheat: 10 } },
      },
      {
        id: 'fleet_online',
        title: 'Fleet Online',
        desc: 'Deploy 2 robots into the field.',
        metric: 'robotsPlaced',
        target: 2,
        reward: { coins: 260 },
      },
      {
        id: 'optimize_flow',
        title: 'Optimize Flow',
        desc: 'Have robots harvest 80 crops.',
        metric: 'robotHarvests',
        target: 80,
        reward: { coins: 450 },
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ROBOT BEHAVIORS  ⚙️  ←  THE CODING SANDBOX
  // ═══════════════════════════════════════════════════════════════════════
  //
  // Each behavior is a function that runs on a timer for your robot.
  // Select it from the robot's dropdown in the 🤖 Bots panel.
  //
  // ────────────────────────────────────────────────────────────────────
  // ACTIONS API  — everything your robot can do
  // ────────────────────────────────────────────────────────────────────
  //   actions.moveTo(x, y)               Move one BFS step toward tile
  //   actions.isAdjacent(x, y)           True if within 1.5 tiles
  //   actions.till(x, y)                 Hoe GRASS into SOIL_DRY
  //   actions.plant(x, y, 'cropKey')     Plant a crop  (uses inventory seeds)
  //   actions.water(x, y)                Water a planted tile
  //   actions.harvest(x, y)              Collect a ready crop
  //
  //   actions.findNearest(type)          Scan ~25 tiles for nearest match:
  //                                        'grass'   → tillable grass tile
  //                                        'tilled'  → empty prepared soil
  //                                        'thirsty' → unwatered planted crop
  //                                        'ready'   → harvestable crop
  //
  //   actions.findNearestInArea(type, { x, y, w, h })
  //                                      Same but bounded to a rectangle
  //
  // ────────────────────────────────────────────────────────────────────
  // ROBOT STATE
  // ────────────────────────────────────────────────────────────────────
  //   robot.x, robot.y        Current tile position (numbers)
  //   robot.memory = {}       Your scratchpad! Persists between calls.
  //                           Store your state machine, targets, counters.
  //   robot.assignedCrop      Crop set via the UI dropdown ('wheat', etc.)
  //
  // ────────────────────────────────────────────────────────────────────
  // WORLD QUERY
  // ────────────────────────────────────────────────────────────────────
  //   world[y][x].type        'GRASS' | 'SOIL_DRY' | 'SOIL_WET' |
  //                           'WATER' | 'TREE' | 'FLOWER' | 'STONE'
  //   world[y][x].crop        Planted crop key (string) or null
  //   world[y][x].stage       Growth stage (0 = seeded, max-1 = ready)
  //   world[y][x].watered     true if watered this day
  //
  // ═══════════════════════════════════════════════════════════════════════

  robotBehaviors: {

    // ── HOW TO ADD A CUSTOM BEHAVIOR ─────────────────────────────────
    //
    // 1. Add a key here (e.g. 'myFarmer').
    // 2. Select it from the robot's Behavior dropdown in the 🤖 Bots panel.
    //
    // Signature: function(robot, api) { ... }
    //
    // ── MOVEMENT ─────────────────────────────────────────────────────
    //   api.moveTo(robot, x, y)              Walk toward tile (x, y)
    //   api.idle(robot)                      Stop and release claims
    //
    // ── ACTIONS  (only work when adjacent — 1 tile away) ─────────────
    //   api.till(robot, x, y)                Hoe grass/flower → tilled
    //   api.plant(robot, x, y, 'wheat')      Plant seed (pulls from inventory)
    //   api.water(robot, x, y)               Water a crop tile
    //   api.harvest(robot, x, y)             Harvest a ripe crop
    //
    // ── SEARCH ───────────────────────────────────────────────────────
    //   api.findCrop(robot, filter)          → { x, y, crop } | null
    //     filter: { ready?, needsWater?, type?, maxDist?, cx?, cy? }
    //   api.findTile(robot, filter)          → { x, y, tile } | null
    //     filter: { tileType?, empty?, maxDist?, cx?, cy? }
    //
    // ── INFO ─────────────────────────────────────────────────────────
    //   api.pos(robot)                       → { x, y }
    //   api.distanceTo(robot, x, y)          → manhattan distance
    //   api.nearby(robot, radius)            → array of tile objects
    //   api.inventory(robot)                 → { seeds:{}, crops:{} }
    //   api.mem(robot, 'key', value?)        → get/set persistent memory
    //
    // ── TILE TYPES ────────────────────────────────────────────────────
    //   'grass'   'flower'   'tilled'   'water'   'tree'   'rock'
    //
    // ── EXAMPLE ──────────────────────────────────────────────────────
    // myWaterer: function(robot, api) {
    //   const t = api.findCrop(robot, { needsWater: true, maxDist: 10 });
    //   if (t) { api.moveTo(robot, t.x, t.y); api.water(robot, t.x, t.y); }
    //   else api.idle(robot);
    // },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // UI SETTINGS
  // ═══════════════════════════════════════════════════════════════════════
  ui: {
    tileSize: 32,    // Pixels per tile  (24 = big world, 40 = detailed)
    showGrid: false, // Tile grid overlay (toggle with G key)
    showRobotPaths: true,  // Dashed target line on selected robots
    tooltips: true,  // Hover info popups
    particleEffects: true,  // Sparkles on harvest, puffs on plant
  },

  // ═══════════════════════════════════════════════════════════════════════
  // DISPLAY / PERFORMANCE
  // ═══════════════════════════════════════════════════════════════════════
  display: {
    renderCacheEnabled: true,
    renderCacheChunkTiles: 12,
    asyncChunkBuild: true,
    chunkBuildBudgetFrame: 1,
    chunkBuildBudgetIdle: 6,
    cropTextureCache: true,
    cropTextureAsync: true,
    cropTextureVariants: 3,
    cropTextureBuildsPerFrame: 1,
    cropTextureBuildsIdle: 6,
    uiUpdateIntervalTicks: 4,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // KEYBINDINGS
  // ═══════════════════════════════════════════════════════════════════════
  keybindings: {
    moveUp: 'w',
    moveDown: 's',
    moveLeft: 'a',
    moveRight: 'd',
    interact: 'Space',   // Use current tool on the tile in front of you
    shop: 'e',   // Open shop panel
    inventory: 'i',   // Open inventory panel
    robots: 'r',   // Open robots panel
    toggleGrid: 'g',   // Toggle tile grid
    pause: 'Escape',   // Open menu / pause
    help: 'f',   // Show help overlay
  },

  // ═══════════════════════════════════════════════════════════════════════
  // VEHICLE
  // ═══════════════════════════════════════════════════════════════════════
  vehicle: {
    // Arcade driving preset: smooth throttle and steer + drift-charge turbo
    maxSpeed: 4.8,
    acceleration: 0.062,
    brakeForce: 0.12,
    friction: 0.985,
    turnRate: 0.036,
    driftFactor: 0.935,
    handbrakeGrip: 0.76,
    throttleResponse: 0.22,
    steerResponse: 0.3,
    lowSpeedTurnAssist: 0.36,
    driftTurnBoost: 1.38,
    turboMinCharge: 0.1,
    turboChargeRate: 0.021,
    turboDecay: 0.004,
    turboSpeedMul: 1.42,
    turboAccel: 0.05,
    turboDuration: 26,
    reverseMaxSpeed: 2.35,
    spawnOffsetX: 3,
    spawnOffsetY: 0,
  },
};

(function () {
  const s = SETTINGS;
  const WEATHER_TYPES = ['clear', 'rain', 'snow', 'thunder', 'hail'];
  const DEFAULT_WEATHER_CHANCES = {
    Spring: { clear: 0.5, rain: 0.28, snow: 0.04, thunder: 0.12, hail: 0.06 },
    Summer: { clear: 0.57, rain: 0.2, snow: 0.01, thunder: 0.17, hail: 0.05 },
    Autumn: { clear: 0.48, rain: 0.27, snow: 0.07, thunder: 0.1, hail: 0.08 },
    Winter: { clear: 0.43, rain: 0.08, snow: 0.36, thunder: 0.03, hail: 0.1 },
  };

  function _toFinite(n, fallback = 0) {
    const num = Number(n);
    return Number.isFinite(num) ? num : fallback;
  }

  function _normalizeWeatherWeights(rawWeights, fallbackWeights) {
    const normalized = {};
    let total = 0;
    for (const key of WEATHER_TYPES) {
      const v = _toFinite(rawWeights?.[key], _toFinite(fallbackWeights?.[key], 0));
      const clamped = Math.max(0, v);
      normalized[key] = clamped;
      total += clamped;
    }
    if (total <= 0) {
      for (const key of WEATHER_TYPES) normalized[key] = key === 'clear' ? 1 : 0;
      return normalized;
    }
    for (const key of WEATHER_TYPES) normalized[key] /= total;
    return normalized;
  }

  s.world = s.world || {};
  s.player = s.player || {};
  s.time = s.time || {};
  s.crops = s.crops || {};
  s.robots = s.robots || {};
  s.ui = s.ui || {};
  s.economy = s.economy || {};
  s.progression = s.progression || {};

  if (s.world.tileSize == null) s.world.tileSize = s.ui.tileSize ?? 32;
  if (s.world.width == null) s.world.width = 112;
  if (s.world.height == null) s.world.height = 84;
  s.world.width = Math.max(40, Math.floor(Number(s.world.width) || 112));
  s.world.height = Math.max(30, Math.floor(Number(s.world.height) || 84));
  if (s.player.startX == null) s.player.startX = Math.floor(s.world.width / 2);
  if (s.player.startY == null) s.player.startY = Math.floor(s.world.height / 2);
  s.player.startX = Math.max(0, Math.min(s.world.width - 1, Math.floor(Number(s.player.startX) || Math.floor(s.world.width / 2))));
  s.player.startY = Math.max(0, Math.min(s.world.height - 1, Math.floor(Number(s.player.startY) || Math.floor(s.world.height / 2))));
  if (!s.world.defaultArchetype) s.world.defaultArchetype = 'balanced';
  if (!s.world.archetypes || typeof s.world.archetypes !== 'object') s.world.archetypes = { balanced: { label: 'Balanced' } };
  if (!s.world.advancedDefaults || typeof s.world.advancedDefaults !== 'object') s.world.advancedDefaults = {};
  if (s.world.advancedDefaults.treeMultiplier == null) s.world.advancedDefaults.treeMultiplier = 1;
  if (s.world.advancedDefaults.rockMultiplier == null) s.world.advancedDefaults.rockMultiplier = 1;
  if (s.world.advancedDefaults.pondSizeMultiplier == null) s.world.advancedDefaults.pondSizeMultiplier = 1;
  if (s.world.advancedDefaults.riverWidthBias == null) s.world.advancedDefaults.riverWidthBias = 0;
  if (s.world.advancedDefaults.waterSpread == null) s.world.advancedDefaults.waterSpread = 1;
  if (s.world.treeFrequency == null) s.world.treeFrequency = Math.max(0, Math.min(0.25, (s.world.treeClusterCount ?? 10) / 100));
  if (s.world.rockFrequency == null) s.world.rockFrequency = s.world.stoneDensity ?? 0.015;
  if (s.world.flowerFrequency == null) s.world.flowerFrequency = s.world.flowerDensity ?? 0.06;
  if (s.world.farmZoneW == null) s.world.farmZoneW = s.world.clearingW ?? 24;
  if (s.world.farmZoneH == null) s.world.farmZoneH = s.world.clearingH ?? 18;
  if (s.world.farmZoneX == null) s.world.farmZoneX = Math.floor((s.player.startX ?? Math.floor(s.world.width / 2)) - s.world.farmZoneW / 2);
  if (s.world.farmZoneY == null) s.world.farmZoneY = Math.floor((s.player.startY ?? Math.floor(s.world.height / 2)) - s.world.farmZoneH / 2);

  if (s.player.startCoins == null) s.player.startCoins = s.player.startMoney ?? 320;
  if (s.player.speed == null) s.player.speed = s.player.moveSpeed ?? 5.5;
  if (s.player.startSeeds == null) s.player.startSeeds = { wheat: 10, carrot: 5, tomato: 0, blueberry: 0, pumpkin: 0 };
  if (s.player.startRobots == null) s.player.startRobots = 0;

  if (s.time.ticksPerDay == null) s.time.ticksPerDay = Math.max(1200, Math.round((s.time.dayLengthMs ?? 180000) / (1000 / 60)));
  if (s.time.seasonLength == null) s.time.seasonLength = s.time.daysPerSeason ?? 28;
  if (s.time.cropGrowthMultiplier == null) s.time.cropGrowthMultiplier = 1.35;
  if (s.time.dryGrowthRate == null) s.time.dryGrowthRate = 0.45;
  if (s.time.growthTickInterval == null) s.time.growthTickInterval = 20;
  if (s.time.cropGrowthTileBudget == null) s.time.cropGrowthTileBudget = 1200;
  s.time.cropGrowthMultiplier = Math.max(0.25, s.time.cropGrowthMultiplier);
  s.time.dryGrowthRate = Math.max(0, Math.min(1, s.time.dryGrowthRate));
  s.time.growthTickInterval = Math.max(5, Math.floor(s.time.growthTickInterval));
  s.time.cropGrowthTileBudget = Math.max(160, Math.floor(Number(s.time.cropGrowthTileBudget) || 1200));
  if (!Array.isArray(s.time.seasons) || s.time.seasons.length === 0) s.time.seasons = ['Spring', 'Summer', 'Autumn', 'Winter'];
  s.time.seasons = s.time.seasons.map(name => {
    const m = String(name).match(/[A-Za-z]+/);
    return m ? m[0] : String(name);
  });
  if (s.time.winterEnabled == null) s.time.winterEnabled = true;
  if (!s.time.rainChance || typeof s.time.rainChance !== 'object') {
    s.time.rainChance = { Spring: 0.22, Summer: 0.12, Autumn: 0.2, Winter: 0.08 };
  }
  if (!s.time.weatherChances || typeof s.time.weatherChances !== 'object') s.time.weatherChances = {};
  for (const seasonName of s.time.seasons) {
    const defaultWeights = DEFAULT_WEATHER_CHANCES[seasonName] || DEFAULT_WEATHER_CHANCES.Spring;
    const userWeights = (s.time.weatherChances[seasonName] && typeof s.time.weatherChances[seasonName] === 'object')
      ? s.time.weatherChances[seasonName]
      : null;

    let resolved = userWeights;
    if (!resolved) {
      const legacyRain = _toFinite(s.time.rainChance[seasonName], NaN);
      if (Number.isFinite(legacyRain)) {
        const normalizedRain = Math.max(0, Math.min(0.92, legacyRain));
        const snow = Math.max(0, Math.min(0.42, defaultWeights.snow));
        const available = Math.max(0.08, 1 - snow);
        const precip = Math.min(normalizedRain, available - 0.05);
        const clear = Math.max(0.05, available - precip);
        const shareTotal = defaultWeights.rain + defaultWeights.thunder + defaultWeights.hail || 1;
        resolved = {
          clear,
          snow,
          rain: precip * (defaultWeights.rain / shareTotal),
          thunder: precip * (defaultWeights.thunder / shareTotal),
          hail: precip * (defaultWeights.hail / shareTotal),
        };
      }
    }

    const normalized = _normalizeWeatherWeights(resolved, defaultWeights);
    s.time.weatherChances[seasonName] = normalized;
    s.time.rainChance[seasonName] = normalized.rain + normalized.thunder + normalized.hail;
  }

  if (!s.display) s.display = {};
  if (s.display.zoomLevel == null) s.display.zoomLevel = 1;
  if (s.display.cameraSmooth == null) s.display.cameraSmooth = 0.18;
  if (s.display.showRobotPath == null) s.display.showRobotPath = s.ui.showRobotPaths ?? true;
  if (s.display.showNotifications == null) s.display.showNotifications = true;
  if (s.display.notificationDuration == null) s.display.notificationDuration = 2600;
  if (!['calm', 'normal', 'lively'].includes(s.display.menuBgActivity)) s.display.menuBgActivity = 'normal';
  if (!s.display.particleCount) s.display.particleCount = s.ui.particleEffects === false ? 'low' : 'medium';
  if (s.display.renderCacheEnabled == null) s.display.renderCacheEnabled = true;
  if (s.display.renderCacheChunkTiles == null) s.display.renderCacheChunkTiles = 12;
  if (s.display.asyncChunkBuild == null) s.display.asyncChunkBuild = true;
  if (s.display.chunkBuildBudgetFrame == null) s.display.chunkBuildBudgetFrame = 1;
  if (s.display.chunkBuildBudgetIdle == null) s.display.chunkBuildBudgetIdle = 6;
  if (s.display.cropTextureCache == null) s.display.cropTextureCache = true;
  if (s.display.cropTextureAsync == null) s.display.cropTextureAsync = true;
  if (s.display.cropTextureVariants == null) s.display.cropTextureVariants = 3;
  if (s.display.cropTextureBuildsPerFrame == null) s.display.cropTextureBuildsPerFrame = 1;
  if (s.display.cropTextureBuildsIdle == null) s.display.cropTextureBuildsIdle = 6;
  if (s.display.uiUpdateIntervalTicks == null) s.display.uiUpdateIntervalTicks = 4;
  s.display.chunkBuildBudgetFrame = Math.max(1, Math.floor(Number(s.display.chunkBuildBudgetFrame) || 1));
  s.display.chunkBuildBudgetIdle = Math.max(1, Math.floor(Number(s.display.chunkBuildBudgetIdle) || 6));
  s.display.cropTextureVariants = Math.max(1, Math.min(8, Math.floor(Number(s.display.cropTextureVariants) || 3)));
  s.display.cropTextureBuildsPerFrame = Math.max(1, Math.floor(Number(s.display.cropTextureBuildsPerFrame) || 1));
  s.display.cropTextureBuildsIdle = Math.max(1, Math.floor(Number(s.display.cropTextureBuildsIdle) || 6));
  s.display.uiUpdateIntervalTicks = Math.max(1, Math.floor(Number(s.display.uiUpdateIntervalTicks) || 4));

  const robotBase = s.robots.basic || {};
  if (s.robots.speed == null) s.robots.speed = robotBase.speed ?? 2.5;
  if (s.robots.defaultBehavior == null) s.robots.defaultBehavior = 'full_cycle';
  if (s.robots.workDelay == null) s.robots.workDelay = 22;
  if (s.robots.batteryMax == null) s.robots.batteryMax = 100;
  if (s.robots.batteryDrain == null) s.robots.batteryDrain = 0.05;
  if (s.robots.chargeRate == null) s.robots.chargeRate = 7;
  if (s.robots.maxRobots == null) s.robots.maxRobots = 30;

  if (!s.economy.seedPrices) s.economy.seedPrices = {};
  if (!s.economy.cropPrices) s.economy.cropPrices = {};
  for (const [type, cfg] of Object.entries(s.crops)) {
    if (cfg.emoji == null) cfg.emoji = cfg.symbol ?? '🌱';
    if (cfg.yield == null) cfg.yield = 1;
    if (cfg.waterNeeded == null) cfg.waterNeeded = cfg.waterNeeds ?? 1;
    if (cfg.stages == null) cfg.stages = 4;
    if (cfg.growTime == null) cfg.growTime = (cfg.growDays ?? 4) * s.time.ticksPerDay;
    cfg.yield = Math.max(1, Math.floor(Number(cfg.yield) || 1));
    cfg.waterNeeded = Math.max(1, Math.floor(Number(cfg.waterNeeded) || 1));
    cfg.stages = Math.max(2, Math.floor(Number(cfg.stages) || 4));
    cfg.growTime = Math.max(1, Math.floor(Number(cfg.growTime) || ((cfg.growDays ?? 4) * s.time.ticksPerDay)));
    if (s.economy.seedPrices[type] == null) s.economy.seedPrices[type] = cfg.seedCost ?? 5;
    if (s.economy.cropPrices[type] == null) s.economy.cropPrices[type] = cfg.sellPrice ?? 10;
  }
  if (s.economy.robotCost == null) s.economy.robotCost = robotBase.cost ?? 250;
  if (s.economy.priceFluctuation == null) s.economy.priceFluctuation = true;
  if (s.economy.fluctuationAmount == null) s.economy.fluctuationAmount = 0.18;
  if (s.economy.bulkBonus == null) s.economy.bulkBonus = 1.08;

  if (!Array.isArray(s.progression.goals)) s.progression.goals = [];

  if (!s.vehicle) s.vehicle = {};
  if (s.vehicle.maxSpeed == null) s.vehicle.maxSpeed = 4.8;
  if (s.vehicle.acceleration == null) s.vehicle.acceleration = 0.062;
  if (s.vehicle.brakeForce == null) s.vehicle.brakeForce = 0.12;
  if (s.vehicle.friction == null) s.vehicle.friction = 0.985;
  if (s.vehicle.turnRate == null) s.vehicle.turnRate = 0.036;
  if (s.vehicle.driftFactor == null) s.vehicle.driftFactor = 0.935;
  if (s.vehicle.handbrakeGrip == null) s.vehicle.handbrakeGrip = 0.76;
  if (s.vehicle.throttleResponse == null) s.vehicle.throttleResponse = 0.22;
  if (s.vehicle.steerResponse == null) s.vehicle.steerResponse = 0.3;
  if (s.vehicle.lowSpeedTurnAssist == null) s.vehicle.lowSpeedTurnAssist = 0.36;
  if (s.vehicle.driftTurnBoost == null) s.vehicle.driftTurnBoost = 1.38;
  if (s.vehicle.turboMinCharge == null) s.vehicle.turboMinCharge = 0.1;
  if (s.vehicle.turboChargeRate == null) s.vehicle.turboChargeRate = 0.021;
  if (s.vehicle.turboDecay == null) s.vehicle.turboDecay = 0.004;
  if (s.vehicle.turboSpeedMul == null) s.vehicle.turboSpeedMul = 1.42;
  if (s.vehicle.turboAccel == null) s.vehicle.turboAccel = 0.05;
  if (s.vehicle.turboDuration == null) s.vehicle.turboDuration = 26;
  if (s.vehicle.reverseMaxSpeed == null) s.vehicle.reverseMaxSpeed = 2.35;
  if (s.vehicle.spawnOffsetX == null) s.vehicle.spawnOffsetX = 3;
  if (s.vehicle.spawnOffsetY == null) s.vehicle.spawnOffsetY = 0;

  if (!s.customBehaviors) s.customBehaviors = {};
  // Merge user-defined robotBehaviors (settings.js) into customBehaviors so they
  // are actually picked up by getAllBehaviors() at runtime.
  if (s.robotBehaviors && typeof s.robotBehaviors === 'object') {
    for (const [k, v] of Object.entries(s.robotBehaviors)) {
      if (typeof v === 'function' && !s.customBehaviors[k]) s.customBehaviors[k] = v;
    }
  }
  window.GAME_SETTINGS = s;
})();
