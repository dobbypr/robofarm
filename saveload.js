/* ═══════════════════════════════════════════════════════════════════════════
 * SAVE / LOAD  (3-slot system)
 * ═══════════════════════════════════════════════════════════════════════════ */
const SAVE_FORMAT_VERSION = 3;
const SAVE_MIN_LOADABLE_VERSION = 2;

const _slotKey = slot => `roboFarm_save_${slot}`;

function _isPosInt(n) {
  return Number.isInteger(n) && n > 0;
}

function _toPosInt(n) {
  return _isPosInt(n) ? n : null;
}

function _safeClone(obj) {
  try {
    if (typeof structuredClone === 'function') return structuredClone(obj);
  } catch (_) {
    // Fallback to JSON clone below.
  }
  try { return JSON.parse(JSON.stringify(obj)); }
  catch { return null; }
}

function _inferRectWorldSize(worldData) {
  if (!Array.isArray(worldData) || worldData.length <= 0) return null;
  const h = worldData.length;
  if (!Array.isArray(worldData[0])) return null;
  const w = worldData[0].length;
  if (!_isPosInt(w)) return null;
  for (const row of worldData) {
    if (!Array.isArray(row) || row.length !== w) return null;
  }
  return { w, h };
}

function getSaveWorldSize(save) {
  if (!save || typeof save !== 'object') return null;
  const explicitW = _toPosInt(save.worldWidth ?? save.width ?? save.w);
  const explicitH = _toPosInt(save.worldHeight ?? save.height ?? save.h);
  if (explicitW && explicitH) return { w: explicitW, h: explicitH, source: 'explicit' };

  const worldSize = _inferRectWorldSize(save.world);
  if (worldSize) return { ...worldSize, source: 'world' };

  const gen = (save.worldGen && typeof save.worldGen === 'object') ? save.worldGen : null;
  if (gen) {
    const gsw = gen.worldSize && typeof gen.worldSize === 'object' ? gen.worldSize : null;
    const gswW = _toPosInt(gsw?.w ?? gsw?.width);
    const gswH = _toPosInt(gsw?.h ?? gsw?.height);
    if (gswW && gswH) return { w: gswW, h: gswH, source: 'worldGen.worldSize' };
    const genW = _toPosInt(gen.worldWidth ?? gen.width ?? gen.w);
    const genH = _toPosInt(gen.worldHeight ?? gen.height ?? gen.h);
    if (genW && genH) return { w: genW, h: genH, source: 'worldGen' };
  }
  return null;
}

function isValidIntMap2D(map, expectedW, expectedH) {
  if (!Array.isArray(map) || map.length <= 0) return false;
  const h = map.length;
  const w = Array.isArray(map[0]) ? map[0].length : 0;
  if (!_isPosInt(w)) return false;
  if (_isPosInt(expectedW) && w !== expectedW) return false;
  if (_isPosInt(expectedH) && h !== expectedH) return false;
  for (const row of map) {
    if (!Array.isArray(row) || row.length !== w) return false;
    for (const v of row) {
      if (!Number.isInteger(v)) return false;
    }
  }
  return true;
}

function encodeIntMap2DRLE(map) {
  if (!isValidIntMap2D(map)) return null;
  const h = map.length;
  const w = map[0].length;
  const rle = [];
  let prev = map[0][0];
  let run = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = map[y][x];
      if (v === prev) {
        run++;
      } else {
        rle.push(prev, run);
        prev = v;
        run = 1;
      }
    }
  }
  rle.push(prev, run);
  return { w, h, rle };
}

function _normalizeRLEPairs(raw) {
  if (!Array.isArray(raw)) return null;
  if (raw.length === 0) return null;

  // Allow [[value, count], ...] and [value, count, value, count, ...]
  const flat = [];
  if (Array.isArray(raw[0])) {
    for (const pair of raw) {
      if (!Array.isArray(pair) || pair.length !== 2) return null;
      flat.push(pair[0], pair[1]);
    }
  } else {
    if (raw.length % 2 !== 0) return null;
    for (const item of raw) flat.push(item);
  }

  for (let i = 0; i < flat.length; i += 2) {
    if (!Number.isInteger(flat[i])) return null;
    if (!Number.isInteger(flat[i + 1]) || flat[i + 1] <= 0) return null;
  }
  return flat;
}

