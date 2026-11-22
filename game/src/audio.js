// Vaultlight — sound, synthesized live with WebAudio, no audio files.
// One job: every beep, chime and siren the game makes. Nothing is loaded from disk:
// oscillators and filtered noise are built at run time, so the game stays a set of
// static files with no network request. Audio starts on the first user gesture.

let context = null;
let muted = false;
let sirenNodes = null;

function audioContext() {
  if (context) return context;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  context = new AudioContextClass();
  return context;
}

/** Call from any user gesture: unlocks audio and resumes a suspended context. */
export function unlockAudio() {
  const ctx = audioContext();
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
}

export function toggleMute() {
  muted = !muted;
  if (muted) stopSiren();
  return muted;
}

export function isMuted() {
  return muted;
}

function tone(frequency, duration, type, gainValue, when = 0) {
  if (muted) return;
  const ctx = audioContext();
  if (!ctx) return;
  const start = ctx.currentTime + when;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.05);
}

function noiseBurst(duration, gainValue, filterFrequency) {
  if (muted) return;
  const ctx = audioContext();
  if (!ctx) return;
  const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFrequency;
  const gain = ctx.createGain();
  gain.gain.value = gainValue;
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start();
}

/** A soft footstep tick while the thief walks. */
export function playStep() {
  noiseBurst(0.05, 0.05, 700);
}

/** Two-note chime when a display case is lifted. */
export function playPickup() {
  tone(880, 0.12, 'sine', 0.12);
  tone(1318, 0.18, 'sine', 0.1, 0.08);
}

/** A rising arpeggio when the vault door swings open. */
export function playVaultOpen() {
  tone(523, 0.14, 'triangle', 0.12);
  tone(659, 0.14, 'triangle', 0.12, 0.1);
  tone(784, 0.22, 'triangle', 0.12, 0.2);
}

/** The Star's shimmer: a bright major chord. */
export function playStar() {
  tone(1046, 0.3, 'sine', 0.14);
  tone(1318, 0.3, 'sine', 0.12, 0.05);
  tone(1568, 0.4, 'sine', 0.12, 0.1);
}

/** A low thud when a tool fires. */
export function playTool() {
  tone(180, 0.16, 'square', 0.08);
  noiseBurst(0.12, 0.08, 1200);
}

/** A harsh buzz when a guard spots the thief. */
export function playSpotted() {
  tone(220, 0.22, 'sawtooth', 0.1);
  tone(233, 0.22, 'sawtooth', 0.1, 0.02);
}

/** The getaway sting: a short triumphant phrase. */
export function playGetaway() {
  tone(523, 0.16, 'triangle', 0.14);
  tone(659, 0.16, 'triangle', 0.14, 0.12);
  tone(784, 0.16, 'triangle', 0.14, 0.24);
  tone(1046, 0.34, 'triangle', 0.14, 0.36);
}

/** A low two-note sting when the night is lost. */
export function playCaught() {
  tone(196, 0.3, 'sawtooth', 0.1);
  tone(147, 0.5, 'sawtooth', 0.1, 0.25);
}

/** Start the alarm siren loop (a slow two-tone wail). Stops itself when told. */
export function startSiren() {
  if (muted || sirenNodes) return;
  const ctx = audioContext();
  if (!ctx) return;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(620, ctx.currentTime);
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.7;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 180;
  lfo.connect(lfoGain).connect(oscillator.frequency);
  gain.gain.value = 0.035;
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start();
  lfo.start();
  sirenNodes = { oscillator, lfo, gain };
}

export function stopSiren() {
  if (!sirenNodes) return;
  try {
    sirenNodes.oscillator.stop();
    sirenNodes.lfo.stop();
  } catch (error) {
    // Already stopped; nothing to do.
  }
  sirenNodes = null;
}
