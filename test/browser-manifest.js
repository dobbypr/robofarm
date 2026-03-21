(function initBrowserTestManifest(global) {
  if (!global) return;

  global.RF_BROWSER_TEST_MANIFEST = {
    sourceFiles: [
      'core.js',
      'events.js',
      'actions.js',
      'store.js',
    ],
    testFiles: [
      'test/events.test.js',
      'test/actions.test.js',
      'test/store.test.js',
      'test/core.test.js',
    ],
  };
})(typeof window !== 'undefined' ? window : globalThis);
