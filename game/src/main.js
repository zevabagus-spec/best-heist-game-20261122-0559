// Vaultlight — entry point: the canvas, the fixed-step loop, the screenshot mode.
// One job: start the game and keep it stepping. In normal play it runs the loop at a
// fixed 60 Hz step and draws every frame. With ?shot=<name> it stages that scene
// from the real game rules and draws exactly one frozen frame, so the screenshot a
// headless browser takes is the same frame every time.

import { VIEW, STEP } from './config.js';
import { createGame, stepGame } from './game.js';
import { render } from './render.js';
import { createInput, clearPressed } from './input.js';
import { stageShot } from './shots.js';
import { unlockAudio, toggleMute } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.width;
canvas.height = VIEW.height;

const game = createGame();
const input = createInput(canvas);

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
if (shotName) {
  // Screenshot mode: stage the scene and draw one frozen frame.
  stageShot(shotName, game);
  render(ctx, game);
  document.title = `Vaultlight — shot ${shotName}`;
} else {
  // Normal play: fixed-step updates, one render per animation frame.
  let last = performance.now();
  let accumulator = 0;
  function frame(now) {
    accumulator += Math.min(0.1, (now - last) / 1000);
    last = now;
    while (accumulator >= STEP) {
      stepGame(game, input, STEP);
      accumulator -= STEP;
    }
    render(ctx, game);
    requestAnimationFrame(frame);
  }
  window.addEventListener('keydown', (event) => {
    unlockAudio();
    if (event.code === 'KeyM') {
      const muted = toggleMute();
      game.banner = muted ? 'Sound off' : 'Sound on';
      game.bannerTimer = 1;
    }
    void clearPressed;
  });
  canvas.addEventListener('mousedown', unlockAudio);
  requestAnimationFrame(frame);
}
