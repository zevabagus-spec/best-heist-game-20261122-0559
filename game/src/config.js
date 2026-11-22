// Vaultlight: The Meridian Gallery Heist — shared constants, palette and level data.
// One job: every number the rest of the game agrees on lives here, so tuning never
// means hunting through the renderer or the rules.

export const VIEW = { width: 1280, height: 720 };
export const HUD_HEIGHT = 58;
export const PLAY = { x: 10, y: HUD_HEIGHT + 6, width: 1260, height: 646 };

// Fixed-step simulation: the game, the autopilot and the screenshot scenes all step
// at this rate, so a staged scene is the same frame every time it is rendered.
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 13,
  walkSpeed: 168,
  sneakSpeed: 92,
  // How fast suspicion builds while the thief stands in a cone (1 = fully spotted).
  sneakSuspicionScale: 0.45,
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 62,
  chaseSpeed: 148,
  // Vision cone: half-angle and reach in world units.
  coneHalfAngle: 0.61,
  coneRange: 235,
  // Suspicion builds this fast per second inside a cone; a guard that reaches 1 chases.
  suspicionRate: 1.2,
  suspicionDecay: 0.55,
  // Seconds of clear sight before the guard gives up and walks back to patrol.
  loseSightSeconds: 2.2,
};

export const CAMERA = {
  coneHalfAngle: 0.42,
  coneRange: 265,
  suspicionRate: 1.9,
  sweepSpeed: 0.55,
  sweepArc: 1.05,
  empSeconds: 8,
};

export const ALARM = {
  max: 100,
  // Points per second while a guard is actively chasing the thief in sight.
  chaseRise: 11,
  // Points per second while any cone is suspicious (or a guard hunts a cold trail).
  suspiciousRise: 6,
  // Points per second the alarm cools down while nobody sees the thief.
  decay: 5,
  // Picking the vault lock adds heat even when nobody is watching.
  lockpickRise: 2.5,
  // At this level the siren starts and the meter flashes.
  sirenAt: 70,
};

export const TOOLS = {
  smoke: { key: '1', cost: 2, seconds: 5, radius: 95 },
  emp: { key: '2', cost: 3, seconds: CAMERA.empSeconds },
  lockpickSeconds: 2.6,
};

export const LOOT = {
  casePoints: 100,
  starPoints: 500,
  focusPerCase: 1,
  startFocus: 4,
  timeParSeconds: 150,
  timeBonusPerSecond: 4,
};

// The Meridian Gallery, three nights, one floor plan each. Every night reuses the same
// hall; what changes is how many guards walk it, how many cameras sweep it and how
// fast the alarm cools — the player reads the same room better each night.
export const LEVELS = [
  {
    name: 'Night One — The Quiet Wing',
    guards: 2,
    cameras: 2,
    guardSpeed: 58,
    cameraSweep: 0.5,
    alarmDecay: 6,
    parSeconds: 150,
  },
  {
    name: 'Night Two — The Full Roster',
    guards: 3,
    cameras: 3,
    guardSpeed: 68,
    cameraSweep: 0.65,
    alarmDecay: 5,
    parSeconds: 165,
  },
  {
    name: 'Night Three — The Director\'s Gala',
    guards: 4,
    cameras: 3,
    guardSpeed: 78,
    cameraSweep: 0.8,
    alarmDecay: 4,
    parSeconds: 180,
  },
];

// Night palette: deep navy hall, warm gold loot, teal safe cover, red danger.
export const PALETTE = {
  floorA: '#1b2340',
  floorB: '#171d36',
  floorLine: '#232c52',
  wall: '#2c355e',
  wallTop: '#3d4a7d',
  wallTrim: '#c9a227',
  cover: '#274b3f',
  coverTop: '#356355',
  door: '#4a3a22',
  doorGlow: '#e8b64c',
  vault: '#3a2f16',
  vaultGlow: '#ffd76a',
  thief: '#39d0c4',
  thiefDark: '#1d8a82',
  guard: '#e8e4d8',
  guardDark: '#8f8a7a',
  guardAlert: '#ff5a4e',
  cone: 'rgba(255, 214, 90, 0.26)',
  coneSuspicious: 'rgba(255, 150, 60, 0.30)',
  coneAlert: 'rgba(255, 70, 60, 0.34)',
  cameraCone: 'rgba(255, 90, 90, 0.20)',
  cameraConeOff: 'rgba(120, 130, 160, 0.10)',
  loot: '#ffd76a',
  lootGlow: 'rgba(255, 215, 106, 0.35)',
  smoke: 'rgba(200, 210, 220, 0.30)',
  text: '#e8ecf7',
  textDim: '#9aa5c4',
  alarmLow: '#39d0c4',
  alarmMid: '#e8b64c',
  alarmHigh: '#ff5a4e',
};
