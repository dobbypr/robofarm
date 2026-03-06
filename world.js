/* ═══════════════════════════════════════════════════════════════════════════
 * WORLD GENERATION
 * ═══════════════════════════════════════════════════════════════════════════ */
let world = [];

const WORLD_BIOMES = {
  meadow: 0,
  forest: 1,
  scrub: 2,
  marsh: 3,
  rocky: 4,
};

const WORLD_BIOME_KEYS = Object.keys(WORLD_BIOMES);

const DEFAULT_WORLD_ARCHETYPES = {
  balanced: {
    label: 'Balanced',
    treeMul: 1,
    rockMul: 1,
    riverMul: 1,
    pondMul: 1,
    flowerMul: 1,
    marshBias: 0,
    forestBias: 0,
    rockyBias: 0,
    moistureStrength: 1,
    fertilityShift: 0,
    regrowthPerDay: 5,
    springFloodTiles: 14,
    summerDryTiles: 10,
    autumnGrowthTiles: 14,
  },
  flatlands: {
    label: 'Flatlands',
    treeMul: 0.55,
    rockMul: 0.6,
    riverMul: 0.8,
    pondMul: 0.7,
    flowerMul: 1.15,
    marshBias: -0.08,
    forestBias: -0.1,
    rockyBias: -0.06,
    moistureStrength: 0.85,
    fertilityShift: 6,
    regrowthPerDay: 4,
    springFloodTiles: 10,
    summerDryTiles: 7,
    autumnGrowthTiles: 10,
  },
  forest_farm: {
    label: 'Forest Farm',
    treeMul: 1.55,
    rockMul: 0.95,
    riverMul: 1,
    pondMul: 0.9,
    flowerMul: 0.95,
    marshBias: -0.04,
    forestBias: 0.16,
    rockyBias: -0.02,
    moistureStrength: 0.95,
    fertilityShift: 2,
    regrowthPerDay: 7,
    springFloodTiles: 12,
    summerDryTiles: 9,
    autumnGrowthTiles: 18,
  },
  wetlands: {
    label: 'Wetlands',
    treeMul: 0.85,
    rockMul: 0.7,
    riverMul: 1.4,
    pondMul: 1.7,
    flowerMul: 1.1,
    marshBias: 0.2,
    forestBias: -0.06,
    rockyBias: -0.1,
    moistureStrength: 1.25,
    fertilityShift: -3,
    regrowthPerDay: 5,
    springFloodTiles: 22,
    summerDryTiles: 14,
    autumnGrowthTiles: 16,
  },
  rocky_basin: {
    label: 'Rocky Basin',
    treeMul: 0.75,
    rockMul: 1.75,
    riverMul: 0.85,
    pondMul: 0.75,
    flowerMul: 0.7,
    marshBias: -0.1,
    forestBias: -0.12,
    rockyBias: 0.22,
    moistureStrength: 0.8,
    fertilityShift: -6,
    regrowthPerDay: 6,
    springFloodTiles: 9,
    summerDryTiles: 7,
    autumnGrowthTiles: 9,
  },
};

function createTile(type) {
  return { type, crop: null, watered: false, variant: 0, animOffset: 0 };
}

function inBounds(x, y) { return x >= 0 && y >= 0 && x < WW && y < WH; }
function isTillableTile(tile) { return tile.type === 'grass' || tile.type === 'flower'; }

function _clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }
function _num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function _randPick(arr, rng) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(rng() * arr.length)];
}

function _emptyMap(fill = 0) {
  const out = new Array(WH);
  for (let y = 0; y < WH; y++) {
    out[y] = new Array(WW);
    for (let x = 0; x < WW; x++) out[y][x] = fill;
  }
  return out;
}

