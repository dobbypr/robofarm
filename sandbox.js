/* ═══════════════════════════════════════════════════════════════════════════
 * SECURE ROBOT CODE SANDBOX
 * Robot code runs here. Can see robot + api. Nothing else.
 * ═══════════════════════════════════════════════════════════════════════════ */
const SANDBOX_BLOCKED = Object.freeze([
  'window','document','self','globalThis','parent','top','frames',
  'fetch','XMLHttpRequest','WebSocket','EventSource','Worker',
  'Function','setTimeout','clearTimeout','setInterval','clearInterval',
  'requestAnimationFrame','cancelAnimationFrame','queueMicrotask',
  'navigator','location','history','screen','crypto',
  'localStorage','sessionStorage','indexedDB','caches',
  'performance','console','alert','confirm','prompt',
  'open','close','print','focus','blur',
]);

const _SANDBOX_UNDEFINEDS = SANDBOX_BLOCKED.map(() => undefined);
function _blockedEval() {
  throw new Error('eval is disabled inside robot sandbox code.');
}

function compileRobotCode(robot) {
  if (!robot.customCode || robot.customCode.trim() === '') { robot.compiledCode = null; robot.codeError = ''; return; }
  try {
    const fnArgs = [...SANDBOX_BLOCKED, '__blocked_eval', 'robot', 'api'];
    const body = [
      'const eval = __blocked_eval;',
      'return (function(){',
      '"use strict";',
      robot.customCode,
      '})();',
    ].join('\n');
    robot.compiledCode = new Function(...fnArgs, body);
    robot.codeError = '';
  } catch(e) { robot.compiledCode = null; robot.codeError = e.message; }
}

function runSandboxed(robot, fn) {
  fn(..._SANDBOX_UNDEFINEDS, _blockedEval, robot, robotAPI);
}
