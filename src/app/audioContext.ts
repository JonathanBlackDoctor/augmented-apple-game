// app/audioContext.ts — one shared WebAudio context for SFX (sound.ts) and BGM
// (bgm.ts). Browsers cap how many AudioContexts a page may create and start them
// 'suspended' until a user gesture, so sharing a single context keeps us well
// under the cap and lets one resume() unlock both. Best-effort: returns null
// wherever WebAudio is unavailable so callers can degrade to silence.
let ctx: AudioContext | null = null;
let unsupported = false;

export function getAudioContext(): AudioContext | null {
  if (unsupported) return null;
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) {
        unsupported = true;
        return null;
      }
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    unsupported = true;
    return null;
  }
}