function _worldArchetypes() {
  const custom = (S.world && S.world.archetypes && typeof S.world.archetypes === 'object') ? S.world.archetypes : {};
  const merged = {};
  const keys = new Set([
    ...Object.keys(DEFAULT_WORLD_ARCHETYPES),
    ...Object.keys(custom),
  ]);

  for (const key of keys) {
    const base = DEFAULT_WORLD_ARCHETYPES[key] || DEFAULT_WORLD_ARCHETYPES.balanced;
    merged[key] = { ...base, ...(custom[key] || {}) };
    if (!merged[key].label) merged[key].label = base?.label || key;
  }
  return merged;
}

function getWorldArchetypeKeys() {
  return Object.keys(_worldArchetypes());
}

function getWorldArchetypeLabel(key) {
  const defs = _worldArchetypes();
  return defs[key]?.label || defs.balanced?.label || 'Balanced';
}

function resolveWorldProfile(profileInput = null) {
  const defs = _worldArchetypes();
  const selectedKey = String(profileInput?.archetype || worldMeta?.archetype || S.world.defaultArchetype || 'balanced');
  const archetype = defs[selectedKey] ? selectedKey : 'balanced';
  const preset = defs[archetype] || defs.balanced || DEFAULT_WORLD_ARCHETYPES.balanced;
  const advancedDefaults = (S.world && typeof S.world.advancedDefaults === 'object') ? S.world.advancedDefaults : {};

  const adv = {
    treeMultiplier: _clamp(_num(profileInput?.advanced?.treeMultiplier, _num(advancedDefaults.treeMultiplier, 1)), 0, 2.4),
    rockMultiplier: _clamp(_num(profileInput?.advanced?.rockMultiplier, _num(advancedDefaults.rockMultiplier, 1)), 0, 2.6),
    pondSizeMultiplier: _clamp(_num(profileInput?.advanced?.pondSizeMultiplier, _num(advancedDefaults.pondSizeMultiplier, 1)), 0.5, 2.2),
    riverWidthBias: _clamp(_num(profileInput?.advanced?.riverWidthBias, _num(advancedDefaults.riverWidthBias, 0)), -1, 2),
    waterSpread: _clamp(_num(profileInput?.advanced?.waterSpread, _num(advancedDefaults.waterSpread, 1)), 0.5, 2),
  };

  const seed = Math.floor(_num(profileInput?.seed, S.world.seed));

  const treeFrequency = _clamp((S.world.treeFrequency || 0.1) * preset.treeMul * adv.treeMultiplier, 0, 0.42);
  const rockFrequency = _clamp((S.world.rockFrequency || 0.015) * preset.rockMul * adv.rockMultiplier, 0, 0.24);
  const flowerFrequency = _clamp((S.world.flowerFrequency || 0.06) * preset.flowerMul, 0, 0.2);
  const riverCount = Math.max(0, Math.round((S.world.riverCount || 0) * preset.riverMul * adv.waterSpread));
  const pondCount = Math.max(0, Math.round((S.world.pondCount || 0) * preset.pondMul * adv.waterSpread));
  const pondSizeMul = _clamp(adv.pondSizeMultiplier * (0.95 + preset.pondMul * 0.1), 0.5, 2.5);

  const riverHalfWidth = _clamp(1 + Math.round(adv.riverWidthBias), 0, 3);
  const moistureReach = _clamp(Math.floor(5 + preset.moistureStrength * adv.waterSpread * 6), 4, 20);
  const moistureStrength = _clamp(0.65 + preset.moistureStrength * 0.35, 0.55, 1.2);

  return {
    version: 1,
    archetype,
    archetypeLabel: preset.label || archetype,
    seed,
    advanced: adv,
    treeFrequency,
    rockFrequency,
    flowerFrequency,
    riverCount,
    pondCount,
    pondSizeMul,
    riverHalfWidth,
    biomeBias: {
      forest: _clamp(_num(preset.forestBias, 0), -0.3, 0.3),
      marsh: _clamp(_num(preset.marshBias, 0), -0.3, 0.3),
      rocky: _clamp(_num(preset.rockyBias, 0), -0.3, 0.3),
    },
    moistureReach,
    moistureStrength,
    fertilityShift: _clamp(_num(preset.fertilityShift, 0), -20, 20),
    regrowthPerDay: _clamp(Math.round(_num(preset.regrowthPerDay, 5)), 2, 16),
    springFloodTiles: _clamp(Math.round(_num(preset.springFloodTiles, 14) * adv.waterSpread), 4, 40),
    summerDryTiles: _clamp(Math.round(_num(preset.summerDryTiles, 10) * adv.waterSpread), 2, 30),
    autumnGrowthTiles: _clamp(Math.round(_num(preset.autumnGrowthTiles, 14)), 4, 36),
    farmZoneX: S.world.farmZoneX,
    farmZoneY: S.world.farmZoneY,
    farmZoneW: S.world.farmZoneW,
    farmZoneH: S.world.farmZoneH,
  };
}

