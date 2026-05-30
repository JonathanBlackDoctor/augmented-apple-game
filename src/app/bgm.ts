// app/bgm.ts — looping, gapless background music with a day↔night crossfade.
//
// Two short ambient loops (a calm daytime track and an even softer night track)
// play in parallel through the shared WebAudio context and are mixed by the live
// day-night phase p∈[0,1] from skyClock, so the music breathes with the same
// cycle as the DayNightSky backdrop: full day during 아침/낮, full night through
// 밤, smoothly crossfading at 해질녘/동틀녘. The blend is equal-power (sqrt) so
// the combined loudness stays steady through the crossfade instead of dipping.
//
// WebAudio (decode → AudioBufferSourceNode with loop=true) is used on purpose
// instead of <audio loop>: looping is sample-accurate and GAPLESS, which matters
// for the short (~30s) clips a generator like Gemini produces — there is no
// silent hiccup at the loop seam every cycle. And because the tracks are beatless
// ambient pads, the two loops drifting out of phase — and the seam of a clip
// whose start ≠ end — is inaudible: there is no downbeat to clash against.
//
// Autoplay policy blocks audio until a user gesture, so playback is armed lazily
// on the first pointer/key/touch (arm()). Everything is best-effort: missing
// files, blocked autoplay or no WebAudio never throw — the game runs silently.
import { getAudioContext } from './audioContext';

// Drop the generated files here (see public/audio/README.md):
const DAY_SRC = '/audio/bgm-day.mp3';
const NIGHT_SRC = '/audio/bgm-night.mp3';
const MASTER = 0.5; // ceiling volume for the active track
const SMOOTH = 0.12; // gain follow time-constant (s) — no zipper noise, gentle mute fade

const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
const smooth = (e0: number, e1: number, x: number): number => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

// dayMix(p): how "day" the music is. 1 = pure day track, 0 = pure night track.
// Continuous across the p=1→0 wrap (dayMix(1)=dayMix(0)=1) so the loop never
// jolts. Night takes over after 해질녘 (~0.42→0.62) and hands back at 동틀녘
// (~0.88→0.98), matching the sky's sunset/sunrise windows.
function dayMix(p: number): number {
  return clamp(1 - smooth(0.42, 0.62, p) + smooth(0.88, 0.98, p), 0, 1);
}

let ctx: AudioContext | null = null;
let dayGain: GainNode | null = null;
let nightGain: GainNode | null = null;
let armed = false; // playback has been kicked off by a user gesture
let muted = false;
let phase = 0; // latest day-night phase from the render loop

async function load(c: AudioContext, src: string): Promise<AudioBuffer | null> {
  try {
    const res = await fetch(src);
    if (!res.ok) return null; // file not dropped in yet → stay silent
    return await c.decodeAudioData(await res.arrayBuffer());
  } catch {
    return null;
  }
}

function startLoop(c: AudioContext, buffer: AudioBuffer | null, gain: GainNode | null): void {
  if (!buffer || !gain) return;
  const src = c.createBufferSource();
  src.buffer = buffer;
  src.loop = true; // sample-accurate, gapless
  src.connect(gain);
  src.start();
}

function applyGains(): void {
  const c = ctx;
  if (!c || !dayGain || !nightGain) return;
  const on = muted ? 0 : 1;
  const m = dayMix(phase);
  const t = c.currentTime;
  // setTargetAtTime smooths per-frame writes (no clicks) and gives mute a soft
  // fade; called every frame the target simply tracks the moving phase.
  dayGain.gain.setTargetAtTime(on * MASTER * Math.sqrt(m), t, SMOOTH);
  nightGain.gain.setTargetAtTime(on * MASTER * Math.sqrt(1 - m), t, SMOOTH);
}

async function boot(c: AudioContext): Promise<void> {
  const [d, n] = await Promise.all([load(c, DAY_SRC), load(c, NIGHT_SRC)]);
  startLoop(c, d, dayGain);
  startLoop(c, n, nightGain);
  applyGains();
}

export const bgm = {
  // Called every frame from the DayNightSky render loop with the live phase.
  setPhase(p: number): void {
    phase = p;
    applyGains();
  },

  // Begin playback. Safe to call repeatedly; only the first call after a real
  // user gesture creates the graph and starts the loops (autoplay policy).
  arm(): void {
    if (armed) return;
    armed = true;
    const c = getAudioContext();
    if (!c) return;
    ctx = c;
    dayGain = c.createGain();
    dayGain.gain.value = 0;
    dayGain.connect(c.destination);
    nightGain = c.createGain();
    nightGain.gain.value = 0;
    nightGain.connect(c.destination);
    void boot(c);
  },

  setMuted(next: boolean): void {
    muted = next;
    applyGains();
  },

  isMuted(): boolean {
    return muted;
  },
};
