/* ═══════════════════════════════════════════════════════════════════════════
 * ROBO FARM — MAIN GAME
 * ═══════════════════════════════════════════════════════════════════════════ */

const S = window.GAME_SETTINGS;
const _rngUtil = window.RF_UTIL;
const _rngToInt = _rngUtil?.toInt || ((v, d = 0) => Math.floor(Number(v) || d));
const TILE = S.world.tileSize;
const WW = S.world.width;
const WH = S.world.height;
let currentWorldSeed = (_rngToInt(S.world.seed, 0) >>> 0);

/* ─── SEEDED RNG ─── */
function mkRng(seed) {
  let s = seed >>> 0;
  return () => { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
}
function setWorldSeed(seed) { currentWorldSeed = (_rngToInt(seed, 0) >>> 0); }
function getWorldSeed() { return currentWorldSeed >>> 0; }

/* ─── HASH HELPERS ─── */
function hash2Seeded(x, y, seedSalt = 0) {
  const s = (getWorldSeed() + (seedSalt >>> 0) * 374761393) >>> 0;
  let h = (x * 374761393 + y * 668265263 + s * 2246822519) >>> 0;
  h = ((h ^ (h >> 13)) * 1274126177) >>> 0;
  h ^= h >> 16;
  return (h >>> 0) / 4294967296;
}
function tileRndSeeded(x, y, i = 0, seedSalt = 0) {
  return hash2Seeded(x * 7 + i, y * 13 + i * 3, seedSalt);
}
function hash2(x, y) { return hash2Seeded(x, y, 0); }
function tileRnd(x, y, i) { return tileRndSeeded(x, y, i, 0); }

/* ─── VALUE NOISE ─── */
function smoothstep(t) { return t * t * (3 - 2 * t); }
function lerp(a, b, t) { return a + (b - a) * t; }
function valueNoiseSeeded(x, y, scale, seedSalt = 0) {
  const ix = Math.floor(x / scale), iy = Math.floor(y / scale);
  const fx = (x / scale) - ix, fy = (y / scale) - iy;
  const tx = smoothstep(fx), ty = smoothstep(fy);
  return lerp(
    lerp(hash2Seeded(ix, iy, seedSalt), hash2Seeded(ix + 1, iy, seedSalt), tx),
    lerp(hash2Seeded(ix, iy + 1, seedSalt), hash2Seeded(ix + 1, iy + 1, seedSalt), tx),
    ty
  );
}
function valueNoise(x, y, scale) { return valueNoiseSeeded(x, y, scale, 0); }