function _setWorldMeta(profile, maps) {
  worldMeta = {
    version: 1,
    archetype: profile.archetype,
    seed: profile.seed,
    profile: {
      ...profile,
      advanced: { ...(profile.advanced || {}) },
      biomeBias: { ...(profile.biomeBias || {}) },
    },
    maps: {
      biome: maps.biome,
      moisture: maps.moisture,
      fertility: maps.fertility,
      developed: maps.developed,
    },
    ecology: {
      regrowCursor: worldMeta?.ecology?.regrowCursor || 0,
      lastSeasonEventDay: worldMeta?.ecology?.lastSeasonEventDay || 1,
    },
  };
}

function _initWorldAndMaps(profile) {
  world = new Array(WH);
  for (let y = 0; y < WH; y++) {
    world[y] = new Array(WW);
    for (let x = 0; x < WW; x++) world[y][x] = createTile('grass');
  }
  const maps = {
    biome: _emptyMap(WORLD_BIOMES.meadow),
    moisture: _emptyMap(42),
    fertility: _emptyMap(50),
    developed: _emptyMap(0),
  };
  _setWorldMeta(profile, maps);
}

function _buildBiomeMap(profile) {
  const seedSalt = 13;
  const forestBias = profile.biomeBias.forest;
  const marshBias = profile.biomeBias.marsh;
  const rockyBias = profile.biomeBias.rocky;

  for (let y = 0; y < WH; y++) {
    for (let x = 0; x < WW; x++) {
      const moistureN = valueNoiseSeeded(x, y, 18, seedSalt + 1);
      const roughN = valueNoiseSeeded(x, y, 22, seedSalt + 2);
      const canopyN = valueNoiseSeeded(x, y, 11, seedSalt + 3);

      let biome = WORLD_BIOMES.scrub;
      if (moistureN + marshBias > 0.69) biome = WORLD_BIOMES.marsh;
      else if (roughN + rockyBias > 0.74) biome = WORLD_BIOMES.rocky;
      else if (canopyN + forestBias > 0.62) biome = WORLD_BIOMES.forest;
      else if (roughN < 0.33 && moistureN < 0.62) biome = WORLD_BIOMES.meadow;

      worldMeta.maps.biome[y][x] = biome;
    }
  }
}

function _biomeTreeMul(biome) {
  if (biome === WORLD_BIOMES.forest) return 1.6;
  if (biome === WORLD_BIOMES.marsh) return 0.7;
  if (biome === WORLD_BIOMES.rocky) return 0.35;
  if (biome === WORLD_BIOMES.meadow) return 0.55;
  return 1;
}

function _biomeRockMul(biome) {
  if (biome === WORLD_BIOMES.rocky) return 2;
  if (biome === WORLD_BIOMES.forest) return 0.55;
  if (biome === WORLD_BIOMES.marsh) return 0.45;
  if (biome === WORLD_BIOMES.meadow) return 0.7;
  return 1;
}

