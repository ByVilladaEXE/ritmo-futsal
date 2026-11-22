// Audio procedural (Web Audio API): sin archivos externos.
let ctx: AudioContext | null = null;

export function unlock() {
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return;
    ctx = new C();
  }
  if (ctx.state === 'suspended') void ctx.resume();
}

function tone(f: number, dur: number, type: OscillatorType = 'sine', vol = 0.3, at = 0) {
  if (!ctx) return;
  const t = ctx.currentTime + at;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function whistle(dur: number, at = 0) {
  if (!ctx) return;
  const c = ctx;
  const t = c.currentTime + at;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
  g.gain.setValueAtTime(0.35, t + Math.max(0.03, dur - 0.06));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(c.destination);
  const lfo = c.createOscillator();
  const lg = c.createGain();
  lfo.frequency.value = 38;
  lg.gain.value = 90;
  lfo.connect(lg);
  [2900, 3040].forEach((f) => {
    const o = c.createOscillator();
    o.frequency.value = f;
    lg.connect(o.frequency);
    o.connect(g);
    o.start(t);
    o.stop(t + dur + 0.05);
  });
  lfo.start(t);
  lfo.stop(t + dur + 0.05);
}

export const sfx = {
  short: () => whistle(0.18),
  long: () => whistle(0.9),
  final: () => { whistle(0.25); whistle(0.25, 0.35); whistle(0.9, 0.7); },
  goalDrop: () => { tone(55, 0.45, 'sine', 0.7); tone(110, 0.25, 'triangle', 0.28); },
  diceRiser: () => { for (let i = 0; i < 12; i++) tone(180 + i * 55, 0.09, 'square', 0.12, i * 0.07); },
  countdownFast: () => { for (let i = 0; i < 3; i++) tone(1200 - i * 120, 0.08, 'square', 0.18, i * 0.09); },
  tick: () => tone(1200, 0.05, 'square', 0.15),
  beep: () => tone(880, 0.12, 'square', 0.25),
  card: () => tone(320, 0.18, 'square', 0.2),
  goal: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.3, i * 0.1)),
  alarm: () => { for (let i = 0; i < 6; i++) tone(i % 2 ? 880 : 660, 0.22, 'sawtooth', 0.28, i * 0.25); },
  reentry: () => { for (let i = 0; i < 5; i++) tone(1000 + i * 150, 0.14, 'square', 0.3, i * 0.16); },
};
export const vib = (p: number | number[]) => { try { navigator.vibrate?.(p); } catch { /* sin soporte */ } };
