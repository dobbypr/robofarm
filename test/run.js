/* ═══════════════════════════════════════════════════════════════════════════
 * MINIMAL TEST RUNNER
 * Zero-dependency Node.js test runner for Robofarm infrastructure.
 * Usage: node test/run.js
 * ═══════════════════════════════════════════════════════════════════════════ */
let _pass = 0;
let _fail = 0;
let _current = '';

/* ── Shim browser globals ─────────────────────────────────────────────── */
globalThis.window = globalThis;
globalThis.document = {
  getElementById: () => null,
  createElement: () => ({ style: {} }),
  addEventListener: () => {},
};
globalThis.requestAnimationFrame = () => {};
globalThis.requestIdleCallback = () => {};

/* ── Minimal GAME_SETTINGS stub ───────────────────────────────────────── */
globalThis.GAME_SETTINGS = {
  crops: { wheat: { name: 'Wheat' }, carrot: { name: 'Carrot' } },
  robots: {},
  player: {},
  time: {},
  display: {},
  flags: {},
};
globalThis.S = globalThis.GAME_SETTINGS;
globalThis.robots = [];

/* ── Test helpers ─────────────────────────────────────────────────────── */
function describe(name, fn) {
  _current = name;
  fn();
}

function it(name, fn) {
  try {
    fn();
    _pass++;
    console.log(`  \x1b[32m✓\x1b[0m ${_current} › ${name}`);
  } catch (e) {
    _fail++;
    console.log(`  \x1b[31m✗\x1b[0m ${_current} › ${name}: ${e.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(msg || `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

/* ── Expose to test files ─────────────────────────────────────────────── */
globalThis.describe = describe;
globalThis.it = it;
globalThis.assert = assert;
globalThis.assertEqual = assertEqual;

/* ── Load source files in order ───────────────────────────────────────── */
require('../core.js');
require('../events.js');
require('../actions.js');
require('../store.js');

/* ── Load test suites ─────────────────────────────────────────────────── */
console.log('\n  Robofarm test suite\n');
require('./events.test.js');
require('./actions.test.js');
require('./store.test.js');
require('./core.test.js');

/* ── Summary ──────────────────────────────────────────────────────────── */
console.log(`\n  ${_pass} passed, ${_fail} failed\n`);
process.exit(_fail > 0 ? 1 : 0);