function decodeIntMap2DRLE(encoded, expectedW, expectedH) {
  if (isValidIntMap2D(encoded, expectedW, expectedH)) {
    return encoded.map(row => row.slice());
  }
  if (!encoded || typeof encoded !== 'object') return null;

  const w = _toPosInt(encoded.w ?? encoded.width);
  const h = _toPosInt(encoded.h ?? encoded.height);
  if (!w || !h) return null;
  if (_isPosInt(expectedW) && w !== expectedW) return null;
  if (_isPosInt(expectedH) && h !== expectedH) return null;

  const rle = _normalizeRLEPairs(encoded.rle ?? encoded.data ?? encoded.runs);
  if (!rle) return null;

  const total = w * h;
  const flat = new Array(total);
  let idx = 0;
  for (let i = 0; i < rle.length; i += 2) {
    const value = rle[i];
    const count = rle[i + 1];
    for (let n = 0; n < count; n++) {
      if (idx >= total) return null;
      flat[idx++] = value;
    }
  }
  if (idx !== total) return null;

  const out = [];
  for (let y = 0; y < h; y++) {
    out[y] = flat.slice(y * w, (y + 1) * w);
  }
  return out;
}

function normalizeWorldGenPayload(payload, expectedW, expectedH) {
  if (!payload || typeof payload !== 'object') return null;

  let w = _toPosInt(expectedW ?? payload.worldWidth ?? payload.width ?? payload.w);
  let h = _toPosInt(expectedH ?? payload.worldHeight ?? payload.height ?? payload.h);
  const archetype = typeof payload.archetype === 'string' && payload.archetype.trim()
    ? payload.archetype.trim()
    : 'balanced';

  const rawProfile = (payload.profile && typeof payload.profile === 'object') ? _safeClone(payload.profile) : null;
  const profile = rawProfile && typeof rawProfile === 'object' ? rawProfile : null;
  const seed = Number.isFinite(payload.seed) ? Math.floor(payload.seed) : null;

  const rawEco = (payload.ecology && typeof payload.ecology === 'object') ? payload.ecology : {};
  const ecology = {
    regrowCursor: Math.max(0, Math.floor(Number(rawEco.regrowCursor) || 0)),
    lastSeasonEventDay: Math.max(1, Math.floor(Number(rawEco.lastSeasonEventDay) || 1)),
  };

  const mapsIn = (payload.maps && typeof payload.maps === 'object') ? payload.maps : {};
  const names = [
    ['biome', ['biome', 'biomeRle']],
    ['moisture', ['moisture', 'moistureRle']],
    ['fertility', ['fertility', 'fertilityRle']],
    ['developed', ['developed', 'developedRle']],
  ];

  const maps = {};
  for (const [outName, keys] of names) {
    let decoded = null;
    for (const key of keys) {
      const v = mapsIn[key] ?? payload[key];
      decoded = decodeIntMap2DRLE(v, w, h);
      if (!decoded && !w && !h) decoded = decodeIntMap2DRLE(v);
      if (decoded) break;
    }
    if (!decoded) continue;
    if (!w || !h) {
      h = decoded.length;
      w = decoded[0].length;
    }
    const encoded = encodeIntMap2DRLE(decoded);
    if (encoded) maps[`${outName}Rle`] = encoded;
  }

  if (!w || !h) return null;
  if (Object.keys(maps).length === 0) return null;

  const worldSize = { w, h };
  return {
    schema: 1,
    generatorId: typeof payload.generatorId === 'string' ? payload.generatorId : 'terrain-v2',
    archetype,
    seed: Number.isInteger(seed) ? seed : null,
    worldSize,
    profile,
    maps,
    ecology,
  };
}

function validateSaveCompatibility(save, opts = {}) {
  const strictWorldSize = opts.strictWorldSize !== false;
  const runtimeW = _toPosInt(typeof WW !== 'undefined' ? WW : null);
  const runtimeH = _toPosInt(typeof WH !== 'undefined' ? WH : null);
  const worldSize = getSaveWorldSize(save);
  const warnings = [];

  let compatible = true;
  let incompatibility = null;
  if (runtimeW && runtimeH && worldSize) {
    if (worldSize.w !== runtimeW || worldSize.h !== runtimeH) {
      compatible = false;
      incompatibility = `World size mismatch: save is ${worldSize.w}x${worldSize.h}, runtime is ${runtimeW}x${runtimeH}.`;
      if (strictWorldSize) {
        return { ok: false, error: incompatibility, compatible: false, worldSize };
      }
    }
  }

  const expectedW = runtimeW || worldSize?.w || null;
  const expectedH = runtimeH || worldSize?.h || null;
  const normalizedWorldGen = normalizeWorldGenPayload(save.worldGen, expectedW, expectedH);
  if (save.worldGen && !normalizedWorldGen) {
    warnings.push('Invalid worldGen payload ignored.');
  }

  return {
    ok: true,
    compatible,
    incompatibility,
    worldSize,
    normalizedWorldGen,
    warnings,
  };
}

