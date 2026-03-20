// flags.js — Feature-flag runtime helper
// Loads after settings.js so S.flags is already normalized.
//
// Console usage:
//   RF_FLAGS.list()                       // table of all flags & their values
//   RF_FLAGS.get('godMode')               // read a flag
//   RF_FLAGS.set('debugOverlay', true)    // enable at runtime
//   RF_FLAGS.toggle('fastGrowth')         // flip a boolean flag
//   RF_FLAGS.reset()                      // restore to settings.js defaults
//
// URL shortcuts (append to index.html URL):
//   ?flags=debugOverlay,godMode           // enable multiple flags
//   ?flag_godMode=true                    // single flag override
//   ?flag_fastGrowth=false                // explicit disable
(function () {
    const S = window.GAME_SETTINGS;
    if (!S || !S.flags) return; // guard: settings.js must load first

    // Snapshot defaults (values after settings.js IIFE ran) for reset().
    const _defaults = Object.assign({}, S.flags);

    // ── Debug overlay ────────────────────────────────────────────────────────
    let _overlayEl = null;
    let _rafId     = null;

    function _createOverlay() {
        if (_overlayEl) return;
        _overlayEl = document.createElement('div');
        _overlayEl.id = 'rf-debug-overlay';
        Object.assign(_overlayEl.style, {
            position:        'fixed',
            top:             '6px',
            left:            '6px',
            zIndex:          '99999',
            background:      'rgba(0,0,0,0.72)',
            color:           '#a3e635',
            fontFamily:      'monospace',
            fontSize:        '11px',
            lineHeight:      '1.55',
            padding:         '6px 10px',
            borderRadius:    '4px',
            pointerEvents:   'none',
            whiteSpace:      'pre',
            display:         'none',
        });
        document.body.appendChild(_overlayEl);
    }

    let _lastFrameTime = performance.now();
    let _fps           = 0;
    let _frameCount    = 0;

    function _updateOverlay() {
        _rafId = requestAnimationFrame(_updateOverlay);

        const now = performance.now();
        _frameCount++;
        if (now - _lastFrameTime >= 500) {
            _fps = Math.round(_frameCount / ((now - _lastFrameTime) / 1000));
            _frameCount     = 0;
            _lastFrameTime  = now;
        }

        if (!S.flags.debugOverlay) {
            if (_overlayEl) _overlayEl.style.display = 'none';
            return;
        }
        _createOverlay();
        _overlayEl.style.display = 'block';

        // Read globals set by state.js (may be undefined if game not started yet)
        const lines = [
            'RF DEBUG OVERLAY',
            '─────────────────',
            'FPS     : ' + _fps,
            'tick    : ' + (typeof tick     !== 'undefined' ? tick     : '—'),
            'day     : ' + (typeof day      !== 'undefined' ? day      : '—'),
            'season  : ' + (typeof season   !== 'undefined' ? season   : '—'),
            'weather : ' + (typeof weatherType !== 'undefined' ? weatherType : '—'),
            'coins   : ' + (typeof coins    !== 'undefined' ? coins    : '—'),
        ];

        // Show any active flags
        const active = Object.entries(S.flags).filter(([, v]) => v).map(([k]) => k);
        if (active.length) lines.push('flags   : ' + active.join(', '));

        _overlayEl.textContent = lines.join('\n');
    }

    function _startOverlayLoop() {
        if (_rafId == null) _updateOverlay();
    }

    // ── Public API ───────────────────────────────────────────────────────────
    const RF_FLAGS = {
        /**
         * Read the current value of a flag.
         * @param {string} name
         */
        get(name) {
            return S.flags[name];
        },

        /**
         * Set a flag value. Logs to console and applies immediate side-effects.
         * @param {string} name
         * @param {*} value
         */
        set(name, value) {
            if (!(name in S.flags)) {
                console.warn(
                    '[RF_FLAGS] Unknown flag "' + name + '". ' +
                    'Known flags: ' + Object.keys(S.flags).join(', ')
                );
                return;
            }
            S.flags[name] = value;
            console.info('[RF_FLAGS] ' + name + ' = ' + value);
            this._applyEffect(name, value);
        },

        /**
         * Toggle a boolean flag.
         * @param {string} name
         */
        toggle(name) {
            this.set(name, !this.get(name));
        },

        /**
         * Print a console.table of all flags, their current values, and defaults.
         */
        list() {
            const rows = {};
            for (const [k, v] of Object.entries(S.flags)) {
                rows[k] = { value: v, default: _defaults[k], changed: v !== _defaults[k] };
            }
            console.table(rows);
        },

        /**
         * Reset all flags to the values they had when settings.js finished loading.
         */
        reset() {
            Object.assign(S.flags, _defaults);
            console.info('[RF_FLAGS] All flags reset to defaults.');
            // Re-apply effects for flags that may have had side-effects.
            for (const [k, v] of Object.entries(S.flags)) this._applyEffect(k, v);
        },

        // Internal: immediate side-effects when a flag changes at runtime.
        _applyEffect(name, value) {
            if (name === 'noWeather' && value) {
                if (typeof setWeather === 'function') setWeather('clear');
            }
            if (name === 'debugOverlay' && value) {
                _startOverlayLoop();
            }
        },
    };

    window.RF_FLAGS = RF_FLAGS;

    // Start the overlay rAF loop (it sleeps when debugOverlay is false).
    // We defer until DOMContentLoaded so document.body exists.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _startOverlayLoop);
    } else {
        _startOverlayLoop();
    }

    // Announce any flags that were enabled via URL / settings at startup.
    const active = Object.entries(S.flags).filter(([, v]) => v).map(([k]) => k);
    if (active.length) {
        console.info(
            '%c[RF_FLAGS] Active: ' + active.join(', '),
            'color:#4ade80;font-weight:bold'
        );
    }
})();
