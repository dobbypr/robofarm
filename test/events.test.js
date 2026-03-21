describe('GameBus', () => {
  it('calls listeners on emit', () => {
    let called = false;
    GameBus.on('test:a', () => { called = true; });
    GameBus.emit('test:a');
    assert(called);
    GameBus.clear('test:a');
  });

  it('passes data to listeners', () => {
    let received = null;
    GameBus.on('test:b', d => { received = d; });
    GameBus.emit('test:b', { x: 42 });
    assertEqual(received.x, 42);
    GameBus.clear('test:b');
  });

  it('once listeners fire only once', () => {
    let count = 0;
    GameBus.once('test:c', () => { count++; });
    GameBus.emit('test:c');
    GameBus.emit('test:c');
    assertEqual(count, 1);
  });

  it('off removes a specific listener', () => {
    let count = 0;
    const fn = () => { count++; };
    GameBus.on('test:d', fn);
    GameBus.emit('test:d');
    GameBus.off('test:d', fn);
    GameBus.emit('test:d');
    assertEqual(count, 1);
  });

  it('supports multiple listeners on same event', () => {
    let a = 0, b = 0;
    GameBus.on('test:e', () => { a++; });
    GameBus.on('test:e', () => { b++; });
    GameBus.emit('test:e');
    assertEqual(a, 1);
    assertEqual(b, 1);
    GameBus.clear('test:e');
  });

  it('clear with no args removes all listeners', () => {
    let called = false;
    GameBus.on('test:f', () => { called = true; });
    GameBus.clear();
    GameBus.emit('test:f');
    assert(!called);
  });

  it('emit on unknown event does not throw', () => {
    GameBus.emit('nonexistent:event', { x: 1 });
    assert(true);
  });
});
