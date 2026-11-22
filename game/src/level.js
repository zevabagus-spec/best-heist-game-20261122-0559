// Vaultlight — the Meridian Gallery floor plan.
// One job: describe the room. Walls and cover block movement and sight; the three
// horizontal corridors give the thief three routes to the vault; the vault door on the
// east wall is the only way to the Meridian Star; the entry door on the west wall is
// also the getaway. Coordinates are canvas pixels inside the play area (x 10..1270,
// y 64..710). Guard lanes are kept clear of cover on purpose: a patrol that has to
// squeeze past a crate looks broken and plays unfair.

import { LEVELS } from './config.js';

const WALL = 14;

// Outer shell, split where the entry door is (west wall gap y 330..400).
const OUTER_WALLS = [
  { x: 10, y: 64, w: 1260, h: WALL },
  { x: 10, y: 696, w: 1260, h: WALL },
  { x: 10, y: 64, w: WALL, h: 266 },
  { x: 10, y: 400, w: WALL, h: 310 },
  { x: 1256, y: 64, w: WALL, h: 646 },
];

// Divider A (y 270) between the north and middle corridors, gaps at 380..460 and 700..780.
const DIVIDER_A = [
  { x: 24, y: 270, w: 356, h: WALL },
  { x: 460, y: 270, w: 240, h: WALL },
  { x: 780, y: 270, w: 266, h: WALL },
];

// Divider B (y 470) between the middle and south corridors, gaps at 480..560 and 900..980.
const DIVIDER_B = [
  { x: 24, y: 470, w: 456, h: WALL },
  { x: 560, y: 470, w: 340, h: WALL },
  { x: 980, y: 470, w: 66, h: WALL },
];

// The vault (x 1046..1256, y 150..560). Its west wall has the vault door gap y 330..400.
const VAULT_WALLS = [
  { x: 1046, y: 150, w: 210, h: WALL },
  { x: 1046, y: 546, w: 210, h: WALL },
  { x: 1046, y: 150, w: WALL, h: 180 },
  { x: 1046, y: 400, w: WALL, h: 146 },
];

// Cover: benches, crates, a planter and a statue. They block movement and sight, and
// the thief can break a cone behind them. All of them sit off the patrol lanes.
const COVER = [
  { x: 180, y: 330, w: 90, h: 40, kind: 'bench' },
  { x: 560, y: 100, w: 50, h: 40, kind: 'planter' },
  { x: 880, y: 400, w: 46, h: 46, kind: 'statue' },
  { x: 140, y: 620, w: 60, h: 44, kind: 'crates' },
  { x: 340, y: 620, w: 70, h: 44, kind: 'crates' },
  { x: 460, y: 630, w: 60, h: 40, kind: 'crates' },
  { x: 980, y: 620, w: 80, h: 44, kind: 'crates' },
];

// Four display cases of small loot, each off the patrol lanes.
const CASES = [
  { x: 300, y: 112, name: 'Jade Scarab' },
  { x: 820, y: 112, name: 'Ivory Fan' },
  { x: 620, y: 430, name: 'Gold Pocket Watch' },
  { x: 820, y: 650, name: 'Emerald Brooch' },
];

// Patrol routes, in the order the guards walk them. Guard lanes never cross cover.
const PATROLS = [
  [[200, 160], [700, 160], [980, 160]],
  [[300, 370], [700, 370], [950, 370]],
  [[250, 590], [650, 590], [1000, 590]],
  [[1010, 220], [1010, 440]],
];

// Cameras: wall-mounted, sweeping a fixed arc.
const CAMERA_MOUNTS = [
  { x: 560, y: 80, angle: Math.PI / 2, phase: 0 },
  { x: 1038, y: 320, angle: Math.PI, phase: 1.3 },
  { x: 700, y: 690, angle: -Math.PI / 2, phase: 2.1 },
];

/** Build the level state for night `index` (0-based) from LEVELS. */
export function buildLevel(index) {
  const def = LEVELS[index];
  const guards = PATROLS.slice(0, def.guards).map((waypoints, i) => ({
    id: i,
    waypoints,
    waypointIndex: 0,
    x: waypoints[0][0],
    y: waypoints[0][1],
    facing: 0,
    speed: def.guardSpeed,
    suspicion: 0,
    state: 'patrol',
    loseSightTimer: 0,
    chaseX: 0,
    chaseY: 0,
  }));
  const cameras = CAMERA_MOUNTS.slice(0, def.cameras).map((mount, i) => ({
    id: i,
    x: mount.x,
    y: mount.y,
    baseAngle: mount.angle,
    angle: mount.angle,
    sweep: def.cameraSweep,
    phase: mount.phase,
    disabledTimer: 0,
    suspicion: 0,
  }));
  return {
    name: def.name,
    index,
    alarmDecay: def.alarmDecay,
    parSeconds: def.parSeconds,
    walls: [...OUTER_WALLS, ...DIVIDER_A, ...DIVIDER_B, ...VAULT_WALLS],
    cover: COVER.map((c) => ({ ...c })),
    cases: CASES.map((c) => ({ ...c, taken: false })),
    star: { x: 1155, y: 350, taken: false },
    vaultDoor: { x: 1046, y: 330, w: WALL, h: 70, open: false, progress: 0 },
    entry: { x: 60, y: 365 },
    exitZone: { x: 10, y: 330, w: 34, h: 70 },
    guards,
    cameras,
  };
}

/** Every rectangle that blocks movement and sight: walls, cover, and the closed vault door. */
export function solidRects(level) {
  const rects = [...level.walls, ...level.cover];
  if (!level.vaultDoor.open) rects.push(level.vaultDoor);
  return rects;
}
