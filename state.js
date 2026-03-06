/* @generated from src-ts/state.ts — run npm run build:ts */
// @ts-nocheck
/* ═══════════════════════════════════════════════════════════════════════════
 * GAME STATE
 * ═══════════════════════════════════════════════════════════════════════════ */
const _stateUtil = window.RF_UTIL;
const _stateToInt = _stateUtil?.toInt || ((v, d = 0) => Math.floor(Number(v) || d));
const _stateSafeObject = _stateUtil?.safeObject || (v => (v && typeof v === 'object' ? v : {}));
let coins = S.player.startCoins;
let day = 1, tick = 0, season = 0;
let isRaining = false, rainDay = false;
const SEASONS = S.time.seasons;
const TPDAY = S.time.ticksPerDay;
const WEATHER_TYPES = ['clear', 'rain', 'snow', 'thunder', 'hail'];
const WEATHER_LOOKUP = Object.freeze({
    clear: { icon: '☀️', label: 'Clear', watersCrops: false, precip: false, growthMult: 1.0, hydration: 0 },
    rain: { icon: '🌧', label: 'Rain', watersCrops: true, precip: true, growthMult: 1.04, hydration: 1 },
    snow: { icon: '❄️', label: 'Snow', watersCrops: false, precip: true, growthMult: 0.82, hydration: 0.3 },
    thunder: { icon: '⛈️', label: 'Thunder', watersCrops: true, precip: true, growthMult: 1.08, hydration: 1 },
    hail: { icon: '🧊', label: 'Hail', watersCrops: true, precip: true, growthMult: 0.92, hydration: 1 },
});
let weatherType = 'clear';
let weatherIntensity = 0;
let weatherFlash = 0;
let weatherThunderTimer = 0;
let weatherBoltSeed = 0;
let weatherBoltX = 0.5;
let weatherBoltSegments = null;
function normalizeWeatherType(type) {
    const t = String(type || '').toLowerCase();
    return WEATHER_TYPES.includes(t) ? t : 'clear';
}
function getWeatherInfo(type = weatherType) {
    return WEATHER_LOOKUP[normalizeWeatherType(type)] || WEATHER_LOOKUP.clear;
}
function getWeatherIcon(type = weatherType) {
    return getWeatherInfo(type).icon;
}
function getWeatherLabel(type = weatherType) {
    return getWeatherInfo(type).label;
}
function getWeatherSummary(type = weatherType) {
    return `${getWeatherIcon(type)} ${getWeatherLabel(type)}`;
}
function weatherWatersCrops(type = weatherType) {
    return !!getWeatherInfo(type).watersCrops;
}
function weatherHasPrecipitation(type = weatherType) {
    return !!getWeatherInfo(type).precip;
}
function getWeatherHydration(type = weatherType) {
    return getWeatherInfo(type).hydration;
}
function getWeatherGrowthMultiplier(type = weatherType) {
    return getWeatherInfo(type).growthMult;
}
function _normalizeWeatherWeights(raw) {
    const out = {};
    let sum = 0;
    for (const key of WEATHER_TYPES) {
        const weight = Number(raw?.[key]);
        const clamped = Number.isFinite(weight) ? Math.max(0, weight) : 0;
        out[key] = clamped;
        sum += clamped;
    }
    if (sum <= 0) {
        out.clear = 1;
        out.rain = 0;
        out.snow = 0;
        out.thunder = 0;
        out.hail = 0;
        return out;
    }
    for (const key of WEATHER_TYPES)
        out[key] /= sum;
    return out;
}
function getSeasonWeatherWeights(seasonName) {
    const fallbackRain = Math.max(0, Math.min(0.92, Number(S.time.rainChance?.[seasonName]) || 0.2));
    const defaults = {
        clear: Math.max(0.08, 1 - fallbackRain),
        rain: fallbackRain * 0.67,
        thunder: fallbackRain * 0.23,
        hail: fallbackRain * 0.1,
        snow: 0,
    };
    const raw = S.time.weatherChances?.[seasonName];
    return _normalizeWeatherWeights(raw || defaults);
}
function _rollWeightedWeather(weights) {
    const roll = Math.random();
    let cursor = 0;
    for (const key of WEATHER_TYPES) {
        cursor += Number(weights?.[key]) || 0;
        if (roll <= cursor)
            return key;
    }
    return 'clear';
}
function _weatherIntensityFor(type) {
    const t = normalizeWeatherType(type);
    if (t === 'clear')
        return 0;
    if (t === 'snow')
        return 0.45 + Math.random() * 0.45;
    if (t === 'thunder')
        return 0.9 + Math.random() * 0.45;
    if (t === 'hail')
        return 0.65 + Math.random() * 0.4;
    return 0.65 + Math.random() * 0.35;
}
function _resetLightning() {
    weatherFlash = 0;
    weatherThunderTimer = 0;
    weatherBoltSeed = 0;
    weatherBoltX = 0.5;
    weatherBoltSegments = null;
}
function setWeather(type, opts = {}) {
    const prev = weatherType;
    const next = normalizeWeatherType(type);
    weatherType = next;
    const customIntensity = Number(opts.intensity);
    weatherIntensity = Number.isFinite(customIntensity)
        ? Math.max(0, Math.min(1.5, customIntensity))
        : _weatherIntensityFor(next);
    // Compatibility flags consumed by older systems.
    rainDay = weatherWatersCrops(next);
    isRaining = weatherHasPrecipitation(next);
    if (next === 'thunder') {
        if (prev !== 'thunder' || opts.forceReset) {
            weatherFlash = 0;
            weatherThunderTimer = 6 + Math.floor(Math.random() * 20);
            weatherBoltSeed = Math.floor(Math.random() * 1e9);
            weatherBoltX = 0.15 + Math.random() * 0.7;
            weatherBoltSegments = null;
        }
    }
    else {
        _resetLightning();
    }
    return weatherType;
}
function rollDailyWeather(seasonName = SEASONS[season % SEASONS.length]) {
    const weights = getSeasonWeatherWeights(seasonName);
    const rolled = _rollWeightedWeather(weights);
    setWeather(rolled, { forceReset: true });
    return rolled;
}
function triggerLightningStrike() {
    weatherFlash = 0.86;
    weatherBoltSeed = Math.floor(Math.random() * 1e9);
    weatherBoltX = 0.1 + Math.random() * 0.8;
    weatherThunderTimer = 8 + Math.floor(Math.random() * 30);
    weatherBoltSegments = null;
}
function updateWeatherState() {
    if (weatherType === 'thunder') {
        weatherThunderTimer--;
        if (weatherThunderTimer <= 0) {
            const strikeChance = Math.max(0.01, 0.014 + weatherIntensity * 0.018);
            if (Math.random() < strikeChance)
                triggerLightningStrike();
            else
                weatherThunderTimer = 6 + Math.floor(Math.random() * 20);
        }
    }
    else if (weatherThunderTimer > 0) {
        weatherThunderTimer--;
    }
    if (weatherFlash > 0)
        weatherFlash = Math.max(0, weatherFlash - 0.048);
}
let inventory = { seeds: {}, crops: {} };
// Init seeds
for (const [k, v] of Object.entries(_stateSafeObject(S.player.startSeeds)))
    inventory.seeds[k] = v;