function migrateSaveV2ToV3(saveV2) {
  const out = { ...saveV2, v: 3 };
  const size = getSaveWorldSize(out);
  if (size) {
    out.worldWidth = size.w;
    out.worldHeight = size.h;
  } else {
    const runtimeW = _toPosInt(typeof WW !== 'undefined' ? WW : null);
    const runtimeH = _toPosInt(typeof WH !== 'undefined' ? WH : null);
    if (runtimeW && runtimeH) {
      out.worldWidth = runtimeW;
      out.worldHeight = runtimeH;
    }
  }
  if (!out.worldGen) {
    out.worldGen = _synthesizeWorldGenFromV2(out.world, out.worldWidth, out.worldHeight, out.day);
  }
  out.worldGen = normalizeWorldGenPayload(out.worldGen, out.worldWidth, out.worldHeight);
  return out;
}

function _synthesizeWorldGenFromV2(worldTiles, w, h, day = 1) {
  const width = _toPosInt(w) || _toPosInt(typeof WW !== 'undefined' ? WW : null);
  const height = _toPosInt(h) || _toPosInt(typeof WH !== 'undefined' ? WH : null);
  if (!width || !height) return null;

  const biome = new Array(height);
  const moisture = new Array(height);
  const fertility = new Array(height);
  const developed = new Array(height);

  const getType = (x, y) => {
    const t = worldTiles?.[y]?.[x];
    return (t && typeof t.type === 'string') ? t.type : 'grass';
  };
  const hasAdjWater = (x, y) => {
    return (
      (x > 0 && getType(x - 1, y) === 'water') ||
      (x < width - 1 && getType(x + 1, y) === 'water') ||
      (y > 0 && getType(x, y - 1) === 'water') ||
      (y < height - 1 && getType(x, y + 1) === 'water')
    );
  };

  for (let y = 0; y < height; y++) {
    biome[y] = new Array(width);
    moisture[y] = new Array(width);
    fertility[y] = new Array(width);
    developed[y] = new Array(width);
    for (let x = 0; x < width; x++) {
      const type = getType(x, y);
      const hasCrop = !!worldTiles?.[y]?.[x]?.crop;

      biome[y][x] = type === 'tree' ? 1
        : type === 'rock' ? 4
          : type === 'water' ? 3
            : type === 'flower' ? 0
              : 2;

      moisture[y][x] = type === 'water' ? 100 : (hasAdjWater(x, y) ? 82 : 40);

      fertility[y][x] = type === 'rock' ? 28
        : type === 'tree' ? 48
          : type === 'flower' ? 62
            : type === 'tilled' ? 55
              : type === 'water' ? 52
                : 58;

      developed[y][x] = (type === 'tilled' || hasCrop) ? 1 : 0;
    }
  }

  return {
    schema: 1,
    generatorId: 'terrain-v2',
    archetype: 'balanced',
    seed: Number.isFinite(S?.world?.seed) ? Math.floor(S.world.seed) : 0,
    worldSize: { w: width, h: height },
    profile: null,
    maps: { biome, moisture, fertility, developed },
    ecology: {
      regrowCursor: 0,
      lastSeasonEventDay: Math.max(1, Math.floor(Number(day) || 1)),
    },
  };
}

function migrateSaveObject(rawSave, opts = {}) {
  const source = opts.source || 'save';
  const strictWorldSize = opts.strictWorldSize !== false;
  if (!rawSave || typeof rawSave !== 'object') {
    return { ok: false, error: `${source}: save payload is not an object.` };
  }
  let save = _safeClone(rawSave);
  if (!save) return { ok: false, error: `${source}: save payload could not be cloned.` };

  let v = Number.isInteger(save.v) ? save.v : null;
  if (!v) return { ok: false, error: `${source}: missing save version.` };
  if (v > SAVE_FORMAT_VERSION) {
    return { ok: false, error: `${source}: save version ${v} is newer than supported v${SAVE_FORMAT_VERSION}.` };
  }
  if (v < SAVE_MIN_LOADABLE_VERSION) {
    return { ok: false, error: `${source}: save version ${v} is too old to migrate.` };
  }

  let migrated = false;
  while (v < SAVE_FORMAT_VERSION) {
    if (v === 2) {
      save = migrateSaveV2ToV3(save);
      migrated = true;
    } else {
      return { ok: false, error: `${source}: no migration path from v${v}.` };
    }
    v = Number.isInteger(save.v) ? save.v : null;
    if (!v) return { ok: false, error: `${source}: migration produced invalid save version.` };
  }

  const compatibility = validateSaveCompatibility(save, { strictWorldSize });
  if (!compatibility.ok) {
    return { ok: false, error: `${source}: ${compatibility.error}` };
  }

  const size = compatibility.worldSize;
  if (size && (save.worldWidth !== size.w || save.worldHeight !== size.h)) {
    save.worldWidth = size.w;
    save.worldHeight = size.h;
    migrated = true;
  }
  if (save.worldGen && !compatibility.normalizedWorldGen) {
    if (save.v === 2 && save.world) {
      const synthesized = normalizeWorldGenPayload(
        _synthesizeWorldGenFromV2(save.world, save.worldWidth || compatibility.worldSize?.w, save.worldHeight || compatibility.worldSize?.h, save.day),
        compatibility.worldSize?.w || save.worldWidth,
        compatibility.worldSize?.h || save.worldHeight
      );
      save.worldGen = synthesized || null;
      migrated = true;
    } else {
      save.worldGen = null;
      migrated = true;
    }
  } else if (compatibility.normalizedWorldGen) {
    const normalized = compatibility.normalizedWorldGen;
    const prev = JSON.stringify(save.worldGen ?? null);
    const next = JSON.stringify(normalized);
    if (prev !== next) migrated = true;
    save.worldGen = normalized;
  } else if (!('worldGen' in save)) {
    save.worldGen = null;
    migrated = true;
  }

  save.v = SAVE_FORMAT_VERSION;
  return {
    ok: true,
    save,
    migrated,
    compatible: compatibility.compatible,
    incompatibility: compatibility.incompatibility,
    warnings: compatibility.warnings,
  };
}

