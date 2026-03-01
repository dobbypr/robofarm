/* ═══════════════════════════════════════════════════════════════════════════
 * INPUT
 * ═══════════════════════════════════════════════════════════════════════════ */
const keys = {};
let mouseWorld = { x: 0, y: 0 };
let mouseScreen = { x: 0, y: 0 };

document.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Digit1') selectTool('hand');
  else if (e.code === 'Digit2') selectTool('hoe');
  else if (e.code === 'Digit3') selectTool('water');
  else if (e.code === 'Digit4') selectTool('wheat');
  else if (e.code === 'Digit5') selectTool('carrot');
  else if (e.code === 'Digit6') selectTool('corn');
  else if (e.code === 'Digit7') selectTool('sunflower');
  else if (e.code === 'Digit8') selectTool('potato');
  else if (e.code === 'Digit9') selectTool('robot_place');
  else if (e.code === 'KeyE') openModal('shop');
  else if (e.code === 'KeyR') openModal('robots');
  else if (e.code === 'KeyF') openModal('docs');
  else if (e.code === 'KeyI') openModal('inventory');
  else if (e.code === 'Escape') { closeAllModals(); cancelAssign(); }
});
document.addEventListener('keyup', e => { keys[e.code] = false; });

const canvas = document.getElementById('game');
const cursorCanvas = document.getElementById('cursor-canvas');
const cc = cursorCanvas.getContext('2d');

canvas.addEventListener('mousemove', e => {
  mouseScreen = { x: e.clientX, y: e.clientY };
  const wx = (e.clientX - camera.x) / camera.zoom;
  const wy = (e.clientY - camera.y) / camera.zoom;
  mouseWorld = { x: wx, y: wy };
  updateCursorCanvas();
  updateCropTooltip(e.clientX, e.clientY);
});

canvas.addEventListener('click', e => {
  const tx = Math.floor(mouseWorld.x / TILE);
  const ty = Math.floor(mouseWorld.y / TILE);
  handleTileClick(tx, ty, e);
});

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  camera.zoom = Math.max(0.5, Math.min(3.0, camera.zoom - e.deltaY * 0.001));
}, { passive: false });
