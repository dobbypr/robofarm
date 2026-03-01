/* ═══════════════════════════════════════════════════════════════════════════
 * ROBO FARM — MAIN GAME
 * ═══════════════════════════════════════════════════════════════════════════ */

const S = window.GAME_SETTINGS;
const TILE = S.world.tileSize;
const WW = S.world.width;
const WH = S.world.height;

/* ─── SEEDED RNG ─── */
function mkRng(seed) {
  let s = seed >>> 0;
  return () => { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
}
const worldRng = mkRng(S.world.seed);

/* ─── HASH HELPERS ─── */
function hash2(x, y) { let h = (x * 374761393 + y * 668265263) >>> 0; h = ((h ^ (h >> 13)) * 1274126177) >>> 0; return (h >>> 0) / 4294967296; }
function tileRnd(x, y, i) { return hash2(x * 7 + i, y * 13 + i * 3); }

/* ─── VALUE NOISE ─── */
function smoothstep(t) { return t * t * (3 - 2 * t); }
function lerp(a, b, t) { return a + (b - a) * t; }
function valueNoise(x, y, scale) {
  const ix = Math.floor(x / scale), iy = Math.floor(y / scale);
  const fx = (x / scale) - ix, fy = (y / scale) - iy;
  const tx = smoothstep(fx), ty = smoothstep(fy);
  return lerp(lerp(hash2(ix, iy), hash2(ix + 1, iy), tx), lerp(hash2(ix, iy + 1), hash2(ix + 1, iy + 1), tx), ty);
}

