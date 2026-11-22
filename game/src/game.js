// Vaultlight — the game itself: state, rules and the fixed-step update.
// One job: own the night. It starts a level, steps the thief, the guards, the
// cameras, the alarm and the loot forward, and decides when a night is won or lost.
// The renderer draws whatever this state says; the screenshot scenes drive this same
// step function with scripted inputs, so a staged frame is a real frame of the game.

import { PLAYER, ALARM, STEP, VIEW } from './config.js';
import { buildLevel, solidRects } from './level.js';
import { stepGuard, stepCamera, moveCircle, pointBlocked } from './guards.js';
import { segmentBlocked } from './vision.js';
import {
  nearestCase, grabCase, nearVaultDoor, stepLockpick, nearStar, grabStar,
  useSmoke, useEmp, finishBonus,
} from './loot.js';
import { moveDirection, clearPressed } from './input.js';
import {
  playStep, playPickup, playVaultOpen, playStar, playTool, playSpotted,
  playGetaway, playCaught, startSiren, stopSiren,
} from './audio.js';

export const PHASE_TITLE = 'title';
export const PHASE_PLAY = 'play';
export const PHASE_PAUSED = 'paused';
export const PHASE_CAUGHT = 'caught';
export const PHASE_NIGHT_DONE = 'nightDone';
export const PHASE_WIN = 'win';

/** A small deterministic RNG (mulberry32) so staged scenes render identically. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createGame() {
  const game = {
    phase: PHASE_TITLE,
    levelIndex: 0,
    level: buildLevel(0),
    player: { x: 60, y: 365, radius: PLAYER.radius, facing: 0, sneak: false },
    alarm: 0,
    score: 0,
    focus: 4,
    lootTaken: 0,
    hasStar: false,
    elapsed: 0,
    smokeTimer: 0,
    smokeClouds: [],
    events: [],
    banner: '',
    bannerTimer: 0,
    bonus: null,
    caughtReason: '',
    scoreAtNightStart: 0,
    // While a screenshot scene is being staged, the alarm may spike and a guard may
    // close in, but the night must not end mid-stage: the frame is a moment of real
    // play, composed to the alarm level the scene wants to show. The flag is only
    // ever true inside stageShot, never during real play.
    staging: false,
    // Click-to-move detour state: when the thief pushes against an obstacle without
    // getting closer to the click target, the game steps sideways around it.
    // `current` is the target the progress tracking belongs to, so a fresh click
    // (or the next leg of a scripted walk) restarts tracking instead of tripping a
    // detour on a stale distance from the previous target. `detours` counts the
    // sidesteps tried for the current target: a long wall is not a bench, and after
    // two sidesteps the game stops guessing and waits for the player to steer.
    clickStuck: { timer: 0, lastDist: Infinity, detouring: false, savedTarget: null, current: null, detours: 0 },
    stepTimer: 0,
    sirenOn: false,
    dust: [],
  };
  seedDust(game);
  return game;
}

function seedDust(game) {
  const random = mulberry32(20261122);
  game.dust = [];
  for (let i = 0; i < 90; i += 1) {
    game.dust.push({
      x: 20 + random() * (VIEW.width - 40),
      y: 70 + random() * (VIEW.height - 90),
      size: 1 + random() * 2,
      drift: 2 + random() * 6,
      phase: random() * Math.PI * 2,
    });
  }
}

/** Start (or restart) night `levelIndex`, keeping the running score. */
export function startNight(game, levelIndex) {
  game.levelIndex = levelIndex;
  game.scoreAtNightStart = game.score;
  game.level = buildLevel(levelIndex);
  game.player.x = game.level.entry.x;
  game.player.y = game.level.entry.y;
  game.player.facing = 0;
  game.alarm = 0;
  game.focus = 4;
  game.lootTaken = 0;
  game.hasStar = false;
  game.elapsed = 0;
  game.smokeTimer = 0;
  game.smokeClouds = [];
  game.events = [];
  game.bonus = null;
  game.caughtReason = '';
  game.phase = PHASE_PLAY;
  game.banner = game.level.name;
  game.bannerTimer = 3;
  stopSiren();
  game.sirenOn = false;
}

function showBanner(game, text, seconds = 2.5) {
  game.banner = text;
  game.bannerTimer = seconds;
}