function _biomeFlowerMul(biome) {
  if (biome === WORLD_BIOMES.meadow) return 1.35;
  if (biome === WORLD_BIOMES.marsh) return 1.2;
  if (biome === WORLD_BIOMES.forest) return 0.75;
  if (biome === WORLD_BIOMES.rocky) return 0.55;
  return 1;
}

function _paintBaseTerrain(profile) {
  for (let y = 0; y < WH; y++) {
    for (let x = 0; x < WW; x++) {
      const biome = worldMeta.maps.biome[y][x];
      const edgeDist = Math.min(x, y, WW - 1 - x, WH - 1 - y);
      const edgeBias = edgeDist < 5 ? (5 - edgeDist) / 5 : 0;

      const treeChance = _clamp(profile.treeFrequency * _biomeTreeMul(biome) + edgeBias * 0.04, 0, 0.5);
      const rockChance = _clamp(profile.rockFrequency * _biomeRockMul(biome), 0, 0.25);
      const flowerChance = _clamp(profile.flowerFrequency * _biomeFlowerMul(biome), 0, 0.24);

      const tile = world[y][x];
      tile.type = 'grass';

      const treeNoise = valueNoiseSeeded(x, y, 6, 21);
      if (treeNoise > 1 - treeChance) {
        tile.type = 'tree';
        tile.variant = Math.floor(tileRndSeeded(x, y, 0, 1) * 3);
        continue;
      }

      if (tileRndSeeded(x, y, 1, 1) < rockChance) {
        tile.type = 'rock';
        tile.variant = Math.floor(tileRndSeeded(x, y, 4, 1) * 3);
        continue;
      }

      if (tileRndSeeded(x, y, 2, 1) < flowerChance) {
        tile.type = 'flower';
        tile.variant = Math.floor(tileRndSeeded(x, y, 3, 1) * 5);
      }
    }
  }
}

function _carveRivers(profile) {
  const riverRng = mkRng(profile.seed + 100);
  const stepsMax = WW + WH;

  for (let r = 0; r < profile.riverCount; r++) {
    const startEdge = Math.floor(riverRng() * 4);
    let rx = 0, ry = 0, dirX = 0, dirY = 1;
    if (startEdge === 0) { rx = Math.floor(riverRng() * WW); ry = 0; dirX = 0; dirY = 1; }
    else if (startEdge === 1) { rx = WW - 1; ry = Math.floor(riverRng() * WH); dirX = -1; dirY = 0; }
    else if (startEdge === 2) { rx = Math.floor(riverRng() * WW); ry = WH - 1; dirX = 0; dirY = -1; }
    else { rx = 0; ry = Math.floor(riverRng() * WH); dirX = 1; dirY = 0; }

    for (let step = 0; step < stepsMax; step++) {
      if (!inBounds(rx, ry)) break;

      const halfW = profile.riverHalfWidth;
      for (let w = -halfW; w <= halfW; w++) {
        const wx = rx + (dirY !== 0 ? w : 0);
        const wy = ry + (dirX !== 0 ? w : 0);
        if (inBounds(wx, wy)) world[wy][wx].type = 'water';
      }

      const turn = riverRng();
      if (turn < 0.28) {
        rx += dirX;
        ry += dirY;
        if (dirX === 0) rx += (riverRng() < 0.5 ? -1 : 1);
        else ry += (riverRng() < 0.5 ? -1 : 1);
      } else {
        rx += dirX;
        ry += dirY;
      }

      if (riverRng() < 0.14) {
        const rot = riverRng() < 0.5 ? 1 : -1;
        const nx = dirY * rot;
        const ny = dirX * -rot;
        dirX = nx;
        dirY = ny;
      }
    }
  }
}

