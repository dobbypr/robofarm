/* ═══════════════════════════════════════════════════════════════════════════
 * ACTION REGISTRY
 * Named-action dispatch for tools, interactions, and keybindings.
 * ═══════════════════════════════════════════════════════════════════════════ */
(function initActions(global) {
  if (!global || global.GameActions) return;

  const _handlers = {};   // { actionName: handlerFn }

  const Actions = {
    register(name, fn) {
      _handlers[name] = fn;
    },

    run(name, ctx) {
      const fn = _handlers[name];
      if (!fn) return false;
      fn(ctx);
      return true;
    },

    has(name) {
      return !!_handlers[name];
    },

    list() {
      return Object.keys(_handlers);
    },
  };

  global.GameActions = Actions;
})(typeof window !== 'undefined' ? window : globalThis);
