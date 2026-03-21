describe('GameStore', () => {
  it('watches and gets a value', () => {
    let val = 100;
    GameStore.watch('test:coins', {
      get: () => val,
      set: v => { val = v; },
    });
    assertEqual(GameStore.get('test:coins'), 100);
  });

  it('sets a value and returns true', () => {
    let val = 100;
    GameStore.watch('test:coins2', {
      get: () => val,
      set: v => { val = v; },
    });
    const ok = GameStore.set('test:coins2', 200, 'test');
    assertEqual(ok, true);
    assertEqual(val, 200);
    assertEqual(GameStore.get('test:coins2'), 200);
  });

  it('rejects invalid values via validate', () => {
    let val = 50;
    GameStore.watch('test:coins3', {
      get: () => val,
      set: v => { val = v; },
      validate: v => Number.isFinite(v) && v >= 0,
    });
    const ok = GameStore.set('test:coins3', -10, 'test');
    assertEqual(ok, false);
    assertEqual(val, 50, 'value should not have changed');
  });

  it('add() applies delta', () => {
    let val = 100;
    GameStore.watch('test:coins4', {
      get: () => val,
      set: v => { val = v; },
    });
    GameStore.add('test:coins4', -30, 'spend');
    assertEqual(val, 70);
  });

  it('emits state: event on GameBus when set', () => {
    let val = 10;
    GameStore.watch('test:coins5', {
      get: () => val,
      set: v => { val = v; },
    });
    let emitted = null;
    GameBus.on('state:test:coins5', e => { emitted = e; });
    GameStore.set('test:coins5', 20, 'reward');
    assert(emitted !== null);
    assertEqual(emitted.prev, 10);
    assertEqual(emitted.next, 20);
    assertEqual(emitted.reason, 'reward');
    GameBus.clear('state:test:coins5');
  });

  it('returns false for unknown keys', () => {
    const ok = GameStore.set('nonexistent:key', 42, 'test');
    assertEqual(ok, false);
  });

  it('has() and keys() work', () => {
    GameStore.watch('test:flag', {
      get: () => true,
      set: () => {},
    });
    assert(GameStore.has('test:flag'));
    assert(!GameStore.has('test:nope'));
    assert(GameStore.keys().includes('test:flag'));
  });
});