function _carvePonds(profile) {
  const pondRng = mkRng(profile.seed + 200);
  const safeMargin = 5;

  for (let p = 0; p < profile.pondCount; p++) {
    const px = safeMargin + Math.floor(pondRng() * Math.max(1, WW - safeMargin * 2));
    const py = safeMargin + Math.floor(pondRng() * Math.max(1, WH - safeMargin * 2));
    const base = 2 + Math.floor(pondRng() * 4);
    const size = Math.max(1, Math.round(base * profile.pondSizeMul));
    const shapeFactor = 0.52 + pondRng() * 0.52;

    for (let dy = -size; dy <= size; dy++) {
      for (let dx = -size; dx <= size; dx++) {
        if (!inBounds(px + dx, py + dy)) continue;
        if (dx * dx + dy * dy <= size * size * shapeFactor) {
          world[py + dy][px + dx].type = 'water';
        }
      }
    }
  }
}

function _computeWaterDistanceMap() {
  const dist = _emptyMap(9999);
  const qx = new Int32Array(WW * WH);
  const qy = new Int32Array(WW * WH);
  let qh = 0;
  let qt = 0;

  for (let y = 0; y < WH; y++) {
    for (let x = 0; x < WW; x++) {
      if (world[y][x].type === 'water') {
        dist[y][x] = 0;
        qx[qt] = x;
        qy[qt] = y;
        qt++;
      }
    }
  }

  while (qh < qt) {
    const cx = qx[qh];
    const cy = qy[qh];
    qh++;
    const cur = dist[cy][cx];

    const nx0 = cx + 1;
    const nx1 = cx - 1;
    const ny0 = cy + 1;
    const ny1 = cy - 1;

    if (nx0 < WW && dist[cy][nx0] > cur + 1) { dist[cy][nx0] = cur + 1; qx[qt] = nx0; qy[qt] = cy; qt++; }
    if (nx1 >= 0 && dist[cy][nx1] > cur + 1) { dist[cy][nx1] = cur + 1; qx[qt] = nx1; qy[qt] = cy; qt++; }
    if (ny0 < WH && dist[ny0][cx] > cur + 1) { dist[ny0][cx] = cur + 1; qx[qt] = cx; qy[qt] = ny0; qt++; }
    if (ny1 >= 0 && dist[ny1][cx] > cur + 1) { dist[ny1][cx] = cur + 1; qx[qt] = cx; qy[qt] = ny1; qt++; }
  }

  return dist;
}

function _buildMoistureMap(profile) {
  const dist = _computeWaterDistanceMap();
  for (let y = 0; y < WH; y++) {
    for (let x = 0; x < WW; x++) {
      const biome = worldMeta.maps.biome[y][x];
      const d = dist[y][x];
      let wetness = 0;
      if (d <= profile.moistureReach) {
        wetness = (1 - d / Math.max(1, profile.moistureReach)) * profile.moistureStrength;
      }
      if (biome === WORLD_BIOMES.marsh) wetness += 0.16;
      if (biome === WORLD_BIOMES.meadow) wetness += 0.04;
      if (biome === WORLD_BIOMES.rocky) wetness -= 0.12;

      wetness += (valueNoiseSeeded(x, y, 9, 41) - 0.5) * 0.18;
      const moisturePct = Math.round(_clamp(wetness, 0, 1) * 100);
      worldMeta.maps.moisture[y][x] = moisturePct;
    }
  }
}

function _buildFertilityMap(profile) {
  for (let y = 0; y < WH; y++) {
    for (let x = 0; x < WW; x++) {
      const biome = worldMeta.maps.biome[y][x];
      const baseNoise = valueNoiseSeeded(x, y, 14, 57);
      let fertility = 45 + (baseNoise - 0.5) * 40 + profile.fertilityShift;
      if (biome === WORLD_BIOMES.meadow) fertility += 10;
      if (biome === WORLD_BIOMES.marsh) fertility += 6;
      if (biome === WORLD_BIOMES.forest) fertility += 2;
      if (biome === WORLD_BIOMES.rocky) fertility -= 14;

      const moistureSynergy = worldMeta.maps.moisture[y][x] / 100;
      fertility += (moistureSynergy - 0.5) * 8;
      worldMeta.maps.fertility[y][x] = Math.round(_clamp(fertility, 0, 100));
    }
  }
}

