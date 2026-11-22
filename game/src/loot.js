// Vaultlight — loot, the vault lock, tools and the score.
// One job: everything the thief gains or spends. Display cases give points and Focus
// (the currency tools cost); the vault door takes a timed lockpick while the alarm
// creeps up; the Meridian Star is the prize; the score rewards a fast, quiet night.

import { LOOT, TOOLS } from './config.js';

export const CASE_RADIUS = 26;
export const STAR_RADIUS = 24;
export const INTERACT_RADIUS = 46;

/** The nearest ungrabbed case within reach, or null. */
export function nearestCase(player, cases) {
  let best = null;
  let bestDist = INTERACT_RADIUS;
  for (const c of cases) {
    if (c.taken) continue;
    const d = Math.hypot(c.x - player.x, c.y - player.y);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

/** Grab a case: points and one Focus. Returns the points gained, or 0. */
export function grabCase(state, c) {
  if (!c || c.taken) return 0;
  c.taken = true;
  state.focus = Math.min(9, state.focus + LOOT.focusPerCase);
  state.score += LOOT.casePoints;
  state.lootTaken += 1;
  state.events.push({ type: 'loot', x: c.x, y: c.y, text: `+${LOOT.casePoints} ${c.name}` });
  return LOOT.casePoints;
}

/** True while the thief stands close enough to work the vault door. */
export function nearVaultDoor(player, level) {
  const door = level.vaultDoor;
  const cx = door.x + door.w / 2;
  const cy = door.y + door.h / 2;
  return Math.hypot(player.x - cx, player.y - cy) < 110;
}

/**
 * Advance the lockpick while the thief holds the interact key near the closed vault
 * door. Returns 'done' the moment the door swings open, 'picking' while it is in
 * progress, and 'idle' otherwise.
 */
export function stepLockpick(state, level, interacting, dt) {
  const door = level.vaultDoor;
  if (door.open) return 'idle';
  if (!interacting || !nearVaultDoor(state.player, level)) {
    door.progress = Math.max(0, door.progress - dt * 1.5);
    return 'idle';
  }
  door.progress += dt;
  if (door.progress >= TOOLS.lockpickSeconds) {
    door.open = true;
    state.events.push({ type: 'vault', x: 1155, y: 350, text: 'Vault open — take the Star!' });
    return 'done';
  }
  return 'picking';
}

/** True while the thief stands close enough to lift the Star from its pedestal. */
export function nearStar(player, level) {
  if (!level.vaultDoor.open || level.star.taken) return false;
  return Math.hypot(player.x - level.star.x, player.y - level.star.y) < INTERACT_RADIUS;
}

/** Lift the Star: the night's prize, and the signal to run for the exit. */
export function grabStar(state, level) {
  if (!nearStar(state.player, level)) return false;
  level.star.taken = true;
  state.score += LOOT.starPoints;
  state.hasStar = true;
  state.events.push({ type: 'star', x: level.star.x, y: level.star.y, text: `+${LOOT.starPoints} THE MERIDIAN STAR` });
  return true;
}

/** Throw a smoke bomb at the thief's feet. Returns false when Focus cannot pay. */
export function useSmoke(state) {
  if (state.focus < TOOLS.smoke.cost || state.smokeTimer > 0) return false;
  state.focus -= TOOLS.smoke.cost;
  state.smokeTimer = TOOLS.smoke.seconds;
  state.smokeClouds.push({ x: state.player.x, y: state.player.y, radius: TOOLS.smoke.radius, timer: TOOLS.smoke.seconds });
  return true;
}

/** Fire the EMP: every camera goes dark for its duration. Returns false when unpaid. */
export function useEmp(state, level) {
  if (state.focus < TOOLS.emp.cost) return false;
  state.focus -= TOOLS.emp.cost;
  for (const camera of level.cameras) camera.disabledTimer = TOOLS.emp.seconds;
  state.events.push({ type: 'emp', x: state.player.x, y: state.player.y, text: 'EMP — cameras dark' });
  return true;
}

/** Time bonus for finishing under par, plus a quiet-night bonus for low alarm. */
export function finishBonus(state, level) {
  const timeLeft = Math.max(0, level.parSeconds - state.elapsed);
  const timeBonus = Math.round(timeLeft) * LOOT.timeBonusPerSecond;
  const quietBonus = state.alarm < 30 ? 150 : state.alarm < 60 ? 75 : 0;
  return { timeBonus, quietBonus, total: timeBonus + quietBonus };
}
