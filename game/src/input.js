// Vaultlight — keyboard and mouse input.
// One job: turn keys and clicks into the thief's intentions. WASD or arrows walk,
// Shift sneaks, E interacts, 1 throws smoke, 2 fires the EMP, P pauses, M mutes, R
// restarts a finished night, Enter starts. Clicking the floor sets a click-to-move
// target; any movement key cancels it. The canvas scales to the window, so clicks are
// mapped back into the game's 1280x720 coordinates.

import { VIEW } from './config.js';

export function createInput(canvas) {
  const input = {
    up: false,
    down: false,
    left: false,
    right: false,
    sneak: false,
    interact: false,
    // Edge-triggered actions: consumed once by the game loop, then cleared.
    smokePressed: false,
    empPressed: false,
    pausePressed: false,
    mutePressed: false,
    restartPressed: false,
    startPressed: false,
    // Click-to-move target in game coordinates, or null.
    clickTarget: null,
    mouse: { x: 0, y: 0 },
  };

  const KEYMAP = {
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
    ShiftLeft: 'sneak', ShiftRight: 'sneak',
    KeyE: 'interact',
  };

  function onKeyDown(event) {
    if (event.code in KEYMAP) {
      input[KEYMAP[event.code]] = true;
      input.clickTarget = null;
      event.preventDefault();
      return;
    }
    if (event.repeat) return;
    if (event.code === 'Digit1') input.smokePressed = true;
    else if (event.code === 'Digit2') input.empPressed = true;
    else if (event.code === 'KeyP') input.pausePressed = true;
    else if (event.code === 'KeyM') input.mutePressed = true;
    else if (event.code === 'KeyR') input.restartPressed = true;
    else if (event.code === 'Enter' || event.code === 'Space') input.startPressed = true;
  }

  function onKeyUp(event) {
    if (event.code in KEYMAP) input[KEYMAP[event.code]] = false;
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * VIEW.width,
      y: ((event.clientY - rect.top) / rect.height) * VIEW.height,
    };
  }

  function onMouseMove(event) {
    input.mouse = canvasPoint(event);
  }

  function onMouseDown(event) {
    const point = canvasPoint(event);
    input.mouse = point;
    input.clickTarget = { x: point.x, y: point.y };
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  return input;
}

/** The movement direction from keys, or from the click target, as a unit vector. */
export function moveDirection(input, player) {
  let x = 0;
  let y = 0;
  if (input.up) y -= 1;
  if (input.down) y += 1;
  if (input.left) x -= 1;
  if (input.right) x += 1;
  if (x !== 0 || y !== 0) {
    const length = Math.hypot(x, y);
    return { x: x / length, y: y / length };
  }
  if (input.clickTarget) {
    const dx = input.clickTarget.x - player.x;
    const dy = input.clickTarget.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 8) {
      input.clickTarget = null;
      return { x: 0, y: 0 };
    }
    return { x: dx / dist, y: dy / dist };
  }
  return { x: 0, y: 0 };
}

/** Clear the edge-triggered presses after the game loop has read them. */
export function clearPressed(input) {
  input.smokePressed = false;
  input.empPressed = false;
  input.pausePressed = false;
  input.mutePressed = false;
  input.restartPressed = false;
  input.startPressed = false;
}