function _clearFarmZone(profile) {
  for (let y = profile.farmZoneY; y < profile.farmZoneY + profile.farmZoneH; y++) {
    for (let x = profile.farmZoneX; x < profile.farmZoneX + profile.farmZoneW; x++) {
      if (!inBounds(x, y)) continue;
      world[y][x] = createTile('grass');
      worldMeta.maps.developed[y][x] = 1;
      worldMeta.maps.moisture[y][x] = Math.max(30, worldMeta.maps.moisture[y][x]);
      worldMeta.maps.fertility[y][x] = Math.max(45, worldMeta.maps.fertility[y][x]);
    }
  }
}

function _assignAnimOffsets() {
  for (let y = 0; y < WH; y++) {
    for (let x = 0; x < WW; x++) {
      world[y][x].animOffset = tileRndSeeded(x, y, 9, 71) * Math.PI * 2;
      if (world[y][x].type === 'flower' && world[y][x].variant === 0) {
        world[y][x].variant = Math.floor(tileRndSeeded(x, y, 3, 71) * 5);
      }
      if (world[y][x].type === 'tree') {
        world[y][x].variant = Math.floor(tileRndSeeded(x, y, 5, 71) * 3);
      }
      if (world[y][x].type === 'rock') {
        world[y][x].variant = Math.floor(tileRndSeeded(x, y, 6, 71) * 3);
      }
    }
  }
}

function generateWorld(opts = {}) {
  const profile = resolveWorldProfile(opts.profile || null);
  setWorldSeed(profile.seed);
  _initWorldAndMaps(profile);
  _buildBiomeMap(profile);
  _paintBaseTerrain(profile);
  _carveRivers(profile);
  _carvePonds(profile);
  _buildMoistureMap(profile);
  _buildFertilityMap(profile);
  _clearFarmZone(profile);
  _assignAnimOffsets();
  worldMeta.ecology.regrowCursor = 0;
  worldMeta.ecology.lastSeasonEventDay = day || 1;
  if (typeof markAllTilesDirty === 'function') markAllTilesDirty();
  return worldMeta;
}

function _isFarmZone(x, y) {
  const p = worldMeta?.profile;
  if (!p) return false;
  return x >= p.farmZoneX && x < p.farmZoneX + p.farmZoneW && y >= p.farmZoneY && y < p.farmZoneY + p.farmZoneH;
}

function markTileDeveloped(x, y) {
  if (!inBounds(x, y) || !worldMeta?.maps?.developed?.[y]) return;
  worldMeta.maps.developed[y][x] = 1;
}

function getTileMoistureValue(x, y) {
  if (!inBounds(x, y) || !worldMeta?.maps?.moisture?.[y]) return 40;
  return _clamp(_num(worldMeta.maps.moisture[y][x], 40), 0, 100);
}

function getTileFertilityValue(x, y) {
  if (!inBounds(x, y) || !worldMeta?.maps?.fertility?.[y]) return 50;
  return _clamp(_num(worldMeta.maps.fertility[y][x], 50), 0, 100);
}

function getTileMoistureBonus(x, y) {
  return (getTileMoistureValue(x, y) / 100) * 0.35;
}

function getTileFertilityGrowthMult(x, y) {
  return 0.85 + (getTileFertilityValue(x, y) / 100) * 0.3;
}

function _collectCandidates(pred) {
  const out = [];
  for (let y = 0; y < WH; y++) {
    for (let x = 0; x < WW; x++) {
      if (pred(x, y)) out.push({ x, y });
    }
  }
  return out;
}

function _hasAdjacentType(x, y, tileType) {
  return (
    (x > 0 && world[y][x - 1].type === tileType) ||
    (x < WW - 1 && world[y][x + 1].type === tileType) ||
    (y > 0 && world[y - 1][x].type === tileType) ||
    (y < WH - 1 && world[y + 1][x].type === tileType)
  );
}

