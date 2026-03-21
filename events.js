/* ═══════════════════════════════════════════════════════════════════════════
 * EVENT BUS
 * Lightweight pub/sub for decoupled game-event communication.
 * ═══════════════════════════════════════════════════════════════════════════ */
(function initEventBus(global) {
  if (!global || global.GameBus) return;

  const _listeners = {};   // { eventName: [{ fn, once }] }

  const bus = {
    on(event, fn) {
      (_listeners[event] ||= []).push({ fn, once: false });
      return bus;
    },

    once(event, fn) {
      (_listeners[event] ||= []).push({ fn, once: true });
      return bus;
    },

    off(event, fn) {
      const arr = _listeners[event];
      if (arr) _listeners[event] = arr.filter(h => h.fn !== fn);
      return bus;
    },

    emit(event, data) {
      const arr = _listeners[event];
      if (!arr) return;
      for (let i = arr.length - 1; i >= 0; i--) {
        const handler = arr[i];
        if (!handler) continue;
        try {
          handler.fn(data);
        } catch (err) {
          if (typeof console !== 'undefined' && typeof console.error === 'function') {
            console.error('GameBus listener error for event "' + event + '":', err);
          }
        }
        if (arr[i] && arr[i].once) arr.splice(i, 1);
      }
    },

    clear(event) {
      if (event) delete _listeners[event];
      else Object.keys(_listeners).forEach(k => delete _listeners[k]);
    },
  };

  global.GameBus = bus;
})(typeof window !== 'undefined' ? window : globalThis);
