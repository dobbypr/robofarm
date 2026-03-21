(function initBrowserTestAsserts(global) {
  if (!global) return;

  function assert(cond, msg) {
    if (!cond) {
      throw new Error(msg || 'assertion failed');
    }
  }

  function assertEqual(actual, expected, msg) {
    if (actual !== expected) {
      throw new Error(msg || ('expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual)));
    }
  }

  global.assert = assert;
  global.assertEqual = assertEqual;
})(typeof window !== 'undefined' ? window : globalThis);