function _hasAdjacentObstacle(x, y) {
  return _hasAdjacentType(x, y, 'tree') || _hasAdjacentType(x, y, 'rock');
}

function _mutateRandomTiles(candidates, maxChanges, mutateFn, rng) {
  let changes = 0;
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = candidates[i];
    candidates[i] = candidates[j];
    candidates[j] = t;
  }

  for (let i = 0; i < candidates.length && changes < maxChanges; i++) {
    const c = candidates[i];
    if (mutateFn(c.x, c.y)) changes++;
  }
  return changes;
}

function applyDailyWorldEcology() {
  if (!worldMeta?.profile || !worldMeta?.maps?.developed) return 0;
  const profile = worldMeta.profile;
  const rng = mkRng(profile.seed + (day || 1) * 173 + 991);
  const budget = Math.max(0, Math.floor(profile.regrowthPerDay || 0));
  if (budget <= 0) return 0;

  const candidates = _collectCandidates((x, y) => {
    const tile = world[y][x];
    if (worldMeta.maps.developed[y][x]) return false;
    if (_isFarmZone(x, y)) return false;
    if (tile.crop || tile.type === 'tilled' || tile.type === 'water') return false;
    if (tile.type !== 'grass' && tile.type !== 'flower') return false;
    if (!_hasAdjacentObstacle(x, y) && !(x === 0 || y === 0 || x === WW - 1 || y === WH - 1)) return false;
    return true;
  });

  return _mutateRandomTiles(candidates, budget, (x, y) => {
    const tile = world[y][x];
    if (_hasAdjacentType(x, y, 'tree') && rng() < 0.62) {
      tile.type = 'tree';
      tile.variant = Math.floor(rng() * 3);
      if (typeof markTileDirty === 'function') markTileDirty(x, y);
      return true;
    }
    if (_hasAdjacentType(x, y, 'rock') && rng() < 0.55) {
      tile.type = 'rock';
      tile.variant = Math.floor(rng() * 3);
      if (typeof markTileDirty === 'function') markTileDirty(x, y);
      return true;
    }
    if (rng() < 0.4) {
      tile.type = 'flower';
      tile.variant = Math.floor(rng() * 5);
      if (typeof markTileDirty === 'function') markTileDirty(x, y);
      return true;
    }
    return false;
  }, rng);
}

function applySeasonWorldEvent(seasonName) {
  if (!worldMeta?.profile) return { name: '', changed: 0 };
  if (worldMeta.ecology.lastSeasonEventDay === day) return { name: '', changed: 0 };

  const profile = worldMeta.profile;
  const season = String(seasonName || '').toLowerCase();
  const rng = mkRng(profile.seed + (day || 1) * 509 + 313);
  let name = '';
  let changed = 0;

  if (season === 'spring') {
    name = 'Spring Flood';
    const cands = _collectCandidates((x, y) => {
      const tile = world[y][x];
      if (worldMeta.maps.developed[y][x] || _isFarmZone(x, y)) return false;
      if (tile.crop || tile.type === 'tilled') return false;
      if (tile.type !== 'grass' && tile.type !== 'flower') return false;
      return _hasAdjacentType(x, y, 'water');
    });
    changed = _mutateRandomTiles(cands, profile.springFloodTiles || 10, (x, y) => {
      world[y][x].type = 'water';
      if (typeof markTileDirty === 'function') markTileDirty(x, y);
      return true;
    }, rng);
  } else if (season === 'summer') {
    name = 'Summer Drought';
    const cands = _collectCandidates((x, y) => {
      if (worldMeta.maps.developed[y][x] || _isFarmZone(x, y)) return false;
      const tile = world[y][x];
      if (tile.type !== 'water') return false;
      let adjacentWater = 0;
      if (x > 0 && world[y][x - 1].type === 'water') adjacentWater++;
      if (x < WW - 1 && world[y][x + 1].type === 'water') adjacentWater++;
      if (y > 0 && world[y - 1][x].type === 'water') adjacentWater++;
      if (y < WH - 1 && world[y + 1][x].type === 'water') adjacentWater++;
      return adjacentWater <= 2;
    });
    changed = _mutateRandomTiles(cands, profile.summerDryTiles || 8, (x, y) => {
      world[y][x] = createTile('grass');
      if (typeof markTileDirty === 'function') markTileDirty(x, y);
      return true;
    }, rng);
  } else if (season === 'autumn') {
    name = 'Autumn Overgrowth';
    const cands = _collectCandidates((x, y) => {
      if (worldMeta.maps.developed[y][x] || _isFarmZone(x, y)) return false;
      const tile = world[y][x];
      if (tile.crop || tile.type === 'tilled' || tile.type === 'water') return false;
      return tile.type === 'grass' || tile.type === 'flower';
    });
    changed = _mutateRandomTiles(cands, profile.autumnGrowthTiles || 14, (x, y) => {
      if (rng() < 0.4) {
        world[y][x].type = 'tree';
        world[y][x].variant = Math.floor(rng() * 3);
      } else {
        world[y][x].type = 'flower';
        world[y][x].variant = Math.floor(rng() * 5);
      }
      if (typeof markTileDirty === 'function') markTileDirty(x, y);
      return true;
    }, rng);
  } else {
    name = 'Winter Quiet';
    changed = 0;
  }

  worldMeta.ecology.lastSeasonEventDay = day;
  _assignAnimOffsets();
  return { name, changed };
}

