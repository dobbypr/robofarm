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
