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
    basic: {
      name: 'Farm Bot',   cost: 250,  speed: 2.5,
      hexColor: '#c0c0c0',
      tasks: ['till', 'plant', 'water', 'harvest'],
      description: 'Your trusty starter. Slow but does everything.',
    },
    speedy: {
      name: 'Zippy Bot',  cost: 600,  speed: 5.0,
      hexColor: '#ffd700',
      tasks: ['plant', 'water', 'harvest'],
      description: 'Blazing fast, can\'t till. Pre-till your fields first!',
    },
    harvester: {
      name: 'Reaper Bot', cost: 1000, speed: 3.5,
      hexColor: '#ff6600',
      tasks: ['harvest'],
      description: 'Harvest specialist. Ruthlessly efficient at collecting crops.',
    },
    // ─── Custom robot example — uncomment! ────────────────────────────
    // titan: {
    //   name: 'Titan Bot', cost: 3000, speed: 1.5,
    //   hexColor: '#aa00ff',
    //   tasks: ['till', 'plant', 'water', 'harvest'],
    //   description: 'Slow but unstoppable behemoth.',
    // },
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

    // ── idle ──────────────────────────────────────────────────────────
    // Default. Waits for a click-assigned task from the UI.
    idle: function(robot, world, actions) {},

    // ── autoFarm ──────────────────────────────────────────────────────
    // Does EVERYTHING in priority order:
    //   harvest ready crops → water thirsty ones → plant on tilled soil → till grass
    autoFarm: function(robot, world, actions) {
      const mem = robot.memory;
      if (!mem.state) mem.state = 'findWork';

      if (mem.state === 'findWork') {
        const ready   = actions.findNearest('ready');
        if (ready)   { mem.target = ready;   mem.state = 'harvest'; return; }
        const thirsty = actions.findNearest('thirsty');
        if (thirsty) { mem.target = thirsty; mem.state = 'water';   return; }
        const tilled  = actions.findNearest('tilled');
        if (tilled)  { mem.target = tilled;  mem.state = 'plant';   return; }
        const grass   = actions.findNearest('grass');
        if (grass)   { mem.target = grass;   mem.state = 'till';    return; }
        return;
      }

      if (mem.target) {
        if (!actions.isAdjacent(mem.target.x, mem.target.y)) {
          actions.moveTo(mem.target.x, mem.target.y);
        } else {
          if (mem.state === 'harvest') actions.harvest(mem.target.x, mem.target.y);
          if (mem.state === 'water')   actions.water(mem.target.x, mem.target.y);
          if (mem.state === 'plant')   actions.plant(mem.target.x, mem.target.y, robot.assignedCrop || 'wheat');
          if (mem.state === 'till')    actions.till(mem.target.x, mem.target.y);
          mem.state  = 'findWork';
          mem.target = null;
        }
      }
    },

    // ── harvester ─────────────────────────────────────────────────────
    // Only harvests. Laser-focused. Maximum crop collection.
    harvester: function(robot, world, actions) {
      const mem = robot.memory;
      if (!mem.target) mem.target = actions.findNearest('ready');
      if (!mem.target) return;
      if (!actions.isAdjacent(mem.target.x, mem.target.y)) {
        actions.moveTo(mem.target.x, mem.target.y);
      } else {
        actions.harvest(mem.target.x, mem.target.y);
        mem.target = null;
      }
    },

    // ── planter ───────────────────────────────────────────────────────
    // Only plants and waters. Teams well with a 'harvester' bot!
    planter: function(robot, world, actions) {
      const mem = robot.memory;
      if (!mem.state) mem.state = 'findWork';

      if (mem.state === 'findWork') {
        const thirsty = actions.findNearest('thirsty');
        if (thirsty) { mem.target = thirsty; mem.state = 'water'; return; }
        const tilled  = actions.findNearest('tilled');
        if (tilled)  { mem.target = tilled;  mem.state = 'plant'; return; }
        return;
      }

      if (mem.target) {
        if (!actions.isAdjacent(mem.target.x, mem.target.y)) {
          actions.moveTo(mem.target.x, mem.target.y);
        } else {
          if (mem.state === 'water') actions.water(mem.target.x, mem.target.y);
          if (mem.state === 'plant') actions.plant(mem.target.x, mem.target.y, robot.assignedCrop || 'wheat');
          mem.state  = 'findWork';
          mem.target = null;
        }
      }
    },

    // ── areaFarm ──────────────────────────────────────────────────────
    // Like autoFarm but the bot STAYS within a home territory.
    // The territory is a 16×14 tile zone centered where you deployed it.
    areaFarm: function(robot, world, actions) {
      const mem = robot.memory;
      if (!mem.area)  mem.area  = { x: Math.floor(robot.x) - 8, y: Math.floor(robot.y) - 7, w: 16, h: 14 };
      if (!mem.state) mem.state = 'findWork';

      if (mem.state === 'findWork') {
        const ready   = actions.findNearestInArea('ready',   mem.area);
        if (ready)   { mem.target = ready;   mem.state = 'harvest'; return; }
        const thirsty = actions.findNearestInArea('thirsty', mem.area);
        if (thirsty) { mem.target = thirsty; mem.state = 'water';   return; }
        const tilled  = actions.findNearestInArea('tilled',  mem.area);
        if (tilled)  { mem.target = tilled;  mem.state = 'plant';   return; }
        return;
      }

      if (mem.target) {
        if (!actions.isAdjacent(mem.target.x, mem.target.y)) {
          actions.moveTo(mem.target.x, mem.target.y);
        } else {
          if (mem.state === 'harvest') actions.harvest(mem.target.x, mem.target.y);
          if (mem.state === 'water')   actions.water(mem.target.x, mem.target.y);
          if (mem.state === 'plant')   actions.plant(mem.target.x, mem.target.y, robot.assignedCrop || 'wheat');
          mem.state  = 'findWork';
          mem.target = null;
        }
      }
    },

    // ─── Your custom behavior ─────────────────────────────────────────
    // myBehavior: function(robot, world, actions) {
    //   const mem = robot.memory;
    //   if (!mem.home) mem.home = { x: robot.x, y: robot.y };
    //
    //   const thirsty = actions.findNearest('thirsty');
    //   if (thirsty) {
    //     if (!actions.isAdjacent(thirsty.x, thirsty.y)) {
    //       actions.moveTo(thirsty.x, thirsty.y);
    //     } else {
    //       actions.water(thirsty.x, thirsty.y);
    //     }
    //   } else {
    //     if (!actions.isAdjacent(mem.home.x, mem.home.y)) {
    //       actions.moveTo(mem.home.x, mem.home.y);
    //     }
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