function exportWorldGenState() {
  if (!worldMeta || typeof worldMeta !== 'object') return null;
  return {
    version: 1,
    archetype: worldMeta.archetype,
    seed: Math.floor(_num(worldMeta.seed, S.world.seed)),
    profile: worldMeta.profile ? {
      ...worldMeta.profile,
      advanced: { ...(worldMeta.profile.advanced || {}) },
      biomeBias: { ...(worldMeta.profile.biomeBias || {}) },
    } : null,
    maps: {
      biome: worldMeta.maps?.biome || _emptyMap(WORLD_BIOMES.meadow),
      moisture: worldMeta.maps?.moisture || _emptyMap(40),
      fertility: worldMeta.maps?.fertility || _emptyMap(50),
      developed: worldMeta.maps?.developed || _emptyMap(0),
    },
    ecology: {
      regrowCursor: Math.max(0, Math.floor(_num(worldMeta.ecology?.regrowCursor, 0))),
      lastSeasonEventDay: Math.max(1, Math.floor(_num(worldMeta.ecology?.lastSeasonEventDay, day || 1))),
    },
  };
}

function _isValidMap(map) {
  if (!Array.isArray(map) || map.length !== WH) return false;
  for (let y = 0; y < WH; y++) {
    if (!Array.isArray(map[y]) || map[y].length !== WW) return false;
  }
  return true;
}

function applyWorldGenState(state) {
  if (!state || typeof state !== 'object') return false;

  const profile = resolveWorldProfile({
    archetype: state.archetype,
    seed: state.seed,
    advanced: state.profile?.advanced || null,
  });

  _setWorldMeta(profile, {
    biome: _isValidMap(state.maps?.biome) ? state.maps.biome : _emptyMap(WORLD_BIOMES.scrub),
    moisture: _isValidMap(state.maps?.moisture) ? state.maps.moisture : _emptyMap(40),
    fertility: _isValidMap(state.maps?.fertility) ? state.maps.fertility : _emptyMap(50),
    developed: _isValidMap(state.maps?.developed) ? state.maps.developed : _emptyMap(0),
  });

  worldMeta.ecology = {
    regrowCursor: Math.max(0, Math.floor(_num(state.ecology?.regrowCursor, 0))),
    lastSeasonEventDay: Math.max(1, Math.floor(_num(state.ecology?.lastSeasonEventDay, day || 1))),
  };

  setWorldSeed(profile.seed);
  return true;
}
