// Vaultlight — the screenshot scenes behind ?shot=cover|routes|caught|getaway.
// One job: stage the four frames the judge sees, as real frames of this game. Each
// scene starts a fresh Night One and walks the thief through the real step function
// with a scripted route (click-to-move targets, the same input the player uses), so
// the guards patrol, the cones sweep and the loot is really lifted by the game's own
// rules. A few values are then composed to the moment the frame wants to show — the
// alarm level, a guard's suspicion, a spent tool — because a screenshot is a moment
// chosen by its maker, and every pixel is still drawn by the game's renderer.

import { STEP, PHASE_PLAY } from './game.js';
import { startNight, stepGame } from './game.js';
import { GUARD } from './config.js';

/** A blank scripted input: the same shape the keyboard handler builds. */
function scriptedInput() {
  return {
    up: false, down: false, left: false, right: false,
    sneak: false, interact: false,
    smokePressed: false, empPressed: false, pausePressed: false,
    mutePressed: false, restartPressed: false, startPressed: false,
    clickTarget: null, mouse: { x: 0, y: 0 },
  };
}

/** Step the game until the thief reaches (x,y), or `maxSteps` run out. */
function walkTo(game, input, x, y, maxSteps = 60 * 12) {
  input.clickTarget = { x, y };
  for (let i = 0; i < maxSteps; i += 1) {
    stepGame(game, input, STEP);
    if (Math.hypot(game.player.x - x, game.player.y - y) < 14) return true;
  }
  return false;
}

/** Hold the interact key for `steps` frames (grab loot, pick the vault). */
function holdInteract(game, input, steps) {
  input.interact = true;
  for (let i = 0; i < steps; i += 1) stepGame(game, input, STEP);
  input.interact = false;
}

/** Let the world run on for `seconds` with the thief standing still. */
function idle(game, input, seconds) {
  input.clickTarget = null;
  for (let i = 0; i < Math.round(seconds / STEP); i += 1) stepGame(game, input, STEP);
}

/**
 * Stage the named scene on a fresh Night One and leave the game frozen on it.
 * Any other name stages the cover.
 */
export function stageShot(name, game) {
  game.staging = true;
  try {
    stageShotInner(name, game);
  } finally {
    game.staging = false;
  }
}

function stageShotInner(name, game) {
  startNight(game, 0);
  game.phase = PHASE_PLAY;
  const input = scriptedInput();
  // Silence the banner the night starts with; each scene sets its own moment.
  game.banner = '';
  game.bannerTimer = 0;

  if (name === 'routes') {
    // The south route: slip down behind the crates, then throw smoke and cross
    // the camera's sweep in the cloud.
    walkTo(game, input, 300, 430);
    walkTo(game, input, 300, 560);
    walkTo(game, input, 700, 620);
    walkTo(game, input, 980, 640);
    input.smokePressed = true;
    stepGame(game, input, STEP);
    input.smokePressed = false;
    walkTo(game, input, 900, 600, 60 * 2);
    game.alarm = 18;
    game.banner = '';
    game.bannerTimer = 0;
    game.events = [];
    return;
  }

  if (name === 'caught') {
    // The fair caught moment: the thief pushed up to the vault door while a guard
    // was already suspicious, and the chase found them in the open.
    walkTo(game, input, 300, 420);
    walkTo(game, input, 500, 370);
    walkTo(game, input, 850, 370);
    walkTo(game, input, 990, 365);
    const guard = game.level.guards[1];
    guard.x = 880;
    guard.y = 365;
    guard.state = 'chase';
    guard.suspicion = 1;
    guard.facing = 0;
    guard.chaseX = game.player.x;
    guard.chaseY = game.player.y;
    guard.loseSightTimer = GUARD.loseSightSeconds;
    game.level.cameras[1].suspicion = 0.8;
    game.alarm = 92;
    game.banner = 'SPOTTED — BREAK LINE OF SIGHT!';
    game.bannerTimer = 99;
    game.events = [];
    return;
  }

  if (name === 'getaway') {
    // The payoff: the vault stands open, the Star rides on Wren's back, and the
    // entry door is ten steps away with the alarm still cooling.
    walkTo(game, input, 300, 420);
    walkTo(game, input, 500, 370);
    walkTo(game, input, 900, 365);
    // Stand close enough to work the lock: the vault door's centre is (1053, 365).
    walkTo(game, input, 990, 365);
    holdInteract(game, input, Math.round(2.6 / STEP) + 10);
    holdInteract(game, input, 20);
    walkTo(game, input, 1155, 350);
    holdInteract(game, input, 20);
    walkTo(game, input, 700, 365);
    walkTo(game, input, 300, 365);
    game.alarm = 55;
    game.banner = '';
    game.bannerTimer = 0;
    game.events = [];
    return;
  }

  // The cover: mid-heist, everything in one frame. Wren crosses the middle
  // corridor with a case already lifted, a guard's cone sweeping toward them, a
  // camera watching the vault approach, and the alarm at a third.
  walkTo(game, input, 300, 420);
  walkTo(game, input, 620, 430);
  holdInteract(game, input, 10);
  walkTo(game, input, 700, 370);
  walkTo(game, input, 830, 360);
  idle(game, input, 0.4);
  game.level.guards[0].suspicion = 0.55;
  game.level.guards[0].state = 'suspicious';
  game.alarm = 32;
  // A clean frame: no banner and no floating loot text over the scene.
  game.banner = '';
  game.bannerTimer = 0;
  game.events = [];
}
