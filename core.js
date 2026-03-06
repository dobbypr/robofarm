/* ═══════════════════════════════════════════════════════════════════════════
 * CORE UTILITIES
 * Shared helpers to keep cross-file logic short, consistent, and safe.
 * ═══════════════════════════════════════════════════════════════════════════ */
(function initCoreUtils(global) {
  if (!global || global.RF_UTIL) return;

  function toNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : (fallback ?? 0);
  }

  function toInt(value, fallback) {
    return Math.floor(toNumber(value, fallback ?? 0));
  }

  function clamp(value, min, max) {
    if (min > max) {
      const tmp = min;
      min = max;
      max = tmp;
    }
    return Math.max(min, Math.min(max, value));
  }

  function clampInt(value, min, max, fallback) {
    return Math.floor(clamp(toNumber(value, fallback ?? min), min, max));
  }

  function safeObject(value) {
    return value && typeof value === 'object' ? value : {};
  }

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function getEl(id) {
    if (typeof document === 'undefined') return null;
    return document.getElementById(id);
  }

  function getRobotById(id, source) {
    const list = Array.isArray(source) ? source : safeArray(global.robots);
    for (let i = 0; i < list.length; i++) {
      if (list[i] && list[i].id === id) return list[i];
    }
    return null;
  }

  function getRobotAtTile(x, y, source) {
    const list = Array.isArray(source) ? source : safeArray(global.robots);
    for (let i = 0; i < list.length; i++) {
      const bot = list[i];
      if (!bot) continue;
      if (bot.tileX === x && bot.tileY === y) return bot;
    }
    return null;
  }

  function normalizeCropType(type, crops) {
    const defs = safeObject(crops || global.GAME_SETTINGS?.crops || global.S?.crops);
    if (typeof type !== 'string') return null;
    return defs[type] ? type : null;
  }

  function eachTile(world, width, height, fn) {
    for (let y = 0; y < height; y++) {
      const row = world[y];
      if (!Array.isArray(row)) continue;
      for (let x = 0; x < width; x++) fn(row[x], x, y);
    }
  }

  global.RF_UTIL = Object.freeze({
    toNumber,
    toInt,
    clamp,
    clampInt,
    safeObject,
    safeArray,
    getEl,
    getRobotById,
    getRobotAtTile,
    normalizeCropType,
    eachTile,
  });
})(typeof window !== 'undefined' ? window : globalThis);
