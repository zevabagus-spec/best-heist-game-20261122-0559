// Vaultlight — line of sight and vision-cone geometry.
// One job: answer "can this watcher see this point?" honestly, with walls and cover
// in the way, and build the cone polygon the renderer draws. A cone that shines
// through a wall would make the game look broken and play unfair, so every ray here
// stops at the first solid rectangle it hits.

/** True when the segment (x1,y1)-(x2,y2) touches any rectangle in `rects`. */
export function segmentBlocked(x1, y1, x2, y2, rects) {
  for (const r of rects) {
    if (segmentHitsRect(x1, y1, x2, y2, r)) return true;
  }
  return false;
}

function segmentHitsRect(x1, y1, x2, y2, r) {
  // Quick reject: both ends on one side of the rectangle.
  if (x1 < r.x && x2 < r.x) return false;
  if (x1 > r.x + r.w && x2 > r.x + r.w) return false;
  if (y1 < r.y && y2 < r.y) return false;
  if (y1 > r.y + r.h && y2 > r.y + r.h) return false;
  // An endpoint inside the rectangle blocks.
  if (pointInRect(x1, y1, r) || pointInRect(x2, y2, r)) return true;
  // Otherwise test the four edges.
  const edges = [
    [r.x, r.y, r.x + r.w, r.y],
    [r.x + r.w, r.y, r.x + r.w, r.y + r.h],
    [r.x + r.w, r.y + r.h, r.x, r.y + r.h],
    [r.x, r.y + r.h, r.x, r.y],
  ];
  for (const [ax, ay, bx, by] of edges) {
    if (segmentsCross(x1, y1, x2, y2, ax, ay, bx, by)) return true;
  }
  return false;
}

function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function segmentsCross(x1, y1, x2, y2, x3, y3, x4, y4) {
  const d1 = cross(x3, y3, x4, y4, x1, y1);
  const d2 = cross(x3, y3, x4, y4, x2, y2);
  const d3 = cross(x1, y1, x2, y2, x3, y3);
  const d4 = cross(x1, y1, x2, y2, x4, y4);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

function cross(ax, ay, bx, by, px, py) {
  return (bx - ax) * (py - ay) - (by - ay) * (px - ax);
}

/**
 * Distance from (ox,oy) along direction `angle` to the first solid rectangle, capped
 * at `maxDist`. Used to clip each cone ray at the wall it meets.
 */
export function rayDistance(ox, oy, angle, maxDist, rects) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let best = maxDist;
  for (const r of rects) {
    const t = rayHitsRect(ox, oy, dx, dy, r);
    if (t !== null && t < best) best = t;
  }
  return best;
}

function rayHitsRect(ox, oy, dx, dy, r) {
  let tmin = 0;
  let tmax = Infinity;
  if (Math.abs(dx) < 1e-9) {
    if (ox < r.x || ox > r.x + r.w) return null;
  } else {
    let t1 = (r.x - ox) / dx;
    let t2 = (r.x + r.w - ox) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  if (Math.abs(dy) < 1e-9) {
    if (oy < r.y || oy > r.y + r.h) return null;
  } else {
    let t1 = (r.y - oy) / dy;
    let t2 = (r.y + r.h - oy) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  return tmin;
}

/**
 * The visible cone polygon for a watcher at (ox,oy) facing `angle` with half-angle
 * `halfAngle` and reach `range`, clipped by the solid rectangles. Returns the list of
 * points (origin first) the renderer fills.
 */
export function conePolygon(ox, oy, angle, halfAngle, range, rects) {
  const rays = 26;
  const points = [[ox, oy]];
  for (let i = 0; i <= rays; i += 1) {
    const a = angle - halfAngle + (2 * halfAngle * i) / rays;
    const d = rayDistance(ox, oy, a, range, rects);
    points.push([ox + Math.cos(a) * d, oy + Math.sin(a) * d]);
  }
  return points;
}

/**
 * True when a watcher at (ox,oy) facing `angle` can see the point (px,py): inside the
 * cone's angle and reach, with a clear line of sight, and not hidden inside smoke.
 */
export function canSee(ox, oy, angle, halfAngle, range, px, py, rects, smokeClouds) {
  const dx = px - ox;
  const dy = py - oy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  let diff = Math.atan2(dy, dx) - angle;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  if (Math.abs(diff) > halfAngle) return false;
  if (segmentBlocked(ox, oy, px, py, rects)) return false;
  for (const s of smokeClouds) {
    if (Math.hypot(px - s.x, py - s.y) < s.radius) return false;
  }
  return true;
}