let worldMeta = {
    version: 1,
    archetype: S.world.defaultArchetype || 'balanced',
    seed: _stateToInt(S.world.seed, 0),
    profile: null,
    maps: {
        biome: [],
        moisture: [],
        fertility: [],
        developed: [],
    },
    ecology: {
        regrowCursor: 0,
        lastSeasonEventDay: 1,
    },
};
let currentTool = 'hand';
let selectedRobotId = null;
let assigningWorkArea = false;
/* ═══════════════════════════════════════════════════════════════════════════
 * ECONOMY — COMPANIES & PRODUCTION STATS
 * ═══════════════════════════════════════════════════════════════════════════ */
const COMPANIES = {
    rfs: {
        id: 'rfs', name: 'Robot Farming Society', ticker: 'RFS',
        tagline: 'By the land. For the land.', logo: '🤖🌾',
        color: '#4a9c3f', accentColor: '#7fff7f', bgColor: '#060e04',
        basePrice: 48, price: 48, volatility: 0.065,
        priceHistory: [], sharesOwned: 0, dividend: 0.8
    },
    bupop: {
        id: 'bupop', name: 'BuPop Inc.', ticker: 'BPOP',
        tagline: 'Your harvest. Our profit.', logo: '🏢',
        color: '#3a7abb', accentColor: '#64b0ff', bgColor: '#04091a',
        basePrice: 128, price: 128, volatility: 0.04,
        priceHistory: [], sharesOwned: 0, dividend: 1.5
    }
};
let productionStats = {
    history: [], // last 30 days
    today: { income: 0, harvested: 0, robotHarvests: 0, cropBreakdown: {} }
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
 * VEHICLE
 * ═══════════════════════════════════════════════════════════════════════════ */
const vehicle = (() => {
    let vx = S.player.startX + (S.vehicle?.spawnOffsetX ?? 3);
    let vy = S.player.startY + (S.vehicle?.spawnOffsetY ?? 0);
    vx = Math.max(0, Math.min((S.world?.width ?? 112) - 1, vx));
    vy = Math.max(0, Math.min((S.world?.height ?? 84) - 1, vy));
    return {
        px: vx * TILE,
        py: vy * TILE,
        angle: 0,
        speed: 0,
        moveAngle: 0,
        drifting: false,
        handbrake: false,
        throttleInput: 0,
        steerInput: 0,
        turboCharge: 0,
        turboTimer: 0,
        turboReady: false,
        wasHandbrake: false,
        occupied: false,
    };
})();
/* ═══════════════════════════════════════════════════════════════════════════
 * CAMERA
 * ═══════════════════════════════════════════════════════════════════════════ */
const camera = { x: 0, y: 0, tx: 0, ty: 0, zoom: S.display.zoomLevel };
/* ═══════════════════════════════════════════════════════════════════════════
 * GAME STATE FLAGS
 * ═══════════════════════════════════════════════════════════════════════════ */
let gameState = 'menu'; // 'menu' | 'playing'
let currentSlot = 0; // 0 = no slot loaded; 1–3 = active save slot
let playtime = 0; // ticks elapsed in-game (not counting menu time)
let autosaveBlocked = false;
let autosaveBlockReason = '';
