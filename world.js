/* ═══════════════════════════════════════════════════════════════════════════
 * WORLD GENERATION
 * ═══════════════════════════════════════════════════════════════════════════ */
let world = [];

function createTile(type) {
  return { type, crop: null, watered: false, variant: 0, animOffset: 0 };
}

function inBounds(x, y) { return x >= 0 && y >= 0 && x < WW && y < WH; }
function isTillableTile(tile) { return tile.type === 'grass' || tile.type === 'flower'; }

function generateWorld() {
  world = [];
  for (let y = 0; y < WH; y++) { world[y] = []; for (let x = 0; x < WW; x++) world[y][x] = createTile('grass'); }

  // Tree noise layer
  for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) {
    const n = valueNoise(x, y, 6);
    const edgeDist = Math.min(x, y, WW - 1 - x, WH - 1 - y);
    const edgeBias = edgeDist < 5 ? (5 - edgeDist) / 5 : 0;
    if (n + edgeBias * 0.4 > (1 - S.world.treeFrequency)) {
      world[y][x].type = 'tree'; world[y][x].variant = Math.floor(tileRnd(x, y, 0) * 3);
    }
  }

  // Rocks
  for (let y = 1; y < WH - 1; y++) for (let x = 1; x < WW - 1; x++) {
    if (world[y][x].type === 'grass' && tileRnd(x, y, 1) < S.world.rockFrequency) world[y][x].type = 'rock';
  }

  // Wildflowers
  for (let y = 1; y < WH - 1; y++) for (let x = 1; x < WW - 1; x++) {
    if (world[y][x].type === 'grass' && tileRnd(x, y, 2) < S.world.flowerFrequency) {
      world[y][x].type = 'flower'; world[y][x].variant = Math.floor(tileRnd(x, y, 3) * 5);
    }
  }

  // Rivers
  const riverRng = mkRng(S.world.seed + 100);
  for (let r = 0; r < S.world.riverCount; r++) {
    const startEdge = Math.floor(riverRng() * 4);
    let rx, ry, dirX, dirY;
    if (startEdge === 0) { rx = Math.floor(riverRng() * WW); ry = 0; dirX = 0; dirY = 1; }
    else if (startEdge === 1) { rx = WW - 1; ry = Math.floor(riverRng() * WH); dirX = -1; dirY = 0; }
    else if (startEdge === 2) { rx = Math.floor(riverRng() * WW); ry = WH - 1; dirX = 0; dirY = -1; }
    else { rx = 0; ry = Math.floor(riverRng() * WH); dirX = 1; dirY = 0; }

    for (let step = 0; step < WW + WH; step++) {
      if (!inBounds(rx, ry)) break;
      for (let w = -1; w <= 1; w++) {
        const wx = rx + (dirY !== 0 ? w : 0), wy = ry + (dirX !== 0 ? w : 0);
        if (inBounds(wx, wy)) world[wy][wx].type = 'water';
      }
      const turn = riverRng();
      if (turn < 0.3) { rx += dirX; if (dirX === 0) rx += (riverRng() < 0.5 ? -1 : 1); else ry += (riverRng() < 0.5 ? -1 : 1); }
      else { rx += dirX; ry += dirY; }
      if (riverRng() < 0.15) { const tmp = dirX; dirX = dirY * (riverRng() < 0.5 ? 1 : -1); dirY = tmp * (riverRng() < 0.5 ? 1 : -1); }
    }
  }

  // Ponds
  const pondRng = mkRng(S.world.seed + 200);
  for (let p = 0; p < S.world.pondCount; p++) {
    const px = 5 + Math.floor(pondRng() * (WW - 10));
    const py = 5 + Math.floor(pondRng() * (WH - 10));
    const size = 2 + Math.floor(pondRng() * 4);
    for (let dy = -size; dy <= size; dy++) for (let dx = -size; dx <= size; dx++) {
      if (dx * dx + dy * dy <= size * size * (0.6 + pondRng() * 0.4) && inBounds(px + dx, py + dy))
        world[py + dy][px + dx].type = 'water';
    }
  }

  // Clear farm zone
  const fz = S.world;
  for (let y = fz.farmZoneY; y < fz.farmZoneY + fz.farmZoneH; y++)
    for (let x = fz.farmZoneX; x < fz.farmZoneX + fz.farmZoneW; x++)
      if (inBounds(x, y)) world[y][x] = createTile('grass');

  // Assign anim offsets
  for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++)
    world[y][x].animOffset = tileRnd(x, y, 9) * Math.PI * 2;
}
