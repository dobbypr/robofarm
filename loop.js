/* ═══════════════════════════════════════════════════════════════════════════
 * GAME LOOP
 * ═══════════════════════════════════════════════════════════════════════════ */
function update() {
  if (gameState !== 'playing') return;

  playtime++;

  // Player movement
  let dx = 0, dy = 0;
  if (keys['KeyW'] || keys['ArrowUp']) dy = -1;
  if (keys['KeyS'] || keys['ArrowDown']) dy = 1;
  if (keys['KeyA'] || keys['ArrowLeft']) dx = -1;
  if (keys['KeyD'] || keys['ArrowRight']) dx = 1;

  const speed = S.player.speed * TILE / 60;
  const newPx = player.px + dx * speed, newPy = player.py + dy * speed;
  const ntx = Math.floor((newPx + TILE/2) / TILE), nty = Math.floor((newPy + TILE/2) / TILE);

  if (isWalkable(ntx, nty)) {
    player.px = Math.max(0, Math.min(newPx, (WW - 1) * TILE));
    player.py = Math.max(0, Math.min(newPy, (WH - 1) * TILE));
    player.tileX = Math.floor((player.px + TILE/2) / TILE);
    player.tileY = Math.floor((player.py + TILE/2) / TILE);
  }

  player.moving = (dx !== 0 || dy !== 0);
  if (player.moving) {
    if (dx !== 0) player.facingX = dx;
    if (dy !== 0) player.facingY = dy;
    player.frameTimer++;
    if (player.frameTimer > 8) { player.frame = (player.frame + 1) % 4; player.frameTimer = 0; }
  }

  // Space to use tool
  if (keys['Space']) {
    keys['Space'] = false;
    const fx = player.tileX + player.facingX, fy = player.tileY + player.facingY;
    if (inBounds(fx, fy)) handleTileClick(fx, fy, {});
  }

  // Camera follow
  const targetX = W/2 - (player.px + TILE/2) * camera.zoom;
  const targetY = H/2 - (player.py + TILE/2) * camera.zoom;
  const smooth = S.display.cameraSmooth;
  camera.x += (targetX - camera.x) * smooth;
  camera.y += (targetY - camera.y) * smooth;

  // Day/time
  tick++;
  if (tick >= TPDAY) {
    tick = 0; day++;
    const prevSeason = season;
    season = Math.floor((day - 1) / S.time.seasonLength) % SEASONS.length;
    rainDay = Math.random() < (S.time.rainChance[SEASONS[season]] || 0.2);
    refreshPrices();
    onNewDay();
    if (currentSlot > 0) saveGame(currentSlot);

    const bannerEl = document.getElementById('day-banner');
    document.getElementById('day-banner-text').textContent = `Day ${day}`;
    document.getElementById('day-banner-sub').textContent = `${SEASONS[season]} • ${rainDay ? '🌧 Rainy Day' : '☀️ Clear Day'}`;
    bannerEl.classList.add('show');
    setTimeout(() => bannerEl.classList.remove('show'), 2500);

    if (season !== prevSeason) notify(`🌿 Season changed to ${SEASONS[season]}!`);
    if (rainDay) notify(`🌧 It's raining! Crops will be watered today.`);
  }

  updateCrops();
  updateRobots();
  updateParticles();
  updateUI();
  animTime++;
}
