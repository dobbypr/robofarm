/* @generated from src-ts/loop.ts — run npm run build:ts */
// @ts-nocheck
/* ═══════════════════════════════════════════════════════════════════════════
 * GAME LOOP
 * ═══════════════════════════════════════════════════════════════════════════ */
const _loopGetEl = RF_UTIL.getEl;
function _showDayBanner() {
    if (S.display.showDayBanner === false)
        return;
    const bannerEl = _loopGetEl('day-banner');
    const textEl = _loopGetEl('day-banner-text');
    const subEl = _loopGetEl('day-banner-sub');
    if (!bannerEl || !textEl || !subEl)
        return;
    textEl.textContent = `Day ${day}`;
    const weatherText = (typeof getWeatherSummary === 'function') ? getWeatherSummary() : (rainDay ? '🌧 Rain' : '☀️ Clear');
    subEl.textContent = `${SEASONS[season]} • ${weatherText}`;
    bannerEl.classList.add('show');
    setTimeout(() => bannerEl.classList.remove('show'), 2500);
}
function _vehicleClear(px, py) {
    const halfW = TILE * 0.5, halfH = TILE * 0.35;
    const cx = px + TILE / 2, cy = py + TILE / 2;
    const cosA = Math.cos(vehicle.angle), sinA = Math.sin(vehicle.angle);
    const offsets = [
        { x: cosA * halfW - sinA * halfH, y: sinA * halfW + cosA * halfH },
        { x: cosA * halfW + sinA * halfH, y: sinA * halfW - cosA * halfH },
        { x: -cosA * halfW - sinA * halfH, y: -sinA * halfW + cosA * halfH },
        { x: -cosA * halfW + sinA * halfH, y: -sinA * halfW - cosA * halfH },
    ];
    for (const o of offsets) {
        const tx = Math.floor((cx + o.x) / TILE), ty = Math.floor((cy + o.y) / TILE);
        if (!inBounds(tx, ty))
            return false;
        const t = world[ty][tx].type;
        if (t === 'water' || t === 'tree' || t === 'rock')
            return false;
    }
    return true;
}
function _nudgeVehicleClear() {
    if (_vehicleClear(vehicle.px, vehicle.py))
        return;
    for (let r = 1; r <= 6; r++) {
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (Math.abs(dx) !== r && Math.abs(dy) !== r)
                    continue;
                const testPx = vehicle.px + dx * TILE;
                const testPy = vehicle.py + dy * TILE;
                if (_vehicleClear(testPx, testPy)) {
                    vehicle.px = testPx;
                    vehicle.py = testPy;
                    return;
                }
            }
        }
    }
}
function _resetVehicleRuntimeState() {
    vehicle.drifting = false;
    vehicle.handbrake = false;
    vehicle.throttleInput = 0;
    vehicle.steerInput = 0;
    vehicle.turboCharge = 0;
    vehicle.turboTimer = 0;
    vehicle.turboReady = false;
    vehicle.wasHandbrake = false;
}
function update() {
    if (gameState !== 'playing') {
        if (typeof updateAmbient === 'function')
            updateAmbient();
        if (typeof updateWeatherState === 'function')
            updateWeatherState();
        animTime++;
        return;
    }
    playtime++;
    // Vehicle enter/exit
    if (consumeActionPress('vehicleToggle')) {
        if (vehicle.occupied) {
            vehicle.occupied = false;
            vehicle.speed = 0;
            _resetVehicleRuntimeState();
            player.px = vehicle.px + TILE;
            player.py = vehicle.py;
            player.tileX = Math.floor((player.px + TILE / 2) / TILE);
            player.tileY = Math.floor((player.py + TILE / 2) / TILE);
            if (!isWalkable(player.tileX, player.tileY)) {
                player.px = vehicle.px;
                player.py = vehicle.py;
                player.tileX = Math.floor((vehicle.px + TILE / 2) / TILE);
                player.tileY = Math.floor((vehicle.py + TILE / 2) / TILE);
            }
        }
        else {
            const distX = Math.abs(player.px - vehicle.px);
            const distY = Math.abs(player.py - vehicle.py);
            if (distX < TILE * 2 && distY < TILE * 2) {
                vehicle.occupied = true;
                vehicle.speed = 0;
                vehicle.moveAngle = vehicle.angle;
                _resetVehicleRuntimeState();
                _nudgeVehicleClear();
            }
        }
    }
    if (vehicle.occupied) {
        // ─── DRIVING PHYSICS ───
        const vc = S.vehicle;
        const maxSpdBase = vc.maxSpeed * TILE / 60;
        const revMax = vc.reverseMaxSpeed * TILE / 60;
        let throttle = 0, steer = 0;
        if (isActionDown('moveUp', ['KeyW', 'ArrowUp']))
            throttle = 1;
        if (isActionDown('moveDown', ['KeyS', 'ArrowDown']))
            throttle = -1;
        if (isActionDown('moveLeft', ['KeyA', 'ArrowLeft']))
            steer = -1;
        if (isActionDown('moveRight', ['KeyD', 'ArrowRight']))
            steer = 1;
        vehicle.handbrake = !!(keys['ShiftLeft'] || keys['ShiftRight']);
        const handbrakeDown = vehicle.handbrake;
        // Smooth digital input for less jerky handling.
        const throttleResponse = Math.max(0.01, vc.throttleResponse ?? 0.22);
        const steerResponse = Math.max(0.01, vc.steerResponse ?? 0.3);
        vehicle.throttleInput += (throttle - vehicle.throttleInput) * throttleResponse;
        vehicle.steerInput += (steer - vehicle.steerInput) * steerResponse;
        if (Math.abs(vehicle.throttleInput) < 0.01)
            vehicle.throttleInput = 0;
        if (Math.abs(vehicle.steerInput) < 0.01)
            vehicle.steerInput = 0;
        // Drift charge builds turbo while handbraking + steering at speed.
        const speedAbsStart = Math.abs(vehicle.speed);
        const speedNormStart = Math.min(1, speedAbsStart / Math.max(maxSpdBase, 0.0001));
        const turboCharging = handbrakeDown
            && vehicle.speed > maxSpdBase * 0.08
            && Math.abs(vehicle.steerInput) > 0.2;
        if (turboCharging) {
            const chargeGain = (vc.turboChargeRate ?? 0.018) * (0.55 + speedNormStart * 0.7);
            vehicle.turboCharge = Math.min(1, vehicle.turboCharge + chargeGain);
        }
        else {
            const decayMul = handbrakeDown ? 0.2 : (vehicle.turboTimer > 0 ? 0.35 : 1);
            const chargeDecay = (vc.turboDecay ?? 0.004) * decayMul;
            vehicle.turboCharge = Math.max(0, vehicle.turboCharge - chargeDecay);
        }
        vehicle.turboReady = vehicle.turboCharge >= 1;
        const releasedHandbrake = vehicle.wasHandbrake && !handbrakeDown;
        const minCharge = Math.max(0.05, Math.min(1, vc.turboMinCharge ?? 0.35));
        if (releasedHandbrake && vehicle.turboCharge >= minCharge && vehicle.speed > maxSpdBase * 0.08) {
            const chargeFactor = Math.min(1, vehicle.turboCharge);
            const duration = Math.max(1, Math.round((vc.turboDuration ?? 22) * (0.6 + chargeFactor * 0.8)));
            const kick = (vc.turboAccel ?? 0.04) * (0.8 + chargeFactor * 0.7);
            vehicle.turboTimer = Math.max(vehicle.turboTimer, duration);
            vehicle.speed += kick;
            vehicle.turboCharge = 0;
            vehicle.turboReady = false;
        }
        vehicle.wasHandbrake = handbrakeDown;
        const turboActive = vehicle.turboTimer > 0;
        const turboSpeedMul = turboActive ? Math.max(1, vc.turboSpeedMul ?? 1.32) : 1;
        const maxSpd = maxSpdBase * turboSpeedMul;
        // Acceleration / braking with speed curve.
        if (vehicle.throttleInput > 0.02) {
            const accelCurve = 1 - Math.min(1, Math.abs(vehicle.speed) / Math.max(maxSpd, 0.0001)) * 0.45;
            let accelStep = vc.acceleration * accelCurve * vehicle.throttleInput;
            if (turboActive)
                accelStep += (vc.turboAccel ?? 0.04) * 0.45;
            vehicle.speed = Math.min(maxSpd, vehicle.speed + accelStep);
        }
        else if (vehicle.throttleInput < -0.02) {
            const brakeInput = Math.abs(vehicle.throttleInput);
            if (vehicle.speed > 0.05) {
                vehicle.speed = Math.max(0, vehicle.speed - vc.brakeForce * (1 + brakeInput * 0.4));
            }
            else {
                vehicle.speed = Math.max(-revMax, vehicle.speed - (vc.acceleration * 0.65 * brakeInput));
            }
        }
        // Rolling drag + handbrake slip.
        let frictionMul = vc.friction;
        if (Math.abs(vehicle.throttleInput) < 0.05)
            frictionMul *= 0.992;
        if (handbrakeDown)
            frictionMul *= vc.handbrakeGrip;
        if (turboActive)
            frictionMul = Math.min(0.996, frictionMul + 0.004);
        vehicle.speed *= frictionMul;
        vehicle.speed = Math.max(-revMax, Math.min(maxSpd, vehicle.speed));
        const speedAbs = Math.abs(vehicle.speed);
        const speedNorm = Math.min(1, speedAbs / Math.max(maxSpdBase, 0.0001));
        // Steering keeps low-speed control while scaling up with speed.
        const lowSpeedAssist = Math.max(0.08, Math.min(1, vc.lowSpeedTurnAssist ?? 0.34));
        const steerScale = lowSpeedAssist + (1 - lowSpeedAssist) * speedNorm;
        let turnStep = vc.turnRate * steerScale * vehicle.steerInput;
        if (handbrakeDown)
            turnStep *= Math.max(1, vc.driftTurnBoost ?? 1.28);
        if (vehicle.speed < -0.04)
            turnStep *= -0.75;
        vehicle.angle += turnStep;
        // Drift: movement heading trails facing heading based on grip state.
        let angleDiff = vehicle.angle - vehicle.moveAngle;
        while (angleDiff > Math.PI)
            angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI)
            angleDiff += Math.PI * 2;
        const baseDrift = vc.driftFactor;
        const handbrakeDrift = Math.max(0.56, baseDrift - 0.28);
        const targetDrift = handbrakeDown ? handbrakeDrift : baseDrift;
        const driftResponse = (1 - targetDrift) * (0.5 + speedNorm * 0.45);
        vehicle.moveAngle += angleDiff * driftResponse;
        vehicle.drifting = Math.abs(angleDiff) > 0.13 && speedAbs > maxSpdBase * 0.22;
        // Movement
        const moveX = Math.cos(vehicle.moveAngle) * vehicle.speed;
        const moveY = Math.sin(vehicle.moveAngle) * vehicle.speed;
        const newVPx = vehicle.px + moveX;
        const newVPy = vehicle.py + moveY;
        // Collision — axis-sliding: try full, then X-only, then Y-only
        let movedX = false, movedY = false;
        if (_vehicleClear(newVPx, newVPy)) {
            vehicle.px = newVPx;
            vehicle.py = newVPy;
            movedX = movedY = true;
        }
        else if (_vehicleClear(newVPx, vehicle.py)) {
            vehicle.px = newVPx;
            movedX = true;
            vehicle.speed *= 0.72;
            vehicle.turboTimer = Math.floor(vehicle.turboTimer * 0.5);
        }
        else if (_vehicleClear(vehicle.px, newVPy)) {
            vehicle.py = newVPy;
            movedY = true;
            vehicle.speed *= 0.72;
            vehicle.turboTimer = Math.floor(vehicle.turboTimer * 0.5);
        }
        else {
            // Fully blocked — stop cleanly, no bounce
            vehicle.speed = 0;
            vehicle.turboTimer = 0;
            vehicle.turboCharge = Math.max(0, vehicle.turboCharge - 0.15);
        }
        if (movedX || movedY) {
            // Destroy crops the car drives over
            const centerTx = Math.floor((vehicle.px + TILE / 2) / TILE);
            const centerTy = Math.floor((vehicle.py + TILE / 2) / TILE);
            for (let dy = -1; dy <= 0; dy++) {
                for (let dx = -1; dx <= 0; dx++) {
                    const cx = centerTx + dx, cy = centerTy + dy;
                    if (inBounds(cx, cy) && world[cy][cx].crop) {
                        world[cy][cx].crop = null;
                        if (typeof markTileDirty === 'function')
                            markTileDirty(cx, cy);
                        if (typeof spawnParticles === 'function')
                            spawnParticles(cx * TILE + TILE / 2, cy * TILE + TILE / 2, 'dirt', 4);
                    }
                }
            }
            // Dust particles while driving
            if (Math.abs(vehicle.speed) > maxSpdBase * 0.16 && animTime % (turboActive ? 2 : 3) === 0) {
                if (typeof spawnDrivingDust === 'function') {
                    spawnDrivingDust(vehicle.px - Math.cos(vehicle.angle) * TILE * 0.4, vehicle.py - Math.sin(vehicle.angle) * TILE * 0.4);
                }
            }
        }
        // Sync player position to vehicle
        player.px = vehicle.px;
        player.py = vehicle.py;
        player.tileX = Math.floor((vehicle.px + TILE / 2) / TILE);
        player.tileY = Math.floor((vehicle.py + TILE / 2) / TILE);
        player.moving = Math.abs(vehicle.speed) > 0.35;
        if (Math.abs(vehicle.speed) < 0.03)
            vehicle.speed = 0;
        if (vehicle.turboTimer > 0)
            vehicle.turboTimer--;
    }
    else {
        // ─── WALKING ───
        let dx = 0, dy = 0;
        if (isActionDown('moveUp', ['KeyW', 'ArrowUp']))
            dy = -1;
        if (isActionDown('moveDown', ['KeyS', 'ArrowDown']))
            dy = 1;
        if (isActionDown('moveLeft', ['KeyA', 'ArrowLeft']))
            dx = -1;
        if (isActionDown('moveRight', ['KeyD', 'ArrowRight']))
            dx = 1;
        const speed = S.player.speed * TILE / 60;
        const newPx = player.px + dx * speed, newPy = player.py + dy * speed;
        const ntx = Math.floor((newPx + TILE / 2) / TILE), nty = Math.floor((newPy + TILE / 2) / TILE);
        if (isWalkable(ntx, nty)) {
            player.px = Math.max(0, Math.min(newPx, (WW - 1) * TILE));
            player.py = Math.max(0, Math.min(newPy, (WH - 1) * TILE));
            player.tileX = Math.floor((player.px + TILE / 2) / TILE);
            player.tileY = Math.floor((player.py + TILE / 2) / TILE);
        }
        player.moving = (dx !== 0 || dy !== 0);
        if (player.moving) {
            if (dx !== 0)
                player.facingX = dx;
            if (dy !== 0)
                player.facingY = dy;
            player.frameTimer++;
            if (player.frameTimer > 8) {
                player.frame = (player.frame + 1) % 4;
                player.frameTimer = 0;
            }
        }
    }
    // One-press interact to use tool (disabled while driving)
    if (!vehicle.occupied && consumeActionPress('interact')) {
        const fx = player.tileX + player.facingX, fy = player.tileY + player.facingY;
        if (inBounds(fx, fy))
            handleTileClick(fx, fy, {});
    }
    // Camera follow
    const targetX = W / 2 - (player.px + TILE / 2) * camera.zoom;
    const targetY = H / 2 - (player.py + TILE / 2) * camera.zoom;
    const smooth = S.display.cameraSmooth;
    camera.x += (targetX - camera.x) * smooth;
    camera.y += (targetY - camera.y) * smooth;
    // Day/time
    tick++;
    if (tick >= TPDAY) {
        tick = 0;
        day++;
        const prevSeason = season;
        season = Math.floor((day - 1) / S.time.seasonLength) % SEASONS.length;
        if (typeof rollDailyWeather === 'function')
            rollDailyWeather(SEASONS[season]);
        else {
            rainDay = Math.random() < (S.time.rainChance[SEASONS[season]] || 0.2);
            isRaining = rainDay;
        }
        refreshPrices();
        onNewDay();
        const regrown = (typeof applyDailyWorldEcology === 'function') ? applyDailyWorldEcology() : 0;
        let seasonEvent = null;
        if (season !== prevSeason && typeof applySeasonWorldEvent === 'function') {
            seasonEvent = applySeasonWorldEvent(SEASONS[season]);
        }
        if (currentSlot > 0 && !autosaveBlocked)
            saveGame(currentSlot);
        _showDayBanner();
        setTimeout(() => { if (typeof showGazette === 'function')
            showGazette(); }, 3000);
        if (season !== prevSeason)
            notify(`🌿 Season changed to ${SEASONS[season]}!`);
        if (seasonEvent && seasonEvent.changed > 0) {
            notify(`🌎 ${seasonEvent.name}: ${seasonEvent.changed} tiles shifted.`);
        }
        if (regrown > 0 && day % 3 === 0) {
            notify(`🌱 Wilderness regrowth touched ${regrown} tiles.`);
        }
        if (weatherType === 'rain')
            notify('🌧 Rain today: crops will be watered automatically.');
        else if (weatherType === 'thunder')
            notify('⛈️ Thunderstorm today: crops are watered and growth gets a small boost.');
        else if (weatherType === 'snow')
            notify('❄️ Snowfall today: growth slows while fields stay cold.');
        else if (weatherType === 'hail')
            notify('🧊 Hailstorm today: crops are watered, but growth is a bit slower.');
    }
    if (typeof updateWeatherState === 'function')
        updateWeatherState();
    updateCrops();
    updateRobots();
    updateParticles();
    updateUI(false);
    animTime++;
}
