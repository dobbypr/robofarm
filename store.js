/* ═══════════════════════════════════════════════════════════════════════════
 * STATE STORE
 * Observable wrapper around existing globals — adds change notification
 * and optional validation without replacing the underlying variables.
 * ═══════════════════════════════════════════════════════════════════════════ */
(function initStore(global) {
  if (!global || global.GameStore) return;

  const _watched = {};   // { key: { get, set, validate? } }

  const Store = {
    /** Register a state key to watch. */
    watch(key, desc) {
      _watched[key] = desc;
    },

    get(key) {
      const w = _watched[key];
      return w ? w.get() : undefined;
    },

    set(key, value, reason) {
      const w = _watched[key];
      if (!w) return false;
      if (w.validate && !w.validate(value)) return false;
      const prev = w.get();
      w.set(value);
      if (global.GameBus) {
        global.GameBus.emit('state:' + key, { key, prev, next: w.get(), reason });
      }
      return true;
    },

    /** Convenience: delta for numeric state. */
    add(key, delta, reason) {
      return Store.set(key, Store.get(key) + delta, reason);
    },

    has(key) {
      return !!_watched[key];
    },

    keys() {
      return Object.keys(_watched);
    },
  };

  global.GameStore = Store;
})(typeof window !== 'undefined' ? window : globalThis);
