describe('RF_UTIL', () => {
  it('clamp works correctly', () => {
    assertEqual(RF_UTIL.clamp(5, 0, 10), 5);
    assertEqual(RF_UTIL.clamp(-1, 0, 10), 0);
    assertEqual(RF_UTIL.clamp(15, 0, 10), 10);
  });

  it('clamp handles swapped min/max', () => {
    assertEqual(RF_UTIL.clamp(5, 10, 0), 5);
    assertEqual(RF_UTIL.clamp(-1, 10, 0), 0);
  });

  it('toNumber converts correctly', () => {
    assertEqual(RF_UTIL.toNumber('42'), 42);
    assertEqual(RF_UTIL.toNumber('abc', 7), 7);
    assertEqual(RF_UTIL.toNumber(null), 0);
  });

  it('toInt floors the result', () => {
    assertEqual(RF_UTIL.toInt(3.7), 3);
    assertEqual(RF_UTIL.toInt('5.9'), 5);
  });

  it('normalizeCropType validates against settings', () => {
    assertEqual(RF_UTIL.normalizeCropType('wheat'), 'wheat');
    assertEqual(RF_UTIL.normalizeCropType('carrot'), 'carrot');
    assertEqual(RF_UTIL.normalizeCropType('unobtanium'), null);
    assertEqual(RF_UTIL.normalizeCropType(42), null);
  });

  it('safeObject returns object or empty', () => {
    const obj = { a: 1 };
    assert(RF_UTIL.safeObject(obj) === obj);
    assert(typeof RF_UTIL.safeObject(null) === 'object');
    assert(typeof RF_UTIL.safeObject(undefined) === 'object');
  });

  it('safeArray returns array or empty', () => {
    const arr = [1, 2];
    assert(RF_UTIL.safeArray(arr) === arr);
    assert(Array.isArray(RF_UTIL.safeArray(null)));
    assert(RF_UTIL.safeArray('string').length === 0);
  });

  it('getRobotById finds by id', () => {
    const bots = [{ id: 'a' }, { id: 'b' }];
    assertEqual(RF_UTIL.getRobotById('b', bots).id, 'b');
    assertEqual(RF_UTIL.getRobotById('z', bots), null);
  });

  it('getRobotAtTile finds by position', () => {
    const bots = [{ tileX: 3, tileY: 5 }, { tileX: 7, tileY: 2 }];
    assertEqual(RF_UTIL.getRobotAtTile(7, 2, bots).tileX, 7);
    assertEqual(RF_UTIL.getRobotAtTile(0, 0, bots), null);
  });
});
