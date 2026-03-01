/* ═══════════════════════════════════════════════════════════════════════════
 * SECURE ROBOT CODE SANDBOX
 * Robot code runs here. Can see robot + api. Nothing else.
 * ═══════════════════════════════════════════════════════════════════════════ */
const SANDBOX_BLOCKED = [
  'window','document','self','globalThis','parent','top','frames',
  'fetch','XMLHttpRequest','WebSocket','EventSource','Worker',
  'eval','Function','setTimeout','clearTimeout','setInterval','clearInterval',
  'requestAnimationFrame','cancelAnimationFrame','queueMicrotask',
  'navigator','location','history','screen','crypto',
  'localStorage','sessionStorage','indexedDB','caches',
  'performance','console','alert','confirm','prompt',
  'open','close','print','focus','blur',
];

function compileRobotCode(robot) {
  if (!robot.customCode || robot.customCode.trim() === '') { robot.compiledCode = null; robot.codeError = ''; return; }
  try {
    const fnArgs = [...SANDBOX_BLOCKED, 'robot', 'api'];
    robot.compiledCode = new Function(...fnArgs, '"use strict";\n' + robot.customCode);
    robot.codeError = '';
  } catch(e) { robot.compiledCode = null; robot.codeError = e.message; }
}

function runSandboxed(robot, fn) {
  const blockedVals = SANDBOX_BLOCKED.map(() => undefined);
  fn(...blockedVals, robot, robotAPI);
}
