// app/bgm.ts — looping background music with a day↔night crossfade.
//
// Two tracks (a bright daytime loop and a calm night loop) play in parallel and
// are mixed by the live day-night phase p∈[0,1] coming from skyClock, so the
// music breathes with the same cycle as the DayNightSky backdrop: full day
// during 아침/낮, full night through 밤, smoothly crossfading at 해질녘/동틀녘.
// The mix is equal-power (sqrt) so the combined loudness stays roughly constant
// through the crossfade instead of dipping in the middle.
//
// Browser autoplay policy blocks audio until a user gesture, so playback is
// armed lazily on the first pointer/key/touch (see arm()). Everything is
// best-effort: missing files, blocked autoplay or no Audio support never throw —
// the game just runs silently.

// Drop the generated files here (see public/audio/README.md):
const DAY_SRC = '/audio/bgm-day.mp3';
const NIGHT_SRC = '/audio/bgm-night.mp3';
const MASTER = 0.5; // ceiling volume for the active track

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

let day: HTMLAudioElement | null = null;
let night: HTMLAudioElement | null = null;
let armed = false; // playback has been kicked off by a user gesture
let muted = false;
let phase = 0; // latest day-night phase from the render loop

function make(src: string): HTMLAudioElement | null {
  try {
    const a = new Audio(src);
    a.loop = true;
    a.preload = 'auto';
    a.volume = 0;
    return a;
  } catch {
    return null;
  }
}

function applyVolumes(): void {
  if (muted) {
    if (day) day.volume = 0;
    if (night) night.volume = 0;
    return;
  }
  const m = dayMix(phase);
  // Equal-power crossfade keeps perceived loudness steady through the blend.
  if (day) day.volume = MASTER * Math.sqrt(m);
  if (night) night.volume = MASTER * Math.sqrt(1 - m);
}

export const bgm = {
  // Called every frame from the DayNightSky render loop with the live phase.
  setPhase(p: number): void {
    phase = p;
    applyVolumes();
  },

  // Begin playback. Safe to call repeatedly; only the first armed call after a
  // real user gesture actually starts the loops (autoplay policy).
  arm(): void {
    if (armed) return;
    armed = true;
    day = make(DAY_SRC);
    night = make(NIGHT_SRC);
    applyVolumes();
    // play() returns a promise that rejects if autoplay is still blocked or the
    // file is missing — swallow it so we degrade to silence rather than throw.
    void day?.play().catch(() => {});
    void night?.play().catch(() => {});
  },

  setMuted(next: boolean): void {
    muted = next;
    applyVolumes();
    // Pause the elements while muted so we are not decoding audio for nothing,
    // and resume from where the cycle is once unmuted.
    if (muted) {
      day?.pause();
      night?.pause();
    } else if (armed) {
      void day?.play().catch(() => {});
      void night?.play().catch(() => {});
    }
  },

  isMuted(): boolean {
    return muted;
  },
};
