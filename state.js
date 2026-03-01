/* ═══════════════════════════════════════════════════════════════════════════
 * GAME STATE
 * ═══════════════════════════════════════════════════════════════════════════ */
let coins = S.player.startCoins;
let day = 1, tick = 0, season = 0;
let isRaining = false, rainDay = false;
const SEASONS = S.time.seasons;
const TPDAY = S.time.ticksPerDay;

let inventory = { seeds: {}, crops: {} };
// Init seeds
for (const [k, v] of Object.entries(S.player.startSeeds)) inventory.seeds[k] = v;

let currentTool = 'hand';
let selectedRobotId = null;
let assigningWorkArea = false;

/* ═══════════════════════════════════════════════════════════════════════════
 * ECONOMY — COMPANIES & PRODUCTION STATS
 * ═══════════════════════════════════════════════════════════════════════════ */
const COMPANIES = {
  rfs: {
    id:'rfs', name:'Robot Farming Society', ticker:'RFS',
    tagline:'By the land. For the land.', logo:'🤖🌾',
    color:'#4a9c3f', accentColor:'#7fff7f', bgColor:'#060e04',
    basePrice:48, price:48, volatility:0.065,
    priceHistory:[], sharesOwned:0, dividend:0.8
  },
  bupop: {
    id:'bupop', name:'BuPop Inc.', ticker:'BPOP',
    tagline:'Your harvest. Our profit.', logo:'🏢',
    color:'#3a7abb', accentColor:'#64b0ff', bgColor:'#04091a',
    basePrice:128, price:128, volatility:0.04,
    priceHistory:[], sharesOwned:0, dividend:1.5
  }
};

let productionStats = {
  history: [],   // last 30 days
  today: { income:0, harvested:0, robotHarvests:0, cropBreakdown:{} }
};

let chartViewCompany = 'rfs';

/* ═══════════════════════════════════════════════════════════════════════════
 * PLAYER
 * ═══════════════════════════════════════════════════════════════════════════ */
const player = {
  tileX: S.player.startX, tileY: S.player.startY,
  px: S.player.startX * TILE, py: S.player.startY * TILE,
  facingX: 0, facingY: 1, moving: false, frame: 0, frameTimer: 0,
};

/* ═══════════════════════════════════════════════════════════════════════════
 * CAMERA
 * ═══════════════════════════════════════════════════════════════════════════ */
const camera = { x: 0, y: 0, tx: 0, ty: 0, zoom: S.display.zoomLevel };

/* ═══════════════════════════════════════════════════════════════════════════
 * GAME STATE FLAGS
 * ═══════════════════════════════════════════════════════════════════════════ */
let gameState = 'menu';   // 'menu' | 'playing'
let currentSlot = 0;      // 0 = no slot loaded; 1–3 = active save slot
let playtime = 0;         // ticks elapsed in-game (not counting menu time)