/** One fixed step of the whole night. Called at STEP from the main loop. */
export function stepGame(game, input, dt) {
  if (game.phase === PHASE_TITLE) {
    if (input.startPressed) startNight(game, 0);
    clearPressed(input);
    return;
  }
  if (game.phase === PHASE_PAUSED) {
    if (input.pausePressed || input.startPressed) game.phase = PHASE_PLAY;
    clearPressed(input);
    return;
  }
  if (game.phase === PHASE_CAUGHT || game.phase === PHASE_NIGHT_DONE || game.phase === PHASE_WIN) {
    if (input.restartPressed) {
      if (game.phase === PHASE_CAUGHT) {
        // Retry the night: the points earned in it are lost with it.
        game.score = game.scoreAtNightStart;
        startNight(game, game.levelIndex);
      } else {
        game.score = 0;
        startNight(game, 0);
      }
    } else if (input.startPressed && game.phase === PHASE_NIGHT_DONE) {
      const next = game.levelIndex + 1;
      if (next >= 3) game.phase = PHASE_WIN;
      else startNight(game, next);
    }
    clearPressed(input);
    return;
  }

  // --- PHASE_PLAY ---
  game.elapsed += dt;
  if (game.bannerTimer > 0) game.bannerTimer -= dt;
  if (input.pausePressed) {
    game.phase = PHASE_PAUSED;
    clearPressed(input);
    return;
  }

  const rects = solidRects(game.level);
  const player = game.player;
  player.sneak = input.sneak;

  // Click-to-move detour: if the thief has pushed against an obstacle for half a
  // second without getting closer to the click target, step sideways around it and
  // then resume toward the original target. Without this a straight-line click past
  // a bench or a statue stalls forever, since the slide along the obstacle's face
  // barely moves the thief toward a target almost level with it. A detour point
  // counts only when the thief can actually walk to it: it must sit in open floor
  // with a clear line from the thief, not on the far side of a wall.
  if (input.clickTarget) {
    const target = input.clickTarget;
    const dist = Math.hypot(target.x - player.x, target.y - player.y);
    const stuck = game.clickStuck;
    const targetChanged = !stuck.current
      || Math.abs(stuck.current.x - target.x) > 1
      || Math.abs(stuck.current.y - target.y) > 1;
    if (targetChanged) {
      // A fresh click (from the player, or the next leg of a scripted walk) cancels
      // any detour in progress and restarts progress tracking for the new target.
      stuck.current = { x: target.x, y: target.y };
      stuck.lastDist = Infinity;
      stuck.timer = 0;
      stuck.detouring = false;
      stuck.savedTarget = null;
      stuck.detours = 0;
    }
    if (dist < stuck.lastDist - 0.5) {
      stuck.lastDist = dist;
      stuck.timer = 0;
    } else {
      stuck.timer += dt;
      if (stuck.timer > 0.5 && !stuck.detouring && stuck.detours < 2) {
        const dx = target.x - player.x;
        const dy = target.y - player.y;
        const len = Math.hypot(dx, dy) || 1;
        const px = -dy / len;
        const py = dx / len;
        const candidates = [
          { x: player.x + px * 100, y: player.y + py * 100 },
          { x: player.x - px * 100, y: player.y - py * 100 },
        ];
        const open = candidates.find((c) =>
          !pointBlocked(c.x, c.y, PLAYER.radius + 4, rects)
          && !segmentBlocked(player.x, player.y, c.x, c.y, rects));
        if (open) {
          stuck.savedTarget = { x: target.x, y: target.y };
          stuck.detouring = true;
          stuck.detours += 1;
          input.clickTarget = open;
          stuck.current = { x: open.x, y: open.y };
          stuck.lastDist = Infinity;
          stuck.timer = 0;
        } else {
          stuck.timer = 0;
        }
      } else if (stuck.detouring && stuck.timer > 4) {
        // The detour itself is not working out: abandon it and resume the target.
        input.clickTarget = stuck.savedTarget;
        stuck.current = { ...stuck.savedTarget };
        stuck.detouring = false;
        stuck.savedTarget = null;
        stuck.lastDist = Infinity;
        stuck.timer = 0;
      }
    }
    if (stuck.detouring && Math.hypot(input.clickTarget.x - player.x, input.clickTarget.y - player.y) < 14) {
      input.clickTarget = stuck.savedTarget;
      stuck.current = { ...stuck.savedTarget };
      stuck.detouring = false;
      stuck.savedTarget = null;
      stuck.lastDist = Infinity;
      stuck.timer = 0;
    }
  } else {
    game.clickStuck.timer = 0;
    game.clickStuck.lastDist = Infinity;
    game.clickStuck.detouring = false;
    game.clickStuck.savedTarget = null;
    game.clickStuck.current = null;
    game.clickStuck.detours = 0;
  }

  // Movement: keys first, click-to-move second; sneaking is slower and quieter.
  const dir = moveDirection(input, player);
  const speed = player.sneak ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
  if (dir.x !== 0 || dir.y !== 0) {
    player.facing = Math.atan2(dir.y, dir.x);
    moveCircle(player, dir.x * speed * dt, dir.y * speed * dt, rects);
    game.stepTimer -= dt;
    if (game.stepTimer <= 0) {
      game.stepTimer = player.sneak ? 0.55 : 0.34;
      playStep();
    }
  }

  // Tools.
  if (input.smokePressed && useSmoke(game)) playTool();
  if (input.empPressed && useEmp(game, game.level)) playTool();
  if (game.smokeTimer > 0) game.smokeTimer -= dt;
  for (const cloud of game.smokeClouds) cloud.timer -= dt;
  game.smokeClouds = game.smokeClouds.filter((c) => c.timer > 0);

  // Interact: cases, the vault lock, the Star.
  if (input.interact) {
    const c = nearestCase(player, game.level.cases);
    if (c && grabCase(game, c) > 0) playPickup();
    if (nearStar(player, game.level) && grabStar(game, game.level)) playStar();
  }
  const lockResult = stepLockpick(game, game.level, input.interact && nearVaultDoor(player, game.level), dt);
  if (lockResult === 'done') playVaultOpen();
  if (lockResult === 'picking') game.alarm = Math.min(ALARM.max, game.alarm + ALARM.lockpickRise * dt);

  // Watchers.
  let anyChasing = false;
  let anySuspicious = false;
  for (const guard of game.level.guards) {
    const status = stepGuard(guard, player, rects, game.smokeClouds, dt);
    const touching = Math.hypot(guard.x - player.x, guard.y - player.y) < guard.radius + player.radius + 4;
    if (status === 'chasing') {
      anyChasing = true;
      if (guard.suspicion >= 1 && touching && !game.staging) return caught(game, 'A guard grabbed Wren in the gallery.');
    } else if (status === 'hunting') {
      // A guard hunting a cold trail still grabs the thief if it bumps into them.
      anySuspicious = true;
      if (touching && !game.staging) return caught(game, 'A guard grabbed Wren in the gallery.');
    } else if (status === 'suspicious') anySuspicious = true;
  }
  for (const camera of game.level.cameras) {
    if (stepCamera(camera, player, rects, game.smokeClouds, dt)) anySuspicious = true;
  }

  // Alarm: climbs while seen, cools while hidden; 100 means lockdown.
  if (anyChasing) game.alarm = Math.min(ALARM.max, game.alarm + ALARM.chaseRise * dt);
  else if (anySuspicious) game.alarm = Math.min(ALARM.max, game.alarm + ALARM.suspiciousRise * dt);
  else game.alarm = Math.max(0, game.alarm - game.level.alarmDecay * dt);
  if (game.alarm >= ALARM.sirenAt && !game.sirenOn) {
    game.sirenOn = true;
    startSiren();
  } else if (game.alarm < ALARM.sirenAt - 10 && game.sirenOn) {
    game.sirenOn = false;
    stopSiren();
  }
  if (anySuspicious && !anyChasing && game.bannerTimer <= 0) showBanner(game, 'SPOTTED — break line of sight!', 1.2);
  if (game.alarm >= ALARM.max && !game.staging) return caught(game, 'The alarm hit 100 — lockdown. The gallery is sealed.');

  // Floating event texts drift up and fade.
  for (const event of game.events) event.timer = (event.timer ?? 2.5) - dt;
  game.events = game.events.filter((e) => e.timer > 0);

  // Getaway: the Star in hand and the thief back at the entry door.
  if (game.hasStar) {
    const exit = game.level.exitZone;
    if (player.x < exit.x + exit.w && player.y > exit.y && player.y < exit.y + exit.h) {
      return nightDone(game);
    }
  }

  clearPressed(input);
}

function caught(game, reason) {
  game.phase = PHASE_CAUGHT;
  game.caughtReason = reason;
  stopSiren();
  game.sirenOn = false;
  playCaught();
}

function nightDone(game) {
  game.bonus = finishBonus(game, game.level);
  game.score += game.bonus.total;
  game.phase = PHASE_NIGHT_DONE;
  stopSiren();
  game.sirenOn = false;
  playGetaway();
}

export { STEP };
