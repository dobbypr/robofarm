describe('GameActions', () => {
  it('registers and runs an action', () => {
    let ran = false;
    GameActions.register('test:action1', () => { ran = true; });
    const result = GameActions.run('test:action1');
    assert(ran);
    assertEqual(result, true);
  });

  it('returns false for unknown actions', () => {
    const result = GameActions.run('nonexistent:action');
    assertEqual(result, false);
  });

  it('passes context to handler', () => {
    let received = null;
    GameActions.register('test:action2', ctx => { received = ctx; });
    GameActions.run('test:action2', { tx: 5, ty: 10 });
    assertEqual(received.tx, 5);
    assertEqual(received.ty, 10);
  });

  it('has() reports registered actions', () => {
    GameActions.register('test:action3', () => {});
    assert(GameActions.has('test:action3'));
    assert(!GameActions.has('test:missing'));
  });

  it('list() returns all registered action names', () => {
    GameActions.register('test:listA', () => {});
    GameActions.register('test:listB', () => {});
    const names = GameActions.list();
    assert(names.includes('test:listA'));
    assert(names.includes('test:listB'));
  });

  it('later registration overwrites earlier', () => {
    let version = 0;
    GameActions.register('test:overwrite', () => { version = 1; });
    GameActions.register('test:overwrite', () => { version = 2; });
    GameActions.run('test:overwrite');
    assertEqual(version, 2);
  });
});
