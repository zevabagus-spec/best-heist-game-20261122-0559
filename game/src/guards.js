// Vaultlight — the people watching the gallery: guards and cameras.
// One job: move the watchers and decide what they see. Guards walk their patrol
// route, get suspicious when the thief crosses a cone, chase when they are sure, and
// walk back when the trail goes cold. Cameras sweep a fixed arc and feed the alarm
// instead of chasing. Nothing here draws anything; render.js owns that.

import { GUARD, CAMERA, STEP } from './config.js';
import { canSee } from './vision.js';

/** Move a circle by (dx,dy), sliding along solid rectangles instead of sticking. */
export function moveCircle(body, dx, dy, rects) {
  const r = body.radius;
  let nx = body.x + dx;
  for (const rect of rects) {
    if (circleHitsRect(nx, body.y, r, rect)) {
      nx = dx > 0 ? rect.x - r : rect.x + rect.w + r;
    }
  }
  body.x = nx;
  let ny = body.y + dy;
  for (const rect of rects) {
    if (circleHitsRect(body.x, ny, r, rect)) {
      ny = dy > 0 ? rect.y - r : rect.y + rect.h + r;
    }
  }
  body.y = ny;
}

function circleHitsRect(cx, cy, r, rect) {
  const nearestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const nearestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return dx * dx + dy * dy < r * r;
}

/**
 * Step one guard for `dt` seconds. Returns 'chasing' while the guard is sure it saw
 * the thief and still has eyes on them, 'hunting' while it chases the last place it
 * saw them, 'suspicious' while it is building up to that, and 'patrol' otherwise.
 * `player` carries x, y and sneak (true while the thief sneaks).
 */
export function stepGuard(guard, player, rects, smokeClouds, dt) {
  const sees = canSee(
    guard.x, guard.y, guard.facing, GUARD.coneHalfAngle, GUARD.coneRange,
    player.x, player.y, rects, smokeClouds,
  );
  const rate = player.sneak ? GUARD.suspicionRate * 0.45 : GUARD.suspicionRate;
  if (sees) {
    guard.suspicion = Math.min(1, guard.suspicion + rate * dt);
    guard.loseSightTimer = GUARD.loseSightSeconds;
    guard.chaseX = player.x;
    guard.chaseY = player.y;
  } else {
    guard.suspicion = Math.max(0, guard.suspicion - GUARD.suspicionDecay * dt);
    guard.loseSightTimer -= dt;
  }

  if (guard.suspicion >= 1) guard.state = 'chase';
  else if (guard.suspicion > 0.25) guard.state = 'suspicious';
  else if (guard.state !== 'patrol' && guard.loseSightTimer <= 0) guard.state = 'patrol';

  if (guard.state === 'chase') {
    // Chase the last place the thief was seen; give up after the trail goes cold.
    const dx = guard.chaseX - guard.x;
    const dy = guard.chaseY - guard.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 6) {
      const speed = GUARD.chaseSpeed * dt;
      guard.facing = Math.atan2(dy, dx);
      moveCircle(guard, (dx / dist) * speed, (dy / dist) * speed, rects);
    }
    if (guard.loseSightTimer <= 0) guard.state = 'return';
    return sees ? 'chasing' : 'hunting';
  }

  if (guard.state === 'return') {
    // Walk back to the nearest patrol waypoint, then resume the route.
    let nearest = 0;
    let nearestDist = Infinity;
    guard.waypoints.forEach(([wx, wy], i) => {
      const d = Math.hypot(wx - guard.x, wy - guard.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = i;
      }
    });
    guard.waypointIndex = nearest;
    if (nearestDist < 10) guard.state = 'patrol';
    else walkToward(guard, guard.waypoints[nearest], GUARD.patrolSpeed, rects, dt);
    return guard.suspicion > 0.25 ? 'suspicious' : 'patrol';
  }

  // Patrol: walk to the next waypoint, then take the following one.
  const target = guard.waypoints[guard.waypointIndex];
  const arrived = walkToward(guard, target, guard.speed, rects, dt);
  if (arrived) guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
  return guard.suspicion > 0.25 ? 'suspicious' : 'patrol';
}

/** Walk `body` toward [tx,ty] at `speed`; returns true when it arrives this step. */
function walkToward(body, [tx, ty], speed, rects, dt) {
  const dx = tx - body.x;
  const dy = ty - body.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) return true;
  const step = Math.min(dist, speed * dt);
  body.facing = Math.atan2(dy, dx);
  moveCircle(body, (dx / dist) * step, (dy / dist) * step, rects);
  return dist - step < 4;
}

/**
 * Step one camera for `dt` seconds. Returns true while the camera can see the thief
 * (its suspicion is what feeds the alarm; a disabled camera sees nothing).
 */
export function stepCamera(camera, player, rects, smokeClouds, dt) {
  if (camera.disabledTimer > 0) {
    camera.disabledTimer = Math.max(0, camera.disabledTimer - dt);
    camera.suspicion = 0;
    return false;
  }
  camera.phase += dt;
  camera.angle = camera.baseAngle + Math.sin(camera.phase * CAMERA.sweepSpeed * 2) * camera.sweep;
  const sees = canSee(
    camera.x, camera.y, camera.angle, CAMERA.coneHalfAngle, CAMERA.coneRange,
    player.x, player.y, rects, smokeClouds,
  );
  if (sees) camera.suspicion = Math.min(1, camera.suspicion + CAMERA.suspicionRate * dt);
  else camera.suspicion = Math.max(0, camera.suspicion - GUARD.suspicionDecay * dt);
  return camera.suspicion >= 0.6;
}

/** True when a circle of `radius` at (x,y) would overlap any solid rectangle or leave the room. */
export function pointBlocked(x, y, radius, rects) {
  if (x < 10 + radius || x > 1270 - radius || y < 64 + radius || y > 710 - radius) return true;
  for (const rect of rects) {
    if (circleHitsRect(x, y, radius, rect)) return true;
  }
  return false;
}

export { STEP };