function migrateSingleSlot() {
  const old = localStorage.getItem('roboFarm_save');
  if (!old) return;
  if (!localStorage.getItem(_slotKey(1))) {
    localStorage.setItem(_slotKey(1), old);
  }
  localStorage.removeItem('roboFarm_save');
}

function saveGame(slot) {
  if (!slot || slot < 1 || slot > 3) return;
  autosaveBlocked = false;
  autosaveBlockReason = '';
  const save = buildSaveObject();
  try {
    localStorage.setItem(_slotKey(slot), JSON.stringify(save));
    const flash = document.getElementById('save-flash');
    if (flash) { flash.style.opacity = '1'; setTimeout(() => flash.style.opacity = '0', 1200); }
  } catch (e) { notify('❌ Save failed!'); }
}

function loadGameSlot(slot) {
  try {
    const raw = localStorage.getItem(_slotKey(slot));
    if (!raw) return { ok: false, error: 'Slot is empty', compatible: null, migrated: false };
    const parsed = JSON.parse(raw);
    const migrated = migrateSaveObject(parsed, { source: `Slot ${slot}`, strictWorldSize: false });
    if (!migrated.ok) {
      console.warn(migrated.error);
      return {
        ok: false,
        error: migrated.error || 'Migration failed',
        compatible: migrated.compatible ?? null,
        incompatibility: migrated.incompatibility ?? null,
        migrated: false,
      };
    }
    if (migrated.warnings?.length) {
      for (const warning of migrated.warnings) console.warn(`Slot ${slot}: ${warning}`);
    }
    if (migrated.compatible === false && migrated.incompatibility) {
      console.warn(`Slot ${slot}: ${migrated.incompatibility} Loading with generated terrain outside saved bounds.`);
    }
    const save = migrated.save;
    applyGameSave(save);
    playtime = save.playtime ?? 0;
    if (migrated.migrated) {
      localStorage.setItem(_slotKey(slot), JSON.stringify(save));
    }
    return {
      ok: true,
      compatible: migrated.compatible !== false,
      incompatibility: migrated.incompatibility ?? null,
      migrated: !!migrated.migrated,
      warnings: migrated.warnings || [],
    };
  } catch (e) {
    console.warn('Load failed', e);
    return { ok: false, error: e?.message || 'Load failed', compatible: null, migrated: false };
  }
}

function deleteSlot(slot) {
  localStorage.removeItem(_slotKey(slot));
}

function getSlotMeta(slot) {
  try {
    const raw = localStorage.getItem(_slotKey(slot));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const migrated = migrateSaveObject(parsed, { source: `Slot ${slot}`, strictWorldSize: false });
    if (!migrated.ok) return null;
    const save = migrated.save;
    if (migrated.migrated) {
      localStorage.setItem(_slotKey(slot), JSON.stringify(save));
    }
    let cropCount = 0;
    if (Array.isArray(save.world)) {
      for (const row of save.world) {
        if (!Array.isArray(row)) continue;
        for (const tile of row) {
          if (tile && typeof tile === 'object' && tile.crop) cropCount++;
        }
      }
    }
    return {
      day: save.day ?? 1,
      coins: save.coins ?? 0,
      season: save.season ?? 0,
      robotCount: save.robots?.length ?? 0,
      cropCount,
      savedAt: save.savedAt ?? null,
      playtime: save.playtime ?? 0,
      archetype: (save.worldGen && typeof save.worldGen.archetype === 'string') ? save.worldGen.archetype : null,
      compatible: migrated.compatible !== false,
      incompatibility: migrated.incompatibility ?? null,
    };
  } catch { return null; }
}
