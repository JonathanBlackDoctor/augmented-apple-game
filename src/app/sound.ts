// app/sound.ts — tiny WebAudio SFX for tactile feedback (plan pillar #1).
// Lazily created on first use (after a user gesture). Best-effort; never throws.
let ctx: AudioContext | null = null;
let enabled = true; // toggled by the settings store (sfx.setEnabled)

function ac(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function blip(freq: number, durMs: number, gain = 0.06, type: OscillatorType = 'sine'): void {
  if (!enabled) return;
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.value = gain;
  o.connect(g).connect(c.destination);
  const t = c.currentTime;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + durMs / 1000);
  o.start(t);
  o.stop(t + durMs / 1000);
}

export const sfx = {
  /** Mute/unmute all SFX (wired to the settings store). */
  setEnabled(v: boolean): void {
    enabled = v;
  },
  clear(combo: number): void {
    const base = 520 + Math.min(combo, 8) * 60;
    blip(base, 120, 0.07, 'triangle');
  },
  fail(): void {
    blip(150, 90, 0.04, 'sawtooth');
  },
  pick(): void {
    blip(660, 140, 0.06, 'sine');
  },
  emote(): void {
    blip(880, 90, 0.05, 'triangle');
  },
  end(): void {
    blip(420, 220, 0.06, 'triangle');
  },
};
