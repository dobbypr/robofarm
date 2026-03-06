/* @generated from src-ts/io.ts — run npm run build:ts */
// @ts-nocheck
/* ═══════════════════════════════════════════════════════════════════════════
 * WORLD FILE EXPORT / IMPORT  (Feature 6)
 * ═══════════════════════════════════════════════════════════════════════════ */
function _getRuntimeWorldGenSource() {
    const exporters = [
        'exportWorldGenState',
        'exportWorldGenPayload',
        'getWorldGenState',
        'getWorldGenPayload',
    ];
    for (const fnName of exporters) {
        const fn = globalThis[fnName];
        if (typeof fn !== 'function')
            continue;
        try {
            const payload = fn();
            if (payload && typeof payload === 'object')
                return payload;
        }
        catch (err) {
            console.warn(`worldGen export failed via ${fnName}:`, err);
        }
    }
    const candidates = ['worldMeta', 'worldGen', 'worldGenState', 'WORLD_GEN', 'WORLD_GEN_STATE'];
    for (const key of candidates) {
        const payload = globalThis[key];
        if (payload && typeof payload === 'object')
            return payload;
    }
    return null;
}
function _buildWorldGenSavePayload() {
    if (typeof normalizeWorldGenPayload !== 'function')
        return null;
    const source = _getRuntimeWorldGenSource();
    if (!source)
        return null;
    try {
        return normalizeWorldGenPayload(source, WW, WH);
    }
    catch (err) {
        console.warn('Failed to normalize worldGen payload:', err);
        return null;
    }
}
function _decodeSaveWorldGenPayload(worldGen) {
    if (!worldGen || typeof worldGen !== 'object')
        return null;
    if (typeof decodeIntMap2DRLE !== 'function')
        return null;
    const size = (worldGen.worldSize && typeof worldGen.worldSize === 'object') ? worldGen.worldSize : {};
    const w = Number.isInteger(size.w) ? size.w : Number.isInteger(worldGen.worldWidth) ? worldGen.worldWidth : WW;
    const h = Number.isInteger(size.h) ? size.h : Number.isInteger(worldGen.worldHeight) ? worldGen.worldHeight : WH;
    const maps = worldGen.maps && typeof worldGen.maps === 'object' ? worldGen.maps : {};
    const biome = decodeIntMap2DRLE(maps.biomeRle ?? maps.biome, w, h);
    const moisture = decodeIntMap2DRLE(maps.moistureRle ?? maps.moisture, w, h);
    const fertility = decodeIntMap2DRLE(maps.fertilityRle ?? maps.fertility, w, h);
    const developed = decodeIntMap2DRLE(maps.developedRle ?? maps.developed, w, h);
    if (!biome || !moisture || !fertility || !developed)
        return null;
    return {
        archetype: (typeof worldGen.archetype === 'string' && worldGen.archetype) ? worldGen.archetype : 'balanced',
        seed: Number.isFinite(worldGen.seed) ? Math.floor(worldGen.seed) : Math.floor(Number(S.world.seed) || 0),
        profile: (worldGen.profile && typeof worldGen.profile === 'object') ? worldGen.profile : null,
        maps: { biome, moisture, fertility, developed },
        ecology: (worldGen.ecology && typeof worldGen.ecology === 'object') ? worldGen.ecology : null,
    };
}
function buildSaveObject() {
    const save = {
        v: 3, coins, day, tick, season, isRaining, rainDay, weatherType, weatherIntensity, inventory, robotsOwned,
        worldWidth: WW,
        worldHeight: WH,
        robotVouchers,
        progression: (typeof exportProgressionState === 'function') ? exportProgressionState() : null,
        player: {
            tileX: player.tileX, tileY: player.tileY,
            px: player.px, py: player.py,
            facingX: player.facingX, facingY: player.facingY,
            frame: player.frame, frameTimer: player.frameTimer,
        },
        currentTool,
        pendingRobotType,
        savedAt: new Date().toISOString(),
        playtime,
        nextRobotId, priceMultipliers,
        economy: {
            rfs: { price: COMPANIES.rfs.price, priceHistory: COMPANIES.rfs.priceHistory, sharesOwned: COMPANIES.rfs.sharesOwned },
            bupop: { price: COMPANIES.bupop.price, priceHistory: COMPANIES.bupop.priceHistory, sharesOwned: COMPANIES.bupop.sharesOwned },
            productionHistory: productionStats.history,
        },
        vehicle: {
            px: vehicle.px, py: vehicle.py,
            angle: vehicle.angle, speed: vehicle.speed,
            moveAngle: vehicle.moveAngle, occupied: vehicle.occupied,
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
    const worldGen = _buildWorldGenSavePayload();
    if (worldGen)
        save.worldGen = worldGen;
    return save;
}
function downloadFile(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportWorldFile() {
    const save = buildSaveObject();
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const cropCount = world.flat().filter(t => t.crop).length;
    const content = `// ╔═════════════════════════════════════════════════════════════╗
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
    if (!file)
        return;
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const text = e.target.result;
            const match = text.match(/window\.__ROBOFARM_IMPORT__\s*=\s*(\{[\s\S]+\})\s*;?\s*$/m);
            if (!match) {
                notify('❌ Not a valid Robo Farm world file!');
                return;
            }
            const parsed = JSON.parse(match[1]);
            const migrated = (typeof migrateSaveObject === 'function')
                ? migrateSaveObject(parsed, { source: 'Imported world file', strictWorldSize: false })
                : { ok: !!parsed && (parsed.v === 2 || parsed.v === 3), save: parsed, warnings: [] };
            if (!migrated.ok) {
                notify(`❌ ${migrated.error || 'Incompatible save version!'}`);
                return;
            }
            if (migrated.warnings?.length) {
                for (const warning of migrated.warnings)
                    console.warn(`Imported world file: ${warning}`);
            }
            if (migrated.compatible === false && migrated.incompatibility) {
                console.warn(`Imported world file: ${migrated.incompatibility} Loading with generated terrain outside saved bounds.`);
            }
            applyGameSave(migrated.save);
            playtime = migrated.save.playtime ?? 0;
            notify('🌾 Farm restored! Welcome back, farmer.');
            closeModal('files');
        }
        catch (err) {
            notify('❌ Could not read file: ' + err.message);
        }
    };
    reader.readAsText(file);
    input.value = '';
}
function applyGameSave(save) {
    const _clamp = (n, mn, mx) => Math.max(mn, Math.min(mx, n));
    const _numOr = (v, d) => Number.isFinite(v) ? v : d;
    const _normalizeCropType = window.RF_UTIL?.normalizeCropType || (type => (typeof type === 'string' && S.crops[type]) ? type : null);
    const _defaultCropType = Object.keys(S.crops || {})[0] || 'wheat';
    const _sanitizeCropBag = (dict) => {
        const out = {};
        for (const [rawType, rawQty] of Object.entries(dict || {})) {
            const type = _normalizeCropType(rawType) || String(rawType || '').trim();
            if (!type)
                continue;
            if (type === '__proto__' || type === 'prototype' || type === 'constructor')
                continue;
            const qty = Math.max(0, Math.floor(_numOr(rawQty, 0)));
            if (qty > 0)
                out[type] = qty;
        }
        return out;
    };
    coins = _numOr(save.coins, S.player.startCoins);
    day = Math.max(1, Math.floor(_numOr(save.day, 1)));
    tick = _clamp(Math.floor(_numOr(save.tick, 0)), 0, TPDAY - 1);
    season = Math.max(0, Math.floor(_numOr(save.season, 0)));
    const savedWeatherType = typeof save.weatherType === 'string' ? save.weatherType : null;
    const savedWeatherIntensity = _numOr(save.weatherIntensity, NaN);
    if (typeof setWeather === 'function') {
        if (savedWeatherType) {
            setWeather(savedWeatherType, Number.isFinite(savedWeatherIntensity) ? { intensity: savedWeatherIntensity } : {});
        }
        else if (save.rainDay) {
            setWeather('rain');
        }
        else {
            setWeather(save.isRaining ? 'rain' : 'clear');
        }
    }
    else {
        isRaining = !!save.isRaining;
        rainDay = !!save.rainDay;
        weatherType = savedWeatherType || (rainDay ? 'rain' : 'clear');
        weatherIntensity = Number.isFinite(savedWeatherIntensity) ? savedWeatherIntensity : (weatherType === 'clear' ? 0 : 0.75);
    }
    if (typeof resetCropGrowthScheduler === 'function')
        resetCropGrowthScheduler();
    const inv = (save.inventory && typeof save.inventory === 'object') ? save.inventory : {};
    inventory = {
        seeds: _sanitizeCropBag(inv.seeds),
        crops: _sanitizeCropBag(inv.crops),
    };
    if (!inventory.seeds || typeof inventory.seeds !== 'object')
        inventory.seeds = {};
    if (!inventory.crops || typeof inventory.crops !== 'object')
        inventory.crops = {};
    nextRobotId = Math.max(1, Math.floor(_numOr(save.nextRobotId, 1)));
    priceMultipliers = (save.priceMultipliers && typeof save.priceMultipliers === 'object') ? { ...save.priceMultipliers } : {};
    // Restore economy safely
    const econ = (save.economy && typeof save.economy === 'object') ? save.economy : {};
    COMPANIES.rfs.price = _numOr(econ.rfs?.price, COMPANIES.rfs.basePrice);
    COMPANIES.rfs.priceHistory = Array.isArray(econ.rfs?.priceHistory) ? [...econ.rfs.priceHistory] : [];
    COMPANIES.rfs.sharesOwned = Math.max(0, Math.floor(_numOr(econ.rfs?.sharesOwned, 0)));
    COMPANIES.bupop.price = _numOr(econ.bupop?.price, COMPANIES.bupop.basePrice);
    COMPANIES.bupop.priceHistory = Array.isArray(econ.bupop?.priceHistory) ? [...econ.bupop.priceHistory] : [];
    COMPANIES.bupop.sharesOwned = Math.max(0, Math.floor(_numOr(econ.bupop?.sharesOwned, 0)));
    productionStats.history = Array.isArray(econ.productionHistory) ? [...econ.productionHistory] : [];
    productionStats.today = { income: 0, harvested: 0, robotHarvests: 0, cropBreakdown: {} };
    // Restore world generation metadata/maps first.
    const decodedWorldGen = _decodeSaveWorldGenPayload(save.worldGen);
    if (decodedWorldGen && typeof applyWorldGenState === 'function') {
        applyWorldGenState(decodedWorldGen);
    }
    // Restore world tiles with crop field normalization
    const allowedTypes = new Set(['grass', 'flower', 'tilled', 'water', 'tree', 'rock']);
    for (let y = 0; y < WH; y++)
        for (let x = 0; x < WW; x++) {
            const src = save.world?.[y]?.[x];
            if (!src || typeof src !== 'object')
                continue;
            const dst = world[y][x];
            dst.type = (typeof src.type === 'string' && allowedTypes.has(src.type)) ? src.type : dst.type;
            dst.watered = !!src.watered;
            const cropType = _normalizeCropType(src.crop?.type);
            if (src.crop && typeof src.crop === 'object' && cropType) {
                dst.crop = {
                    type: cropType,
                    stage: Math.max(0, Math.floor(_numOr(src.crop.stage, 0))),
                    growTimer: Math.max(0, _numOr(src.crop.growTimer, 0)),
                    waterCount: Math.max(0, Math.floor(_numOr(src.crop.waterCount, 0))),
                    waterDay: Math.max(1, Math.floor(_numOr(src.crop.waterDay, day))),
                    watered: !!src.crop.watered,
                };
            }
            else {
                dst.crop = null;
            }
        }
    if (typeof _assignAnimOffsets === 'function')
        _assignAnimOffsets();
    if (typeof markAllTilesDirty === 'function')
        markAllTilesDirty();
    // robotsOwned: handle both old (number) and new (object) save format
    const defaultOwned = {};
    for (const key of Object.keys(ROBOT_TYPES))
        defaultOwned[key] = 0;
    if (!('basic' in defaultOwned))
        defaultOwned.basic = 0;
    if (typeof save.robotsOwned === 'number') {
        defaultOwned.basic = Math.max(0, Math.floor(save.robotsOwned));
    }
    else if (save.robotsOwned && typeof save.robotsOwned === 'object') {
        for (const [k, v] of Object.entries(save.robotsOwned)) {
            defaultOwned[k] = Math.max(0, Math.floor(_numOr(v, 0)));
        }
    }
    robotsOwned = defaultOwned;
    const defaultVouchers = {};
    for (const key of Object.keys(ROBOT_TYPES))
        defaultVouchers[key] = 0;
    if (save.robotVouchers && typeof save.robotVouchers === 'object') {
        for (const [k, v] of Object.entries(save.robotVouchers)) {
            defaultVouchers[k] = Math.max(0, Math.floor(_numOr(v, 0)));
        }
    }
    robotVouchers = defaultVouchers;
    robots = [];
    const saveRobots = Array.isArray(save.robots) ? save.robots : [];
    let maxRobotId = 0;
    for (const rd of saveRobots) {
        if (!rd || typeof rd !== 'object')
            continue;
        const type = (typeof rd.type === 'string' && ROBOT_TYPES[rd.type]) ? rd.type : 'basic';
        const tx = _clamp(Math.floor(_numOr(rd.tileX, S.player.startX)), 0, WW - 1);
        const ty = _clamp(Math.floor(_numOr(rd.tileY, S.player.startY)), 0, WH - 1);
        const bot = new Robot(tx, ty, type);
        bot.id = Math.max(1, Math.floor(_numOr(rd.id, bot.id)));
        maxRobotId = Math.max(maxRobotId, bot.id);
        bot.name = typeof rd.name === 'string' && rd.name ? rd.name : bot.name;
        bot.homeTileX = _clamp(Math.floor(_numOr(rd.homeTileX, bot.tileX)), 0, WW - 1);
        bot.homeTileY = _clamp(Math.floor(_numOr(rd.homeTileY, bot.tileY)), 0, WH - 1);
        bot.batteryMax = Math.max(1, _numOr(rd.batteryMax, bot.batteryMax));
        bot.battery = _clamp(_numOr(rd.battery, bot.battery), 0, bot.batteryMax);
        bot.speed = Math.max(0.5, _numOr(rd.speed, bot.speed));
        bot.batteryDrain = Math.max(0, _numOr(rd.batteryDrain, bot.batteryDrain));
        bot.chargeRate = Math.max(0, _numOr(rd.chargeRate, bot.chargeRate));
        bot.defaultRadius = Math.max(1, Math.floor(_numOr(rd.defaultRadius, bot.defaultRadius)));
        bot.canScavenge = !!rd.canScavenge;
        bot.behavior = typeof rd.behavior === 'string' ? rd.behavior : bot.behavior;
        bot.assignedCrop = _normalizeCropType(rd.assignedCrop) || bot.assignedCrop || _defaultCropType;
        bot.workArea = (rd.workArea && Number.isFinite(rd.workArea.x) && Number.isFinite(rd.workArea.y))
            ? {
                x: _clamp(Math.floor(rd.workArea.x), 0, WW - 1),
                y: _clamp(Math.floor(rd.workArea.y), 0, WH - 1),
                radius: Math.max(1, Math.floor(_numOr(rd.workArea.radius, 8))),
            }
            : null;
        bot.inventory = {
            seeds: _sanitizeCropBag(rd.inventory?.seeds),
            crops: _sanitizeCropBag(rd.inventory?.crops),
            harvestSeeds: _sanitizeCropBag(rd.inventory?.harvestSeeds),
        };
        bot.invCapacity = Math.max(1, Math.floor(_numOr(rd.invCapacity, bot.invCapacity)));
        bot.invSlots = Math.max(1, Math.floor(_numOr(rd.invSlots, bot.invSlots)));
        bot.memory = (rd.memory && typeof rd.memory === 'object') ? rd.memory : {};
        bot.customCode = typeof rd.customCode === 'string' ? rd.customCode : '';
        bot.px = bot.tileX * TILE;
        bot.py = bot.tileY * TILE;
        bot.path = [];
        bot._pendingAction = null;
        bot.actionTimer = 0;
        bot.workTimer = 0;
        if (bot.customCode)
            compileRobotCode(bot);
        robots.push(bot);
    }
    nextRobotId = Math.max(nextRobotId, maxRobotId + 1);
    // Restore tool selections
    if (typeof save.currentTool === 'string' && document.querySelector(`[data-tool="${save.currentTool}"]`)) {
        currentTool = save.currentTool;
    }
    else {
        currentTool = 'hand';
    }
    if (typeof save.pendingRobotType === 'string' && ROBOT_TYPES[save.pendingRobotType]) {
        pendingRobotType = save.pendingRobotType;
    }
    else if (!ROBOT_TYPES[pendingRobotType]) {
        pendingRobotType = ROBOT_TYPES.basic ? 'basic' : (Object.keys(ROBOT_TYPES)[0] || 'basic');
    }
    if (typeof selectTool === 'function')
        selectTool(currentTool);
    // Restore player position/facing (fallback to first walkable tile if needed)
    const savedPlayer = (save.player && typeof save.player === 'object') ? save.player : {};
    let ptx = _clamp(Math.floor(_numOr(savedPlayer.tileX, S.player.startX)), 0, WW - 1);
    let pty = _clamp(Math.floor(_numOr(savedPlayer.tileY, S.player.startY)), 0, WH - 1);
    if (!isWalkable(ptx, pty)) {
        let found = null;
        outer: for (let y = 0; y < WH; y++) {
            for (let x = 0; x < WW; x++) {
                if (isWalkable(x, y)) {
                    found = { x, y };
                    break outer;
                }
            }
        }
        ptx = found ? found.x : S.player.startX;
        pty = found ? found.y : S.player.startY;
    }
    player.tileX = ptx;
    player.tileY = pty;
    const defaultPx = ptx * TILE;
    const defaultPy = pty * TILE;
    player.px = _clamp(_numOr(savedPlayer.px, defaultPx), 0, (WW - 1) * TILE);
    player.py = _clamp(_numOr(savedPlayer.py, defaultPy), 0, (WH - 1) * TILE);
    player.facingX = Math.sign(_numOr(savedPlayer.facingX, 0));
    player.facingY = Math.sign(_numOr(savedPlayer.facingY, 1));
    if (player.facingX === 0 && player.facingY === 0)
        player.facingY = 1;
    player.moving = false;
    player.frame = Math.floor(_numOr(savedPlayer.frame, 0)) % 4;
    player.frameTimer = 0;
    // Restore vehicle state
    const savedVehicle = (save.vehicle && typeof save.vehicle === 'object') ? save.vehicle : {};
    const defaultVehX = _clamp((S.player.startX + (S.vehicle?.spawnOffsetX ?? 3)) * TILE, 0, (WW - 1) * TILE);
    const defaultVehY = _clamp((S.player.startY + (S.vehicle?.spawnOffsetY ?? 0)) * TILE, 0, (WH - 1) * TILE);
    vehicle.px = _clamp(_numOr(savedVehicle.px, defaultVehX), 0, (WW - 1) * TILE);
    vehicle.py = _clamp(_numOr(savedVehicle.py, defaultVehY), 0, (WH - 1) * TILE);
    vehicle.angle = _numOr(savedVehicle.angle, 0);
    vehicle.speed = _numOr(savedVehicle.speed, 0);
    vehicle.moveAngle = _numOr(savedVehicle.moveAngle, vehicle.angle);
    vehicle.occupied = !!savedVehicle.occupied;
    if (typeof _resetVehicleRuntimeState === 'function')
        _resetVehicleRuntimeState();
    else {
        vehicle.drifting = false;
        vehicle.handbrake = false;
        vehicle.throttleInput = 0;
        vehicle.steerInput = 0;
        vehicle.turboCharge = 0;
        vehicle.turboTimer = 0;
        vehicle.turboReady = false;
        vehicle.wasHandbrake = false;
    }
    if (typeof _nudgeVehicleClear === 'function')
        _nudgeVehicleClear();
    if (typeof _vehicleClear === 'function' && !_vehicleClear(vehicle.px, vehicle.py)) {
        vehicle.px = defaultVehX;
        vehicle.py = defaultVehY;
        if (typeof _nudgeVehicleClear === 'function')
            _nudgeVehicleClear();
    }
    if (typeof _vehicleClear === 'function' && !_vehicleClear(vehicle.px, vehicle.py)) {
        let fallback = null;
        outer: for (let y = 0; y < WH; y++) {
            for (let x = 0; x < WW; x++) {
                const testPx = x * TILE;
                const testPy = y * TILE;
                if (_vehicleClear(testPx, testPy)) {
                    fallback = { px: testPx, py: testPy };
                    break outer;
                }
            }
        }
        if (fallback) {
            vehicle.px = fallback.px;
            vehicle.py = fallback.py;
        }
    }
    if (typeof _vehicleClear === 'function' && !_vehicleClear(vehicle.px, vehicle.py)) {
        vehicle.occupied = false;
        vehicle.speed = 0;
        if (typeof _resetVehicleRuntimeState === 'function')
            _resetVehicleRuntimeState();
        else {
            vehicle.handbrake = false;
            vehicle.drifting = false;
            vehicle.throttleInput = 0;
            vehicle.steerInput = 0;
            vehicle.turboCharge = 0;
            vehicle.turboTimer = 0;
            vehicle.turboReady = false;
            vehicle.wasHandbrake = false;
        }
    }
    if (vehicle.occupied) {
        player.px = vehicle.px;
        player.py = vehicle.py;
        player.tileX = Math.floor((vehicle.px + TILE / 2) / TILE);
        player.tileY = Math.floor((vehicle.py + TILE / 2) / TILE);
        player.moving = Math.abs(vehicle.speed) > 0.35;
    }
    if (typeof importProgressionState === 'function') {
        importProgressionState(save.progression || null);
    }
    updateUI();
}
function openModal_files() { /* wrapper */ openModal('files'); }
/* ═══════════════════════════════════════════════════════════════════════════
 * ROBOT CODE FILE EXPORT / IMPORT  (Feature 12)
 * ═══════════════════════════════════════════════════════════════════════════ */
function exportRobotCode() {
    const bot = robots.find(r => r.id === configRobotId);
    if (!bot) {
        notify('❌ Select a robot first!');
        return;
    }
    const code = document.getElementById('robot-code-editor').value.trim() ||
        '// No code yet — write your behavior here!\n// See the API Reference in the editor for all available commands.';
    const content = `// ╔═════════════════════════════════════════════════════════════╗
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
    if (!file)
        return;
    const bot = robots.find(r => r.id === configRobotId);
    if (!bot) {
        notify('❌ Select a robot first!');
        return;
    }
    const reader = new FileReader();
    reader.onload = e => {
        const text = e.target.result;
        // Strip comment header if present, find actual code
        const lines = text.split('\n');
        const codeLines = [];
        let pastHeader = false;
        for (const line of lines) {
            if (!pastHeader && line.startsWith('//'))
                continue;
            if (!pastHeader && line.trim() === '')
                continue;
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
    if (!e.target.closest('.code-toolbar'))
        document.getElementById('template-menu')?.classList.remove('visible');
});
