/* @generated from src-ts/menu.ts — run npm run build:ts */
// @ts-nocheck
/* ═══════════════════════════════════════════════════════════════════════════
 * MENU SCREEN
 * ═══════════════════════════════════════════════════════════════════════════ */
/* ─── Menu state ─── */
const MENU_FLOW = {
    view: 'main',
    slotMode: 'new',
    settingsDirty: false,
    pendingViewAfterSettings: null,
    pendingOverwriteSlot: null,
    transitionLock: false,
};
let menuPauseMode = false;
let ambientActive = false;
let MENU_SETTINGS_DRAFT = null;
let MENU_SETTINGS_SNAPSHOT = null;
let MENU_WORLD_DRAFT = null;
let MENU_WORLD_SETTINGS_DEFAULTS = null;
let MENU_WORLD_ARCHETYPES_CACHE = null;
const MENU_WORLD_SLIDERS = [
    { key: 'treeDensity', label: 'Tree Density' },
    { key: 'rockDensity', label: 'Rock Density' },
    { key: 'pondSize', label: 'Pond Size' },
    { key: 'riverWidth', label: 'River Width' },
    { key: 'waterSpread', label: 'Water Spread' },
];
function _menuClampNumber(value, min, max) {
    if (!Number.isFinite(value))
        return min;
    return Math.max(min, Math.min(max, value));
}
function _menuLerp(min, max, t) {
    return min + (max - min) * t;
}
function _menuPercentFromRange(value, min, max) {
    const clamped = _menuClampNumber(value, min, max);
    return Math.round(((clamped - min) / (max - min)) * 100);
}
function _menuRangeFromPercent(percent, min, max) {
    const t = _menuClampNumber(percent, 0, 100) / 100;
    return _menuLerp(min, max, t);
}
function _menuSnapshotWorldSettings() {
    const src = S.world || {};
    const treeFrequency = _menuClampNumber(Number(src.treeFrequency), 0.01, 0.25);
    const rockFrequency = _menuClampNumber(Number(src.rockFrequency), 0.001, 0.06);
    const flowerFrequency = _menuClampNumber(Number(src.flowerFrequency), 0.01, 0.14);
    const pondCount = Math.max(1, Math.min(12, Math.round(Number(src.pondCount) || 4)));
    const riverCount = Math.max(0, Math.min(8, Math.round(Number(src.riverCount) || 2)));
    const pondSizeRaw = Number(src.pondSize);
    const riverWidthRaw = Number(src.riverWidth);
    const waterSpreadRaw = Number(src.waterSpread);
    const pondSize = Number.isFinite(pondSizeRaw) ? _menuClampNumber(pondSizeRaw, 0, 1) : _menuClampNumber((pondCount - 1) / 11, 0, 1);
    const riverWidth = Number.isFinite(riverWidthRaw) ? _menuClampNumber(riverWidthRaw, 0, 1) : _menuClampNumber(riverCount / 8, 0, 1);
    const waterSpread = Number.isFinite(waterSpreadRaw)
        ? _menuClampNumber(waterSpreadRaw, 0, 1)
        : _menuClampNumber((pondSize + riverWidth) / 2, 0, 1);
    return {
        treeFrequency,
        rockFrequency,
        flowerFrequency,
        pondCount,
        riverCount,
        pondSize,
        riverWidth,
        waterSpread,
        defaultArchetype: typeof src.defaultArchetype === 'string' ? src.defaultArchetype : 'balanced',
    };
}
function _menuGetWorldSettingsDefaults() {
    if (!MENU_WORLD_SETTINGS_DEFAULTS)
        MENU_WORLD_SETTINGS_DEFAULTS = _menuSnapshotWorldSettings();
    return { ...MENU_WORLD_SETTINGS_DEFAULTS };
}
function _menuApplyWorldSettings(settings) {
    const next = settings && typeof settings === 'object' ? settings : _menuGetWorldSettingsDefaults();
    S.world.treeFrequency = _menuClampNumber(Number(next.treeFrequency), 0.01, 0.25);
    S.world.rockFrequency = _menuClampNumber(Number(next.rockFrequency), 0.001, 0.06);
    S.world.flowerFrequency = _menuClampNumber(Number(next.flowerFrequency), 0.01, 0.14);
    S.world.pondCount = Math.max(1, Math.min(12, Math.round(Number(next.pondCount) || 4)));
    S.world.riverCount = Math.max(0, Math.min(8, Math.round(Number(next.riverCount) || 2)));
    S.world.pondSize = _menuClampNumber(Number(next.pondSize), 0, 1);
    S.world.riverWidth = _menuClampNumber(Number(next.riverWidth), 0, 1);
    S.world.waterSpread = _menuClampNumber(Number(next.waterSpread), 0, 1);
    S.world.treeClusterCount = Math.max(0, Math.round(S.world.treeFrequency * 100));
    S.world.stoneDensity = S.world.rockFrequency;
    S.world.flowerDensity = S.world.flowerFrequency;
    if (typeof next.defaultArchetype === 'string' && next.defaultArchetype) {
        S.world.defaultArchetype = next.defaultArchetype;
    }
}
function _menuResetWorldSettingsDefaults() {
    _menuApplyWorldSettings(_menuGetWorldSettingsDefaults());
}
function _menuWorldSettingsToDraftOptions(settings) {
    const src = settings || _menuGetWorldSettingsDefaults();
    return {
        treeDensity: _menuPercentFromRange(Number(src.treeFrequency), 0.01, 0.25),
        rockDensity: _menuPercentFromRange(Number(src.rockFrequency), 0.001, 0.06),
        pondSize: _menuPercentFromRange(Number(src.pondSize), 0, 1),
        riverWidth: _menuPercentFromRange(Number(src.riverWidth), 0, 1),
        waterSpread: _menuPercentFromRange(Number(src.waterSpread), 0, 1),
    };
}
function _menuAdjustWorldOptions(base, delta) {
    const next = {};
    for (const spec of MENU_WORLD_SLIDERS) {
        const key = spec.key;
        const b = Number(base?.[key]) || 0;
        const d = Number(delta?.[key]) || 0;
        next[key] = _menuClampNumber(Math.round(b + d), 0, 100);
    }
    return next;
}
function _menuBuildWorldArchetypes() {
    if (MENU_WORLD_ARCHETYPES_CACHE)
        return MENU_WORLD_ARCHETYPES_CACHE.map(a => ({ ...a, options: { ...a.options } }));
    const balanced = _menuWorldSettingsToDraftOptions(_menuGetWorldSettingsDefaults());
    const notes = {
        balanced: 'Steady terrain mix with moderate water.',
        flatlands: 'Open tillable land and fewer natural blockers.',
        forest_farm: 'Dense woodland edges with strong regrowth pressure.',
        wetlands: 'Broader rivers, larger ponds, and wetter soil.',
        rocky_basin: 'More rocks, tighter routing, drier soil.',
    };
    const ids = (typeof getWorldArchetypeKeys === 'function')
        ? getWorldArchetypeKeys()
        : ['balanced', 'flatlands', 'forest_farm', 'wetlands', 'rocky_basin'];
    if (!ids.includes('balanced'))
        ids.unshift('balanced');
    const list = ids.map((id) => {
        const label = (typeof getWorldArchetypeLabel === 'function')
            ? getWorldArchetypeLabel(id)
            : String(id).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        return {
            id,
            label,
            description: notes[id] || 'Custom terrain profile.',
            options: { ...balanced },
        };
    });
    // Moderate starting offsets per archetype.
    for (const archetype of list) {
        if (archetype.id === 'flatlands') {
            archetype.options = _menuAdjustWorldOptions(balanced, { treeDensity: -24, rockDensity: -20, pondSize: -10, riverWidth: -6, waterSpread: -8 });
        }
        else if (archetype.id === 'forest_farm') {
            archetype.options = _menuAdjustWorldOptions(balanced, { treeDensity: 30, rockDensity: -6, pondSize: -4, riverWidth: 0, waterSpread: 2 });
        }
        else if (archetype.id === 'wetlands') {
            archetype.options = _menuAdjustWorldOptions(balanced, { treeDensity: 6, rockDensity: -12, pondSize: 26, riverWidth: 22, waterSpread: 30 });
        }
        else if (archetype.id === 'rocky_basin') {
            archetype.options = _menuAdjustWorldOptions(balanced, { treeDensity: -18, rockDensity: 32, pondSize: -12, riverWidth: -6, waterSpread: -18 });
        }
    }
    MENU_WORLD_ARCHETYPES_CACHE = list.map(a => ({ ...a, options: { ...a.options } }));
    return list;
}
function _menuGetWorldArchetypeById(id) {
    const archetypes = _menuBuildWorldArchetypes();
    return archetypes.find(a => a.id === id) || archetypes[0];
}
function _menuMakeWorldDraft(archetypeId) {
    const archetype = _menuGetWorldArchetypeById(archetypeId);
    return {
        archetypeId: archetype.id,
        options: { ...archetype.options },
    };
}
function menuResetWorldDraft() {
    const defaults = _menuGetWorldSettingsDefaults();
    const archetype = _menuGetWorldArchetypeById(defaults.defaultArchetype || 'balanced');
    MENU_WORLD_DRAFT = _menuMakeWorldDraft(archetype.id);
    _menuSyncWorldControlsFromDraft();
    return MENU_WORLD_DRAFT;
}
function menuSelectWorldArchetype(id) {
    MENU_WORLD_DRAFT = _menuMakeWorldDraft(id);
    _menuSyncWorldControlsFromDraft();
}
function _menuSyncWorldControlsFromDraft() {
    if (!MENU_WORLD_DRAFT)
        return;
    const archetype = _menuGetWorldArchetypeById(MENU_WORLD_DRAFT.archetypeId);
    document.querySelectorAll('#menu-world-archetype-chips .menu-world-chip').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.archetypeId === archetype.id);
    });
    const note = document.getElementById('menu-world-archetype-note');
    if (note)
        note.textContent = archetype.description;
    for (const spec of MENU_WORLD_SLIDERS) {
        const value = _menuClampNumber(Number(MENU_WORLD_DRAFT.options?.[spec.key]), 0, 100);
        const input = document.getElementById(`menu-world-${spec.key}`);
        const out = document.getElementById(`menu-world-value-${spec.key}`);
        if (input)
            input.value = String(value);
        if (out)
            out.textContent = `${value}%`;
    }
}
function menuBuildWorldControls() {
    const chipWrap = document.getElementById('menu-world-archetype-chips');
    const advanced = document.getElementById('menu-world-advanced');
    const resetBtn = document.getElementById('menu-world-reset-btn');
    if (!chipWrap || !advanced)
        return;
    if (!MENU_WORLD_DRAFT)
        menuResetWorldDraft();
    chipWrap.innerHTML = '';
    for (const archetype of _menuBuildWorldArchetypes()) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'menu-world-chip';
        btn.dataset.archetypeId = archetype.id;
        btn.textContent = archetype.label;
        btn.title = archetype.description;
        btn.onclick = () => menuSelectWorldArchetype(archetype.id);
        chipWrap.appendChild(btn);
    }
    advanced.innerHTML = '';
    for (const spec of MENU_WORLD_SLIDERS) {
        const row = document.createElement('div');
        row.className = 'menu-world-row';
        const label = document.createElement('label');
        label.className = 'menu-world-row-label';
        label.setAttribute('for', `menu-world-${spec.key}`);
        label.textContent = spec.label;
        const value = document.createElement('span');
        value.className = 'menu-world-row-value';
        value.id = `menu-world-value-${spec.key}`;
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.className = 'menu-world-slider';
        slider.id = `menu-world-${spec.key}`;
        slider.min = '0';
        slider.max = '100';
        slider.step = '1';
        slider.oninput = () => {
            if (!MENU_WORLD_DRAFT)
                menuResetWorldDraft();
            const next = _menuClampNumber(Number(slider.value), 0, 100);
            MENU_WORLD_DRAFT.options[spec.key] = next;
            value.textContent = `${next}%`;
        };
        slider.onchange = slider.oninput;
        row.appendChild(label);
        row.appendChild(value);
        row.appendChild(slider);
        advanced.appendChild(row);
    }
    if (resetBtn)
        resetBtn.onclick = menuResetWorldDraft;
    _menuSyncWorldControlsFromDraft();
}
function menuReadWorldControls() {
    if (!MENU_WORLD_DRAFT)
        menuResetWorldDraft();
    for (const spec of MENU_WORLD_SLIDERS) {
        const input = document.getElementById(`menu-world-${spec.key}`);
        if (!input)
            continue;
        MENU_WORLD_DRAFT.options[spec.key] = _menuClampNumber(Number(input.value), 0, 100);
    }
    return MENU_WORLD_DRAFT;
}
function _menuMapWorldDraftToSettings(draft) {
    const src = draft || menuReadWorldControls();
    const opts = src?.options || {};
    const treeDensity = _menuClampNumber(Number(opts.treeDensity), 0, 100);
    const rockDensity = _menuClampNumber(Number(opts.rockDensity), 0, 100);
    const pondSize = _menuClampNumber(Number(opts.pondSize), 0, 100);
    const riverWidth = _menuClampNumber(Number(opts.riverWidth), 0, 100);
    const waterSpread = _menuClampNumber(Number(opts.waterSpread), 0, 100);
    const advanced = {
        treeMultiplier: Number(_menuRangeFromPercent(treeDensity, 0, 2.4).toFixed(3)),
        rockMultiplier: Number(_menuRangeFromPercent(rockDensity, 0, 2.6).toFixed(3)),
        pondSizeMultiplier: Number(_menuRangeFromPercent(pondSize, 0.5, 2.2).toFixed(3)),
        riverWidthBias: Number(_menuRangeFromPercent(riverWidth, -1, 2).toFixed(3)),
        waterSpread: Number(_menuRangeFromPercent(waterSpread, 0.5, 2).toFixed(3)),
    };
    return { advanced };
}
function _menuBuildDefaultWorldProfile() {
    const defaults = _menuGetWorldSettingsDefaults();
    const archetype = _menuGetWorldArchetypeById(defaults.defaultArchetype || 'balanced');
    const mapped = _menuMapWorldDraftToSettings({ archetypeId: archetype.id, options: _menuWorldSettingsToDraftOptions(defaults) });
    return {
        archetype: archetype.id,
        archetypeLabel: archetype.label,
        seed: Math.floor(Number(S.world.seed) || 0),
        advanced: mapped.advanced,
    };
}
function _menuBuildWorldProfilePayload() {
    const draft = menuReadWorldControls();
    const archetype = _menuGetWorldArchetypeById(draft?.archetypeId || 'balanced');
    const mapped = _menuMapWorldDraftToSettings({ archetypeId: archetype.id, options: draft?.options || {} });
    return {
        archetype: archetype.id,
        archetypeLabel: archetype.label,
        seed: Math.floor(Number(S.world.seed) || 0),
        advanced: mapped.advanced,
    };
}
function isMenuVisible() {
    const screen = document.getElementById('menu-screen');
    return !!screen && !screen.classList.contains('hidden');
}
function _menuBeginTransition() {
    if (MENU_FLOW.transitionLock)
        return false;
    MENU_FLOW.transitionLock = true;
    return true;
}
function _menuEndTransition() {
    MENU_FLOW.transitionLock = false;
}
function _menuActivateView(name) {
    document.querySelectorAll('.menu-view').forEach(v => v.classList.remove('active'));
    const el = document.getElementById(`menu-${name}`);
    if (el)
        el.classList.add('active');
}
function menuShowView(name) {
    menuSetView(name);
}
function menuSetView(name, opts = {}) {
    const force = !!opts.force;
    const fromView = MENU_FLOW.view;
    if (!force && fromView === 'settings' && name !== 'settings' && MENU_FLOW.settingsDirty) {
        MENU_FLOW.pendingViewAfterSettings = name;
        MENU_FLOW.view = 'settings-confirm';
        _menuActivateView('settings-confirm');
        menuBuildSettingsConfirm();
        _menuUpdateSettingsHint();
        return;
    }
    MENU_FLOW.view = name;
    if (name === 'new-game')
        MENU_FLOW.slotMode = 'new';
    if (name === 'load-game')
        MENU_FLOW.slotMode = 'load';
    _menuActivateView(name);
    if (name === 'new-game') {
        menuResetWorldDraft();
        menuBuildWorldControls();
        menuBuildSlots('new');
    }
    if (name === 'load-game')
        menuBuildSlots('load');
    if (name === 'settings') {
        if (fromView !== 'settings' && fromView !== 'settings-confirm')
            _menuStartSettingsDraft();
        menuBuildSettings();
        _menuUpdateSettingsHint();
    }
    if (name === 'settings-confirm')
        menuBuildSettingsConfirm();
    _menuFocusFirstAction();
    menuUpdateAmbientStatus();
}
function _menuFocusFirstAction() {
    if (typeof document === 'undefined')
        return;
    const active = document.querySelector('.menu-view.active');
    if (!active)
        return;
    const first = active.querySelector('button:not([disabled])');
    if (!first || first.offsetParent === null)
        return;
    setTimeout(() => {
        try {
            first.focus({ preventScroll: true });
        }
        catch {
            first.focus();
        }
    }, 0);
}
/* ─── Open / close menu overlay ─── */
function openMenu() {
    if (MENU_FLOW.transitionLock)
        return;
    _menuGetWorldSettingsDefaults();
    const screen = document.getElementById('menu-screen');
    screen.classList.remove('hidden', 'fade-out');
    document.body.classList.add('show-system-cursor', 'menu-open');
    if (S.display.menuColorThemes !== false) {
        const tintEl = document.getElementById('menu-tint');
        if (tintEl) {
            tintEl.classList.add('active');
            tintEl.style.backgroundColor = getMenuTint();
        }
    }
    MENU_FLOW.pendingViewAfterSettings = null;
    menuSetView('main', { force: true });
    const wasPlaying = gameState === 'playing';
    if (wasPlaying) {
        menuPauseMode = true;
        gameState = 'menu';
        const continueBtn = document.getElementById('menu-btn-continue');
        if (continueBtn) {
            continueBtn.style.display = 'block';
            continueBtn.innerHTML = '▶&nbsp; BACK TO GAME';
            continueBtn.onclick = resumeGame;
        }
        const newGameBtn = document.getElementById('menu-btn-new-game');
        if (newGameBtn)
            newGameBtn.style.display = 'none';
        const settingsBtn = document.getElementById('menu-btn-settings');
        if (settingsBtn)
            settingsBtn.style.display = '';
        const quitBtn = document.getElementById('menu-btn-quit');
        if (quitBtn) {
            quitBtn.textContent = 'QUIT TO TITLE';
            quitBtn.onclick = menuQuitToTitle;
        }
    }
    else {
        menuPauseMode = false;
        _menuStartSettingsDraft();
        const continueBtn = document.getElementById('menu-btn-continue');
        if (continueBtn) {
            continueBtn.innerHTML = '▶&nbsp; CONTINUE';
            continueBtn.onclick = menuContinue;
        }
        const quitBtn = document.getElementById('menu-btn-quit');
        if (quitBtn) {
            quitBtn.textContent = 'QUIT';
            quitBtn.onclick = menuQuit;
        }
        const newGameBtn = document.getElementById('menu-btn-new-game');
        if (newGameBtn)
            newGameBtn.style.display = '';
        const settingsBtn = document.getElementById('menu-btn-settings');
        if (settingsBtn)
            settingsBtn.style.display = '';
        menuRefreshContinueBtn();
    }
    menuUpdateAmbientStatus();
}
function closeMenu(onClosed) {
    const screen = document.getElementById('menu-screen');
    screen.classList.add('fade-out');
    document.body.classList.remove('menu-open');
    document.getElementById('menu-tint')?.classList.remove('active');
    const newGameBtn = document.getElementById('menu-btn-new-game');
    if (newGameBtn)
        newGameBtn.style.display = '';
    setTimeout(() => {
        screen.classList.add('hidden');
        syncCursorMode();
        if (typeof onClosed === 'function')
            onClosed();
    }, 120);
}
function resumeGame() {
    if (!menuPauseMode)
        return;
    if (!_menuBeginTransition())
        return;
    menuPauseMode = false;
    ambientActive = false;
    gameState = 'playing';
    closeMenu(() => _menuEndTransition());
}
function menuQuitToTitle() {
    if (!_menuBeginTransition())
        return;
    if (!confirm('Quit to title screen? Current game will be saved.')) {
        _menuEndTransition();
        return;
    }
    if (currentSlot > 0)
        saveGame(currentSlot);
    if (typeof closeAllModals === 'function')
        closeAllModals();
    if (typeof cancelAssign === 'function')
        cancelAssign();
    _clearInputLatchState();
    menuPauseMode = false;
    gameState = 'menu';
    initAmbient();
    const continueBtn = document.getElementById('menu-btn-continue');
    if (continueBtn) {
        continueBtn.innerHTML = '▶&nbsp; CONTINUE';
        continueBtn.onclick = menuContinue;
    }
    const quitBtn = document.getElementById('menu-btn-quit');
    if (quitBtn) {
        quitBtn.textContent = 'QUIT';
        quitBtn.onclick = menuQuit;
    }
    const newGameBtn = document.getElementById('menu-btn-new-game');
    if (newGameBtn)
        newGameBtn.style.display = '';
    const settingsBtn = document.getElementById('menu-btn-settings');
    if (settingsBtn)
        settingsBtn.style.display = '';
    menuSetView('main', { force: true });
    menuRefreshContinueBtn();
    _menuEndTransition();
}
function menuQuit() {
    menuShowView('quit');
}
/* ─── Continue button visibility ─── */
function menuRefreshContinueBtn() {
    const btn = document.getElementById('menu-btn-continue');
    if (!btn)
        return;
    if (menuPauseMode) {
        btn.style.display = 'block';
        return;
    }
    const hasSave = [1, 2, 3].some(s => getSlotMeta(s) !== null);
    btn.style.display = hasSave ? 'block' : 'none';
}
function menuContinue() {
    if (menuPauseMode) {
        resumeGame();
        return;
    }
    const saves = [1, 2, 3].filter(s => getSlotMeta(s) !== null);
    if (saves.length === 0) {
        menuShowView('new-game');
    }
    else if (saves.length === 1) {
        launchGame(saves[0], false);
    }
    else {
        menuShowView('load-game');
    }
}
/* ─── Slot card helpers ─── */
function _fmtPlaytime(ticks) {
    const totalSec = Math.floor(ticks / 60);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    if (h > 0)
        return `${h}h ${m}m played`;
    if (m > 0)
        return `${m}m played`;
    return 'just started';
}
function _fmtSavedAt(iso) {
    if (!iso)
        return '';
    try {
        const d = new Date(iso);
        return `Saved ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }
    catch {
        return '';
    }
}
function menuBuildSlots(mode) {
    MENU_FLOW.slotMode = mode;
    const containerId = mode === 'new' ? 'menu-new-slots' : 'menu-load-slots';
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    for (let slot = 1; slot <= 3; slot++) {
        const meta = getSlotMeta(slot);
        const card = document.createElement('div');
        card.className = 'menu-slot-card' + (meta ? '' : ' empty');
        const sizeMismatchLoad = !!meta && mode === 'load' && meta.compatible === false;
        if (sizeMismatchLoad)
            card.classList.add('incompatible');
        if (meta) {
            const seasonName = (S.time.seasons || SEASONS)[meta.season % (S.time.seasons || SEASONS).length];
            const archetypeLabel = meta.archetype
                ? ((typeof getWorldArchetypeLabel === 'function')
                    ? getWorldArchetypeLabel(meta.archetype)
                    : String(meta.archetype).replace(/_/g, ' '))
                : '';
            card.innerHTML = `
        <div class="menu-slot-label">SLOT ${slot}</div>
        <div class="menu-slot-main">Day ${meta.day} · ${seasonName} · 💰 ${meta.coins}</div>
        <div class="menu-slot-sub">🤖 ${meta.robotCount} robots · 🌾 ${meta.cropCount} crops</div>
        <div class="menu-slot-sub">${archetypeLabel ? `🗺 ${archetypeLabel} · ` : ''}${_fmtSavedAt(meta.savedAt)} · ${_fmtPlaytime(meta.playtime)}</div>
        ${sizeMismatchLoad ? `<div class="menu-slot-sub" style="color:#ffcf8a">⚠ ${meta.incompatibility || 'Different world size'} Loading will generate new terrain around saved land.</div>` : ''}
        <button class="menu-slot-delete" title="Delete save" onclick="menuDeleteSlot(event, ${slot})">✕</button>`;
            if (mode === 'load') {
                card.onclick = () => {
                    if (sizeMismatchLoad) {
                        const proceed = confirm('This save was created with a different world size. Loading is safe, but saving afterward will rewrite this slot to the current world size. Continue?');
                        if (!proceed)
                            return;
                        notify('⚠️ World size changed since this save. Existing farm tiles load first, new terrain fills the extra area.');
                    }
                    launchGame(slot, false);
                };
            }
            else {
                // new game into occupied slot → confirm overwrite
                card.onclick = () => menuConfirmOverwrite(slot, meta);
            }
        }
        else {
            card.innerHTML = `<div class="menu-slot-label">SLOT ${slot}</div><div class="menu-slot-sub">Empty</div>`;
            if (mode === 'new') {
                card.onclick = () => launchGame(slot, true);
            }
            // load mode: empty slot does nothing
        }
        container.appendChild(card);
    }
}
function menuDeleteSlot(e, slot) {
    e.stopPropagation();
    if (!confirm(`Delete Slot ${slot}? This cannot be undone.`))
        return;
    deleteSlot(slot);
    if (currentSlot === slot) {
        currentSlot = 0;
    }
    menuBuildSlots(MENU_FLOW.slotMode === 'load' ? 'load' : 'new');
    menuRefreshContinueBtn();
}
function menuConfirmOverwrite(slot, meta) {
    MENU_FLOW.pendingOverwriteSlot = slot;
    const seasonName = (S.time.seasons || SEASONS)[meta.season % (S.time.seasons || SEASONS).length];
    const profile = _menuBuildWorldProfilePayload();
    document.getElementById('menu-confirm-msg').textContent =
        `Slot ${slot}: Day ${meta.day}, ${seasonName}, ${meta.coins} coins · New: ${profile.archetypeLabel}`;
    const okBtn = document.getElementById('menu-confirm-ok');
    okBtn.onclick = () => launchGame(slot, true);
    menuSetView('confirm');
}
function menuCancelOverwrite() {
    const nextView = MENU_FLOW.slotMode === 'load' ? 'load-game' : 'new-game';
    menuSetView(nextView, { force: true });
}
/* ─── Launch game ─── */
let menuLaunchInFlight = false;
function _clearInputLatchState() {
    if (typeof keys === 'object' && keys) {
        for (const k of Object.keys(keys))
            keys[k] = false;
    }
    if (typeof clearInputActionLatches === 'function')
        clearInputActionLatches();
    if (typeof mouseIsDown !== 'undefined')
        mouseIsDown = false;
    if (typeof _listeningForKey !== 'undefined' && _listeningForKey) {
        _listeningForKey.classList.remove('listening');
        _listeningForKey = null;
    }
    assigningWorkArea = false;
    selectedRobotId = null;
    if (typeof configRobotId !== 'undefined')
        configRobotId = null;
    if (typeof invSelectedStack !== 'undefined')
        invSelectedStack = null;
}
function _resetPlayerToSpawn() {
    player.tileX = S.player.startX;
    player.tileY = S.player.startY;
    player.px = S.player.startX * TILE;
    player.py = S.player.startY * TILE;
    player.facingX = 0;
    player.facingY = 1;
    player.moving = false;
    player.frame = 0;
    player.frameTimer = 0;
}
function _resetVehicleToSpawn() {
    const spawnTileX = Math.max(0, Math.min(WW - 1, S.player.startX + (S.vehicle?.spawnOffsetX ?? 3)));
    const spawnTileY = Math.max(0, Math.min(WH - 1, S.player.startY + (S.vehicle?.spawnOffsetY ?? 0)));
    vehicle.px = spawnTileX * TILE;
    vehicle.py = spawnTileY * TILE;
    vehicle.angle = 0;
    vehicle.speed = 0;
    vehicle.moveAngle = 0;
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
    vehicle.occupied = false;
    if (typeof _nudgeVehicleClear === 'function')
        _nudgeVehicleClear();
}
function _emptyOwnedRobots() {
    const owned = {};
    for (const key of Object.keys(ROBOT_TYPES))
        owned[key] = 0;
    if (!('basic' in owned))
        owned.basic = 0;
    return owned;
}
function _buildFreshGameState(profile) {
    const worldProfile = (profile && typeof profile === 'object') ? profile : _menuBuildDefaultWorldProfile();
    coins = S.player.startCoins;
    day = 1;
    tick = 0;
    season = 0;
    if (typeof rollDailyWeather === 'function')
        rollDailyWeather(SEASONS[season] || 'Spring');
    else {
        isRaining = false;
        rainDay = Math.random() < (S.time.rainChance?.Spring ?? 0.2);
    }
    inventory = { seeds: {}, crops: {} };
    for (const [k, v] of Object.entries(S.player.startSeeds || {}))
        inventory.seeds[k] = v;
    robotsOwned = _emptyOwnedRobots();
    robotVouchers = {};
    pendingRobotType = ROBOT_TYPES.basic ? 'basic' : (Object.keys(ROBOT_TYPES)[0] || 'basic');
    currentTool = 'hand';
    robots = [];
    nextRobotId = 1;
    playtime = 0;
    productionStats = { history: [], today: { income: 0, harvested: 0, robotHarvests: 0, cropBreakdown: {} } };
    COMPANIES.rfs.price = COMPANIES.rfs.basePrice;
    COMPANIES.rfs.priceHistory = [];
    COMPANIES.rfs.sharesOwned = 0;
    COMPANIES.bupop.price = COMPANIES.bupop.basePrice;
    COMPANIES.bupop.priceHistory = [];
    COMPANIES.bupop.sharesOwned = 0;
    generateWorld({ profile: worldProfile });
    _resetPlayerToSpawn();
    _resetVehicleToSpawn();
    // Starter robots
    for (let i = 0; i < S.player.startRobots; i++) {
        robots.push(new Robot(S.player.startX + 2 + i, S.player.startY + 2));
    }
    if (typeof particles !== 'undefined')
        particles = [];
    if (typeof resetCropGrowthScheduler === 'function')
        resetCropGrowthScheduler();
    else if (typeof cropTick !== 'undefined')
        cropTick = 0;
    if (typeof resetProgressionState === 'function')
        resetProgressionState();
    if (typeof milestones !== 'undefined')
        milestones = { firstHarvest: false, firstRobot: false, crops100: false, coins1000: false, crops500: false };
    if (typeof selectTool === 'function')
        selectTool('hand');
}
function launchGame(slot, isNew) {
    if (menuLaunchInFlight)
        return;
    if (!_menuBeginTransition())
        return;
    menuLaunchInFlight = true;
    const screen = document.getElementById('menu-screen');
    screen.classList.add('fade-out');
    setTimeout(() => {
        try {
            screen.classList.add('hidden');
            document.getElementById('menu-tint')?.classList.remove('active');
            document.body.classList.remove('show-system-cursor');
            if (typeof closeAllModals === 'function')
                closeAllModals();
            if (typeof cancelAssign === 'function')
                cancelAssign();
            _clearInputLatchState();
            if (typeof syncCursorMode === 'function')
                syncCursorMode();
            ambientActive = false;
            let launchedAsNew = isNew;
            let loadedMeta = null;
            if (isNew) {
                const worldProfile = _menuBuildWorldProfilePayload();
                _buildFreshGameState(worldProfile);
                notify('🌾 Welcome to Robo Farm! Press F for the guide.');
                notify('🌱 Start by tilling soil (key 2) and planting seeds!');
            }
            else {
                generateWorld();
                loadedMeta = loadGameSlot(slot);
                if (!loadedMeta?.ok) {
                    launchedAsNew = true;
                    _buildFreshGameState(_menuBuildDefaultWorldProfile());
                    notify(`⚠️ Slot ${slot} could not be loaded. Started a fresh world instead.`);
                }
                else if (loadedMeta.compatible === false) {
                    notify('⚠️ Loaded world-size mismatch save. Auto-save skipped on launch to avoid accidental overwrite.');
                }
            }
            autosaveBlocked = false;
            autosaveBlockReason = '';
            if (!launchedAsNew && loadedMeta?.compatible === false) {
                autosaveBlocked = true;
                autosaveBlockReason = loadedMeta.incompatibility || 'Loaded save uses a different world size.';
            }
            currentSlot = slot;
            menuPauseMode = false;
            gameState = 'playing';
            // Camera
            camera.x = window.innerWidth / 2 - (player.px + TILE / 2) * camera.zoom;
            camera.y = window.innerHeight / 2 - (player.py + TILE / 2) * camera.zoom;
            updateUI();
            if (launchedAsNew)
                saveGame(slot);
            // Show welcome gazette on day 1 for fresh games
            if (launchedAsNew && day === 1) {
                setTimeout(() => { if (typeof showGazette === 'function')
                    showGazette(); }, 500);
            }
            // Show changelog once per version for returning players
            if (!launchedAsNew) {
                const lastSeen = localStorage.getItem('roboFarm_changelogSeen');
                if (lastSeen !== 'v0.2.4') {
                    setTimeout(() => { openModal('changelog'); localStorage.setItem('roboFarm_changelogSeen', 'v0.2.4'); }, 400);
                }
            }
            // `menu-open` hides in-game HUD via CSS; clear it when gameplay starts.
            document.body.classList.remove('menu-open');
        }
        catch (err) {
            console.error('Launch failed:', err);
            menuPauseMode = false;
            gameState = 'menu';
            screen.classList.remove('hidden', 'fade-out');
            notify('❌ Launch failed. Returned to menu.');
        }
        finally {
            menuLaunchInFlight = false;
            _menuEndTransition();
        }
    }, 120);
}
/* ─── Settings ─── */
const MENU_SETTINGS_STORE = 'roboFarm_settings';
function _loadSettingsOverrides() {
    try {
        return JSON.parse(localStorage.getItem(MENU_SETTINGS_STORE) || '{}');
    }
    catch {
        return {};
    }
}
function _saveSettingsOverrides(obj) {
    localStorage.setItem(MENU_SETTINGS_STORE, JSON.stringify(obj));
}
function _menuReadRuntimeSettings() {
    return {
        showNotifications: !!S.display.showNotifications,
        showDayBanner: S.display.showDayBanner !== false,
        menuColorThemes: S.display.menuColorThemes !== false,
        menuBgActivity: ['calm', 'normal', 'lively'].includes(S.display.menuBgActivity) ? S.display.menuBgActivity : 'normal',
        notificationDuration: S.display.notificationDuration ?? 3500,
        keybindings: { ...(S.keybindings || {}) },
    };
}
function _menuCloneSettingsData(src) {
    return {
        showNotifications: !!src.showNotifications,
        showDayBanner: !!src.showDayBanner,
        menuColorThemes: !!src.menuColorThemes,
        menuBgActivity: ['calm', 'normal', 'lively'].includes(src.menuBgActivity) ? src.menuBgActivity : 'normal',
        notificationDuration: src.notificationDuration ?? 3500,
        keybindings: { ...(src.keybindings || {}) },
    };
}
function _menuApplySettingsRuntime(data) {
    S.display.showNotifications = !!data.showNotifications;
    S.display.showDayBanner = !!data.showDayBanner;
    S.display.menuColorThemes = !!data.menuColorThemes;
    S.display.menuBgActivity = ['calm', 'normal', 'lively'].includes(data.menuBgActivity) ? data.menuBgActivity : 'normal';
    S.display.notificationDuration = data.notificationDuration ?? 3500;
    S.keybindings = S.keybindings || {};
    Object.assign(S.keybindings, data.keybindings || {});
    const tintEl = document.getElementById('menu-tint');
    if (tintEl)
        tintEl.classList.toggle('active', S.display.menuColorThemes !== false);
}
function _menuStartSettingsDraft() {
    if (_listeningForKey) {
        _listeningForKey.classList.remove('listening');
        _listeningForKey = null;
    }
    MENU_SETTINGS_SNAPSHOT = _menuReadRuntimeSettings();
    MENU_SETTINGS_DRAFT = _menuCloneSettingsData(MENU_SETTINGS_SNAPSHOT);
    MENU_FLOW.settingsDirty = false;
    MENU_FLOW.pendingViewAfterSettings = null;
    _menuUpdateSettingsHint();
}
function _menuMarkSettingsDirty() {
    MENU_FLOW.settingsDirty = true;
    _menuUpdateSettingsHint();
}
function _menuUpdateSettingsHint() {
    const hint = document.getElementById('menu-settings-dirty-hint');
    if (!hint)
        return;
    if (MENU_FLOW.settingsDirty) {
        hint.textContent = 'Unsaved changes';
        hint.classList.add('dirty');
    }
    else {
        hint.textContent = '';
        hint.classList.remove('dirty');
    }
}
function menuCommitSettingsDraft() {
    if (!MENU_SETTINGS_DRAFT)
        return;
    _menuApplySettingsRuntime(MENU_SETTINGS_DRAFT);
    const overrides = _loadSettingsOverrides();
    overrides.showNotifications = MENU_SETTINGS_DRAFT.showNotifications;
    overrides.showDayBanner = MENU_SETTINGS_DRAFT.showDayBanner;
    overrides.menuColorThemes = MENU_SETTINGS_DRAFT.menuColorThemes;
    overrides.menuBgActivity = MENU_SETTINGS_DRAFT.menuBgActivity;
    overrides.notificationDuration = MENU_SETTINGS_DRAFT.notificationDuration;
    overrides.keybindings = { ...(MENU_SETTINGS_DRAFT.keybindings || {}) };
    _saveSettingsOverrides(overrides);
    MENU_SETTINGS_SNAPSHOT = _menuCloneSettingsData(MENU_SETTINGS_DRAFT);
    MENU_FLOW.settingsDirty = false;
    _menuUpdateSettingsHint();
}
function menuDiscardSettingsDraft() {
    if (!MENU_SETTINGS_SNAPSHOT)
        return;
    _menuApplySettingsRuntime(MENU_SETTINGS_SNAPSHOT);
    MENU_SETTINGS_DRAFT = _menuCloneSettingsData(MENU_SETTINGS_SNAPSHOT);
    MENU_FLOW.settingsDirty = false;
    _menuUpdateSettingsHint();
}
function menuSettingsPromptAction(action) {
    if (_listeningForKey) {
        _listeningForKey.classList.remove('listening');
        _listeningForKey = null;
    }
    if (action === 'save')
        menuCommitSettingsDraft();
    if (action === 'discard')
        menuDiscardSettingsDraft();
    if (action === 'cancel') {
        menuSetView('settings', { force: true });
        return;
    }
    const nextView = MENU_FLOW.pendingViewAfterSettings || 'main';
    MENU_FLOW.pendingViewAfterSettings = null;
    menuSetView(nextView, { force: true });
}
function menuBuildSettingsConfirm() {
    const hint = document.getElementById('menu-settings-confirm-msg');
    if (!hint)
        return;
    hint.textContent = MENU_FLOW.pendingViewAfterSettings
        ? `Save settings before going to ${MENU_FLOW.pendingViewAfterSettings.replace('-', ' ')}?`
        : 'Save settings changes?';
}
function menuBuildSettings() {
    if (!MENU_SETTINGS_DRAFT)
        _menuStartSettingsDraft();
    menuBuildSettingsDisplay();
    menuBuildSettingsSound();
    menuBuildSettingsKeybinds();
}
function menuSettingsTab(tab) {
    document.querySelectorAll('.menu-settings-tab').forEach(el => el.style.display = 'none');
    document.querySelectorAll('#menu-settings .tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`menu-settings-${tab}`).style.display = 'block';
    const btns = [...document.querySelectorAll('#menu-settings .tab-btn')];
    const idx = ['display', 'sound', 'keybinds'].indexOf(tab);
    if (btns[idx])
        btns[idx].classList.add('active');
}
function menuBuildSettingsDisplay() {
    const container = document.getElementById('menu-settings-display');
    container.innerHTML = '';
    if (!MENU_SETTINGS_DRAFT)
        return;
    const rows = [
        { label: 'Notifications', key: 'showNotifications' },
        { label: 'Day Banner', key: 'showDayBanner' },
        { label: 'Color Themes', key: 'menuColorThemes' },
    ];
    for (const row of rows) {
        const el = document.createElement('div');
        el.className = 'menu-setting-row';
        const val = !!MENU_SETTINGS_DRAFT[row.key];
        el.innerHTML = `
      <span class="menu-setting-label">${row.label}</span>
      <button class="menu-setting-toggle ${val ? 'on' : ''}" data-key="${row.key}">
        ${val ? 'ON' : 'OFF'}
      </button>`;
        el.querySelector('button').onclick = function () {
            const current = !!MENU_SETTINGS_DRAFT[row.key];
            MENU_SETTINGS_DRAFT[row.key] = !current;
            _menuApplySettingsRuntime(MENU_SETTINGS_DRAFT);
            this.textContent = !current ? 'ON' : 'OFF';
            this.classList.toggle('on', !current);
            _menuMarkSettingsDirty();
        };
        container.appendChild(el);
    }
    const bgRow = document.createElement('div');
    bgRow.className = 'menu-setting-row';
    bgRow.innerHTML = `<span class="menu-setting-label">Background Activity</span>`;
    const activityModes = [
        { label: 'Calm', value: 'calm' },
        { label: 'Normal', value: 'normal' },
        { label: 'Lively', value: 'lively' },
    ];
    const currentMode = ['calm', 'normal', 'lively'].includes(MENU_SETTINGS_DRAFT.menuBgActivity)
        ? MENU_SETTINGS_DRAFT.menuBgActivity
        : 'normal';
    for (const mode of activityModes) {
        const btn = document.createElement('button');
        btn.className = 'menu-setting-toggle' + (mode.value === currentMode ? ' on' : '');
        btn.textContent = mode.label;
        btn.style.marginLeft = '4px';
        btn.onclick = () => {
            MENU_SETTINGS_DRAFT.menuBgActivity = mode.value;
            _menuApplySettingsRuntime(MENU_SETTINGS_DRAFT);
            bgRow.querySelectorAll('.menu-setting-toggle').forEach(b => b.classList.remove('on'));
            btn.classList.add('on');
            _menuMarkSettingsDirty();
            menuUpdateAmbientStatus();
        };
        bgRow.appendChild(btn);
    }
    container.appendChild(bgRow);
    // Notification duration
    const durRow = document.createElement('div');
    durRow.className = 'menu-setting-row';
    const durations = { Short: 2000, Normal: 3500, Long: 6000 };
    const curDur = MENU_SETTINGS_DRAFT.notificationDuration ?? 3500;
    const curLabel = Object.entries(durations).find(([, v]) => v === curDur)?.[0] ?? 'Normal';
    durRow.innerHTML = `<span class="menu-setting-label">Notif Duration</span>`;
    for (const [label, ms] of Object.entries(durations)) {
        const btn = document.createElement('button');
        btn.className = 'menu-setting-toggle' + (label === curLabel ? ' on' : '');
        btn.textContent = label;
        btn.style.marginLeft = '4px';
        btn.onclick = () => {
            MENU_SETTINGS_DRAFT.notificationDuration = ms;
            _menuApplySettingsRuntime(MENU_SETTINGS_DRAFT);
            durRow.querySelectorAll('.menu-setting-toggle').forEach(b => b.classList.remove('on'));
            btn.classList.add('on');
            _menuMarkSettingsDirty();
        };
        durRow.appendChild(btn);
    }
    container.appendChild(durRow);
}
function menuBuildSettingsSound() {
    const container = document.getElementById('menu-settings-sound');
    container.innerHTML = `<div class="menu-sound-placeholder">🔇 No audio yet — coming soon.</div>`;
}
let _listeningForKey = null;
function menuBuildSettingsKeybinds() {
    const container = document.getElementById('menu-settings-keybinds');
    container.innerHTML = '';
    if (!MENU_SETTINGS_DRAFT)
        return;
    const bindings = MENU_SETTINGS_DRAFT.keybindings || {};
    for (const [action, key] of Object.entries(bindings)) {
        const row = document.createElement('div');
        row.className = 'menu-keybind-row';
        row.innerHTML = `
      <span class="menu-keybind-action">${action}</span>
      <button class="menu-keybind-key" data-action="${action}">${key}</button>`;
        row.querySelector('button').onclick = function () {
            if (_listeningForKey) {
                _listeningForKey.classList.remove('listening');
            }
            _listeningForKey = this;
            this.classList.add('listening');
            this.textContent = '...';
        };
        container.appendChild(row);
    }
}
document.addEventListener('keydown', e => {
    if (!_listeningForKey)
        return;
    e.preventDefault();
    const action = _listeningForKey.dataset.action;
    const key = e.key === ' ' ? 'Space' : e.key;
    MENU_SETTINGS_DRAFT.keybindings[action] = key;
    _menuApplySettingsRuntime(MENU_SETTINGS_DRAFT);
    _menuMarkSettingsDirty();
    _listeningForKey.textContent = key;
    _listeningForKey.classList.remove('listening');
    _listeningForKey = null;
}, true); // capture so it runs before other keydown handlers
/* ─── Apply persisted settings overrides on load ─── */
(function applySettingsOverrides() {
    const overrides = _loadSettingsOverrides();
    if (overrides.showNotifications !== undefined)
        S.display.showNotifications = !!overrides.showNotifications;
    if (overrides.showDayBanner !== undefined)
        S.display.showDayBanner = !!overrides.showDayBanner;
    if (overrides.menuColorThemes !== undefined)
        S.display.menuColorThemes = !!overrides.menuColorThemes;
    if (['calm', 'normal', 'lively'].includes(overrides.menuBgActivity))
        S.display.menuBgActivity = overrides.menuBgActivity;
    if (overrides.notificationDuration)
        S.display.notificationDuration = overrides.notificationDuration;
    if (overrides.keybindings)
        Object.assign(S.keybindings, overrides.keybindings);
    _menuStartSettingsDraft();
})();
/* ─── Ambient World ─── */
const AMBIENT = {
    tick: 0,
    weatherTimer: 0,
    weather: 'clear', // 'clear' | 'rain' | 'snow' | 'thunder' | 'hail'
    farmTileCount: 0,
    // Slow camera pan
    panX: 0, panY: 0, panTargetX: 0, panTargetY: 0,
};
const AMBIENT_BOTS = []; // holds simple bot state objects (not Robot instances)
const AMBIENT_TASK_CLAIMS = new Map();
const _AMBIENT_TASK_TTL = 120;
const AMBIENT_CROPS = Object.keys(S.crops || {});
function _ambientTaskKey(tx, ty) { return `${tx},${ty}`; }
function _ambientHasTask(bot) {
    return Number.isFinite(bot.targetTx) && Number.isFinite(bot.targetTy);
}
function _ambientPriority(bot) {
    if (bot.state === 'acting')
        return 5;
    if (_ambientHasTask(bot))
        return 4;
    return 1;
}
function _ambientReleaseTask(bot) {
    if (!bot || !bot._taskClaimKey)
        return;
    const claim = AMBIENT_TASK_CLAIMS.get(bot._taskClaimKey);
    if (claim && claim.botId === bot.id)
        AMBIENT_TASK_CLAIMS.delete(bot._taskClaimKey);
    bot._taskClaimKey = null;
}
function _ambientClaimTask(bot, tx, ty, ttl = _AMBIENT_TASK_TTL) {
    const key = _ambientTaskKey(tx, ty);
    const claim = AMBIENT_TASK_CLAIMS.get(key);
    if (claim && claim.botId !== bot.id && claim.expiresAt >= AMBIENT.tick)
        return false;
    if (bot._taskClaimKey && bot._taskClaimKey !== key)
        _ambientReleaseTask(bot);
    AMBIENT_TASK_CLAIMS.set(key, { botId: bot.id, tx, ty, expiresAt: AMBIENT.tick + ttl });
    bot._taskClaimKey = key;
    return true;
}
function _ambientTouchTask(bot, ttl = _AMBIENT_TASK_TTL) {
    if (!bot || !bot._taskClaimKey)
        return;
    const claim = AMBIENT_TASK_CLAIMS.get(bot._taskClaimKey);
    if (!claim || claim.botId !== bot.id) {
        bot._taskClaimKey = null;
        return;
    }
    claim.expiresAt = AMBIENT.tick + ttl;
}
function _ambientClaimedByOther(bot, tx, ty) {
    const key = _ambientTaskKey(tx, ty);
    const claim = AMBIENT_TASK_CLAIMS.get(key);
    if (!claim)
        return false;
    if (claim.expiresAt < AMBIENT.tick) {
        AMBIENT_TASK_CLAIMS.delete(key);
        return false;
    }
    return claim.botId !== bot.id;
}
function _ambientStepCandidates(bot) {
    if (!_ambientHasTask(bot))
        return [];
    const dx = bot.targetTx - bot.tx;
    const dy = bot.targetTy - bot.ty;
    if (dx === 0 && dy === 0)
        return [];
    const steps = [];
    if (Math.abs(dx) >= Math.abs(dy)) {
        if (dx !== 0)
            steps.push({ tx: bot.tx + Math.sign(dx), ty: bot.ty });
        if (dy !== 0)
            steps.push({ tx: bot.tx, ty: bot.ty + Math.sign(dy) });
    }
    else {
        if (dy !== 0)
            steps.push({ tx: bot.tx, ty: bot.ty + Math.sign(dy) });
        if (dx !== 0)
            steps.push({ tx: bot.tx + Math.sign(dx), ty: bot.ty });
    }
    return steps;
}
function _ambientMoveContext() {
    const occupiedByTile = new Map();
    const intentsByTile = new Map();
    const priorityByBot = new Map();
    for (const bot of AMBIENT_BOTS) {
        occupiedByTile.set(_tileIdx(bot.tx, bot.ty), bot.id);
        priorityByBot.set(bot.id, _ambientPriority(bot));
    }
    for (const bot of AMBIENT_BOTS) {
        if (bot.state !== 'moving' || bot.timer > 0)
            continue;
        const desired = _ambientStepCandidates(bot)[0];
        if (!desired || !inBounds(desired.tx, desired.ty))
            continue;
        const key = _tileIdx(desired.tx, desired.ty);
        const mine = { botId: bot.id, priority: priorityByBot.get(bot.id) || 1 };
        const cur = intentsByTile.get(key);
        if (!cur || mine.priority > cur.priority || (mine.priority === cur.priority && mine.botId < cur.botId)) {
            intentsByTile.set(key, mine);
        }
    }
    return { occupiedByTile, intentsByTile, priorityByBot };
}
function _ambientCanMove(bot, next, moveCtx) {
    if (!inBounds(next.tx, next.ty))
        return false;
    if (!isWalkable(next.tx, next.ty))
        return false;
    const nextIdx = _tileIdx(next.tx, next.ty);
    const winner = moveCtx.intentsByTile.get(nextIdx);
    if (winner && winner.botId !== bot.id) {
        const myPriority = moveCtx.priorityByBot.get(bot.id) || 1;
        const loseTie = winner.priority > myPriority || (winner.priority === myPriority && winner.botId < bot.id);
        if (loseTie)
            return false;
    }
    const occupant = moveCtx.occupiedByTile.get(nextIdx);
    return occupant == null || occupant === bot.id;
}
function _ambientPruneClaims() {
    const live = new Set(AMBIENT_BOTS.map(b => b.id));
    for (const [key, claim] of AMBIENT_TASK_CLAIMS) {
        if (claim.expiresAt < AMBIENT.tick || !live.has(claim.botId))
            AMBIENT_TASK_CLAIMS.delete(key);
    }
    for (const bot of AMBIENT_BOTS) {
        if (!bot._taskClaimKey)
            continue;
        const claim = AMBIENT_TASK_CLAIMS.get(bot._taskClaimKey);
        if (!claim || claim.botId !== bot.id)
            bot._taskClaimKey = null;
    }
}
function _ambientActivityConfig() {
    const mode = ['calm', 'normal', 'lively'].includes(S.display.menuBgActivity)
        ? S.display.menuBgActivity
        : 'normal';
    if (mode === 'calm') {
        return { mode, botTimerStep: 0.72, cameraEase: 0.0035, panInterval: 760, panRangeTiles: 3, weatherParticleMul: 0.45 };
    }
    if (mode === 'lively') {
        return { mode, botTimerStep: 1.3, cameraEase: 0.0075, panInterval: 460, panRangeTiles: 5, weatherParticleMul: 1.3 };
    }
    return { mode, botTimerStep: 1, cameraEase: 0.005, panInterval: 600, panRangeTiles: 4, weatherParticleMul: 1 };
}
function _isAmbientInSafeZone(tx, ty) {
    const sx = (tx + 0.5) * TILE * camera.zoom + camera.x;
    const sy = (ty + 0.5) * TILE * camera.zoom + camera.y;
    const safeW = Math.min(window.innerWidth * 0.72, 560);
    const safeH = Math.min(window.innerHeight * 0.58, 400);
    const x0 = (window.innerWidth - safeW) / 2;
    const y0 = (window.innerHeight - safeH) / 2;
    return sx >= x0 && sx <= x0 + safeW && sy >= y0 && sy <= y0 + safeH;
}
function menuUpdateAmbientStatus() {
    const bgStatus = document.getElementById('menu-bg-status');
    if (bgStatus) {
        if (menuPauseMode) {
            const seasonName = (SEASONS || S.time.seasons)[(season || 0) % ((SEASONS || S.time.seasons).length)];
            bgStatus.textContent = `📅 Day ${day} · ${seasonName} · 💰 ${coins}`;
        }
        else {
            const weatherIcon = (typeof getWeatherIcon === 'function')
                ? getWeatherIcon(AMBIENT.weather)
                : (AMBIENT.weather === 'rain' ? '🌧' : AMBIENT.weather === 'hail' ? '🌨' : '☀');
            const theme = getMenuThemeName();
            const activity = _ambientActivityConfig().mode;
            bgStatus.textContent = `${weatherIcon} ${AMBIENT_BOTS.length} bots on ${AMBIENT.farmTileCount} tiles · ${theme} · ${activity}`;
        }
    }
    const shortcutHint = document.getElementById('menu-shortcut-hint');
    if (shortcutHint) {
        shortcutHint.textContent = menuPauseMode
            ? 'ESC · resume game'
            : 'ESC · back/menu';
    }
}
function initAmbient() {
    ambientActive = true;
    // Run migration before anything else
    migrateSingleSlot();
    AMBIENT.tick = 0;
    AMBIENT.weather = 'clear';
    AMBIENT.farmTileCount = 0;
    AMBIENT_BOTS.length = 0;
    AMBIENT_TASK_CLAIMS.clear();
    if (typeof particles !== 'undefined')
        particles = [];
    if (typeof setWeather === 'function')
        setWeather('clear', { intensity: 0 });
    else
        isRaining = false;
    // Generate world (uses global `world`)
    generateWorld();
    // Convert the entire ambient world into active farm tiles.
    const cx = Math.floor(WW / 2), cy = Math.floor(WH / 2);
    const cropPool = AMBIENT_CROPS.length > 0 ? AMBIENT_CROPS : ['wheat'];
    for (let ty = 0; ty < WH; ty++) {
        for (let tx = 0; tx < WW; tx++) {
            const tile = world[ty][tx];
            tile.type = 'tilled';
            tile.watered = Math.random() < 0.45;
            AMBIENT.farmTileCount++;
            if (Math.random() < 0.75) {
                const cropType = cropPool[Math.floor(Math.random() * cropPool.length)];
                const cfg = S.crops[cropType];
                const maxStage = Math.max(0, (cfg?.stages ?? 3) - 1);
                const watered = Math.random() < 0.55;
                tile.crop = {
                    type: cropType,
                    stage: Math.floor(Math.random() * (maxStage + 1)),
                    growTimer: 0,
                    waterCount: watered ? 1 : 0,
                    waterDay: day,
                    watered,
                };
            }
            else {
                tile.crop = null;
            }
        }
    }
    // Spawn a larger autonomous robot fleet for the menu background.
    const typePool = Object.keys(ROBOT_TYPES || {});
    const ambientBotCount = Math.max(10, Math.min(18, Math.floor((WW * WH) / 140)));
    const occupied = new Set();
    for (let i = 0; i < ambientBotCount; i++) {
        let tx = cx, ty = cy;
        let found = false;
        for (let attempt = 0; attempt < 30; attempt++) {
            tx = cx + Math.floor((Math.random() - 0.5) * 16);
            ty = cy + Math.floor((Math.random() - 0.5) * 16);
            if (!inBounds(tx, ty))
                continue;
            const key = `${tx},${ty}`;
            if (occupied.has(key))
                continue;
            occupied.add(key);
            found = true;
            break;
        }
        if (!found) {
            tx = Math.max(0, Math.min(WW - 1, cx + (i % 6) - 3));
            ty = Math.max(0, Math.min(WH - 1, cy + Math.floor(i / 6) - 2));
            occupied.add(`${tx},${ty}`);
        }
        const type = typePool[i % Math.max(1, typePool.length)] || 'basic';
        const typeDef = ROBOT_TYPES[type] || ROBOT_TYPES.basic || { batteryMax: 100 };
        const batteryMax = typeDef.batteryMax ?? 100;
        AMBIENT_BOTS.push({
            id: -(i + 1),
            type,
            tx,
            ty,
            px: tx * TILE,
            py: ty * TILE,
            state: 'idle',
            timer: Math.floor(Math.random() * 36),
            crop: cropPool[i % cropPool.length] || 'wheat',
            batteryMax,
            battery: Math.round(batteryMax * (0.65 + Math.random() * 0.35)),
            targetTx: undefined,
            targetTy: undefined,
            targetAction: null,
            _taskClaimKey: null,
            _blockedSteps: 0,
        });
    }
    // Camera centered on farm patch
    AMBIENT.panX = window.innerWidth / 2 - (cx * TILE + TILE / 2) * camera.zoom;
    AMBIENT.panY = window.innerHeight / 2 - (cy * TILE + TILE / 2) * camera.zoom;
    AMBIENT.panTargetX = AMBIENT.panX;
    AMBIENT.panTargetY = AMBIENT.panY;
    camera.x = AMBIENT.panX;
    camera.y = AMBIENT.panY;
    // Schedule weather roll
    AMBIENT.weatherTimer = 80 + Math.floor(Math.random() * 80);
    if (typeof markAllTilesDirty === 'function')
        markAllTilesDirty();
    menuUpdateAmbientStatus();
}
function updateAmbient() {
    if (!ambientActive)
        return;
    const activityCfg = _ambientActivityConfig();
    AMBIENT.tick++;
    // ─ Weather / time ─
    AMBIENT.weatherTimer--;
    if (AMBIENT.weatherTimer <= 0) {
        const seasonName = (SEASONS || S.time.seasons)[(season || 0) % ((SEASONS || S.time.seasons).length)] || 'Spring';
        const weights = (typeof getSeasonWeatherWeights === 'function')
            ? getSeasonWeatherWeights(seasonName)
            : { clear: 0.58, rain: 0.27, snow: 0.05, thunder: 0.06, hail: 0.04 };
        const roll = Math.random();
        let cursor = 0;
        let nextWeather = 'clear';
        for (const key of ['clear', 'rain', 'snow', 'thunder', 'hail']) {
            cursor += Number(weights[key]) || 0;
            if (roll <= cursor) {
                nextWeather = key;
                break;
            }
        }
        AMBIENT.weather = nextWeather;
        AMBIENT.weatherTimer = 80 + Math.floor(Math.random() * 80);
        if (typeof setWeather === 'function')
            setWeather(AMBIENT.weather);
        else
            isRaining = (AMBIENT.weather === 'rain' || AMBIENT.weather === 'hail' || AMBIENT.weather === 'snow' || AMBIENT.weather === 'thunder');
    }
    // Accelerated time-of-day (drives sky tint in render)
    tick = (tick + 5) % TPDAY;
    // Gentle camera pan — drift toward a new target every ~10s
    if (AMBIENT.tick % activityCfg.panInterval === 0) {
        const offsetX = (Math.random() - 0.5) * activityCfg.panRangeTiles * TILE * camera.zoom;
        const offsetY = (Math.random() - 0.5) * activityCfg.panRangeTiles * TILE * camera.zoom;
        AMBIENT.panTargetX = AMBIENT.panX + offsetX;
        AMBIENT.panTargetY = AMBIENT.panY + offsetY;
    }
    camera.x += (AMBIENT.panTargetX - camera.x) * activityCfg.cameraEase;
    camera.y += (AMBIENT.panTargetY - camera.y) * activityCfg.cameraEase;
    // ─ Ambient particle weather ─
    if (AMBIENT.weather === 'rain' || AMBIENT.weather === 'hail' || AMBIENT.weather === 'snow' || AMBIENT.weather === 'thunder') {
        const baseCount = AMBIENT.weather === 'hail'
            ? 2
            : AMBIENT.weather === 'snow'
                ? 3
                : AMBIENT.weather === 'thunder'
                    ? 7
                    : 6;
        const zoomFactor = Math.max(0.65, Math.min(1, camera.zoom / 1.2));
        const count = Math.max(1, Math.round(baseCount * activityCfg.weatherParticleMul * zoomFactor));
        for (let i = 0; i < count; i++) {
            const sx = Math.random() * window.innerWidth;
            const wx = (sx - camera.x) / camera.zoom;
            const wy = (-10 - camera.y) / camera.zoom;
            const isHail = AMBIENT.weather === 'hail';
            const isSnow = AMBIENT.weather === 'snow';
            const color = isHail
                ? '#aaddff'
                : isSnow
                    ? '#f2f6ff'
                    : AMBIENT.weather === 'thunder'
                        ? '#7ea2d0'
                        : '#6699cc';
            particles.push({
                x: wx, y: wy,
                vx: isSnow ? (Math.random() - 0.5) * 0.7 : (Math.random() - 0.5) * 0.5,
                vy: isSnow ? 1.1 + Math.random() * 0.7 : 2 + Math.random(),
                life: 1,
                color,
                size: isHail ? 3 : isSnow ? 2.4 : 2,
            });
        }
    }
    // ─ Slowly advance crop growth ─
    if (AMBIENT.tick % 120 === 0) {
        for (let ty = 0; ty < WH; ty++) {
            for (let tx = 0; tx < WW; tx++) {
                const tile = world[ty][tx];
                if (!tile.crop)
                    continue;
                const cfg = S.crops[tile.crop.type];
                if (!cfg)
                    continue;
                if (tile.crop.stage < cfg.stages - 1)
                    tile.crop.stage++;
            }
        }
    }
    // ─ Ambient bots ─
    _ambientPruneClaims();
    const moveCtx = _ambientMoveContext();
    for (const bot of AMBIENT_BOTS) {
        _updateAmbientBot(bot, activityCfg, moveCtx);
    }
    updateParticles();
    // Drive the CSS tint div
    if (S.display.menuColorThemes !== false) {
        const tintEl = document.getElementById('menu-tint');
        if (tintEl)
            tintEl.style.backgroundColor = getMenuTint();
    }
    if (AMBIENT.tick % 20 === 0)
        menuUpdateAmbientStatus();
}
function _updateAmbientBot(bot, activityCfg, moveCtx) {
    const botStep = activityCfg?.botTimerStep ?? 1;
    if (bot.batteryMax) {
        const drain = bot.state === 'idle' ? 0.012 : 0.04;
        bot.battery = Math.max(6, (bot.battery ?? bot.batteryMax) - drain);
        if (bot.state === 'idle' && bot.battery < bot.batteryMax * 0.5) {
            bot.battery = Math.min(bot.batteryMax, bot.battery + 0.16);
        }
    }
    bot.timer -= botStep;
    if (bot.timer > 0)
        return;
    switch (bot.state) {
        case 'idle': {
            const target = _ambientFindTarget(bot);
            if (target && _ambientClaimTask(bot, target.tx, target.ty)) {
                bot.targetTx = target.tx;
                bot.targetTy = target.ty;
                bot.targetAction = target.action;
                bot._blockedSteps = 0;
                bot.state = 'moving';
                bot.timer = 1;
            }
            else {
                bot.timer = 12;
            }
            break;
        }
        case 'moving': {
            if (!_ambientHasTask(bot)) {
                bot.state = 'idle';
                bot.timer = 4;
                break;
            }
            const dx = bot.targetTx - bot.tx, dy = bot.targetTy - bot.ty;
            if (dx === 0 && dy === 0) {
                _ambientTouchTask(bot, _AMBIENT_TASK_TTL + 30);
                bot.state = 'acting';
                bot.timer = 8;
                break;
            }
            let moved = false;
            for (const next of _ambientStepCandidates(bot)) {
                if (!_ambientCanMove(bot, next, moveCtx))
                    continue;
                const oldIdx = _tileIdx(bot.tx, bot.ty);
                bot.tx = next.tx;
                bot.ty = next.ty;
                bot.px = bot.tx * TILE;
                bot.py = bot.ty * TILE;
                moveCtx.occupiedByTile.delete(oldIdx);
                moveCtx.occupiedByTile.set(_tileIdx(bot.tx, bot.ty), bot.id);
                bot._blockedSteps = 0;
                _ambientTouchTask(bot, _AMBIENT_TASK_TTL + 45);
                bot.timer = 6;
                moved = true;
                break;
            }
            if (!moved) {
                bot._blockedSteps = (bot._blockedSteps || 0) + 1;
                bot.timer = 2;
                if (bot._blockedSteps > 18) {
                    _ambientReleaseTask(bot);
                    bot.targetTx = undefined;
                    bot.targetTy = undefined;
                    bot.targetAction = null;
                    bot._blockedSteps = 0;
                    bot.state = 'idle';
                    bot.timer = 3;
                }
            }
            break;
        }
        case 'acting': {
            const tx = bot.targetTx, ty = bot.targetTy;
            if (!inBounds(tx, ty)) {
                _ambientReleaseTask(bot);
                bot.targetTx = undefined;
                bot.targetTy = undefined;
                bot.targetAction = null;
                bot.state = 'idle';
                bot.timer = 5;
                break;
            }
            const tile = world[ty][tx];
            switch (bot.targetAction) {
                case 'harvest':
                    tile.crop = null;
                    tile.watered = false;
                    if (typeof markTileDirty === 'function')
                        markTileDirty(tx, ty);
                    break;
                case 'water':
                    if (tile.crop) {
                        tile.crop.watered = true;
                        tile.watered = true;
                        if (typeof markTileDirty === 'function')
                            markTileDirty(tx, ty);
                    }
                    break;
                case 'plant':
                    if (tile.type === 'tilled' && !tile.crop) {
                        tile.crop = { type: bot.crop, stage: 0, growTimer: 0, waterCount: 0, waterDay: day, watered: false };
                        if (typeof markTileDirty === 'function')
                            markTileDirty(tx, ty);
                    }
                    break;
                case 'till':
                    if (tile.type === 'grass' || tile.type === 'flower') {
                        tile.type = 'tilled';
                        if (typeof markTileDirty === 'function')
                            markTileDirty(tx, ty);
                    }
                    break;
            }
            _ambientReleaseTask(bot);
            bot.targetTx = undefined;
            bot.targetTy = undefined;
            bot.targetAction = null;
            bot.state = 'idle';
            bot.timer = 10;
            break;
        }
    }
}
function _ambientFindTarget(bot) {
    const radius = 12;
    let best = null, bestDist = Infinity;
    const priority = { harvest: 0, water: 1, plant: 2, till: 3 };
    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            const tx = bot.tx + dx, ty = bot.ty + dy;
            if (!inBounds(tx, ty))
                continue;
            if (_isAmbientInSafeZone(tx, ty))
                continue;
            if (_ambientClaimedByOther(bot, tx, ty))
                continue;
            const tile = world[ty][tx];
            let action = null;
            const cfg = tile.crop && S.crops[tile.crop.type];
            if (tile.crop && cfg && tile.crop.stage >= cfg.stages - 1)
                action = 'harvest';
            else if (tile.crop && !tile.crop.watered)
                action = 'water';
            else if (tile.type === 'tilled' && !tile.crop)
                action = 'plant';
            else if (tile.type !== 'tilled')
                action = 'till';
            if (!action)
                continue;
            const dist = Math.abs(dx) + Math.abs(dy);
            if (priority[action] < (best ? priority[best.action] : 99) ||
                (priority[action] === (best ? priority[best.action] : 99) && dist < bestDist)) {
                best = { tx, ty, action };
                bestDist = dist;
            }
        }
    }
    return best;
}
/* ─── Menu color themes ─── */
const MENU_THEMES = [
    { name: 'sunrise', hsl: t => [22 + Math.sin(t * 0.02) * 12, 88, 56] },
    { name: 'harvest', hsl: () => [42, 90, 54] },
    { name: 'meadow', hsl: () => [122, 72, 46] },
    { name: 'lagoon', hsl: () => [194, 84, 52] },
    { name: 'cobalt', hsl: () => [217, 78, 50] },
    { name: 'ember', hsl: () => [355, 86, 52] },
    { name: 'aurora', hsl: t => [148 + Math.sin(t * 0.05) * 26, 84, 52] },
];
const _THEME_HOLD = 480; // ticks at full intensity (~8s)
const _THEME_FADE = 60; // ticks for crossfade (~1s)
const _THEME_CYCLE = _THEME_HOLD + _THEME_FADE;
function getMenuTint() {
    const t = AMBIENT.tick;
    const slot = Math.floor(t / _THEME_CYCLE);
    const phase = t % _THEME_CYCLE;
    const cur = MENU_THEMES[slot % MENU_THEMES.length];
    const nxt = MENU_THEMES[(slot + 1) % MENU_THEMES.length];
    const blend = phase < _THEME_HOLD ? 0 : (phase - _THEME_HOLD) / _THEME_FADE;
    const [h1, s1, l1] = cur.hsl(t);
    const [h2, s2, l2] = nxt.hsl(t);
    // Shortest-path hue lerp
    let hd = h2 - h1;
    if (hd > 180)
        hd -= 360;
    if (hd < -180)
        hd += 360;
    const h = (h1 + hd * blend + 360) % 360;
    const s = s1 + (s2 - s1) * blend;
    const l = l1 + (l2 - l1) * blend;
    return `hsl(${h.toFixed(1)}, ${s.toFixed(1)}%, ${l.toFixed(1)}%)`;
}
function getMenuThemeName() {
    const slot = Math.floor(AMBIENT.tick / _THEME_CYCLE);
    return MENU_THEMES[slot % MENU_THEMES.length]?.name || 'farm';
}
/* ─── Escape routing ─── */
function menuHandleEscape() {
    const screen = document.getElementById('menu-screen');
    if (!screen)
        return false;
    const isHidden = screen.classList.contains('hidden');
    if (!isHidden) {
        if (MENU_FLOW.view === 'settings-confirm') {
            menuSettingsPromptAction('cancel');
            return true;
        }
        if (MENU_FLOW.view !== 'main') {
            menuSetView('main');
            return true;
        }
        if (menuPauseMode) {
            resumeGame();
            return true;
        }
        return true;
    }
    if (gameState === 'playing') {
        openMenu();
        return true;
    }
    return false;
}
/* ─── Arrow-key navigation inside menu views ─── */
document.addEventListener('keydown', e => {
    if (!isMenuVisible())
        return;
    if (e.code !== 'ArrowUp' && e.code !== 'ArrowDown')
        return;
    const active = document.querySelector('.menu-view.active');
    if (!active)
        return;
    const btns = Array.from(active.querySelectorAll('button:not([disabled])')).filter(b => b.offsetParent !== null);
    if (btns.length === 0)
        return;
    e.preventDefault();
    const focused = document.activeElement;
    const idx = btns.indexOf(focused);
    if (e.code === 'ArrowDown') {
        btns[(idx + 1) % btns.length].focus({ preventScroll: true });
    }
    else {
        btns[(idx - 1 + btns.length) % btns.length].focus({ preventScroll: true });
    }
});
