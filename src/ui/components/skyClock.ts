// skyClock.ts — pure mapping from match progress → day-night phase p ∈ [0,1].
// DayNightSky drives the sun/moon from this so time advances WITH the round
// clock: each round sweeps from its own start-of-day anchor toward the next
// round's, and the match ends at daybreak (p=1 ≡ p=0), so the sky is a true
// loop — finishing a match leaves it exactly where the home auto-cycle resumes,
// with no R5→R1 jump. Because the position is derived from the live game clock
// (remainingMs / durationMs) it inherits every time augment for free — when a
// slow-time augment drags the clock the sky slows by the same factor, and
// whenever the clock is frozen (augment-pick screen, the pause between rounds)
// remainingMs stops moving so the sky holds in place.

// Start-of-round time-of-day anchors, tuned to the DayNightSky keyframes. The
// day runs as one seamless loop (아침/낮 → 오후 → 해질녘 → 밤 → 황혼 → 아침),
// so the final round breaks into dawn (p→1) and wraps cleanly back to morning:
// R1 아침/낮 · R2 오후 · R3 해질녘 · R4 밤 · R5 황혼(동틀녘).
export const ROUND_P = [0.0, 0.2, 0.42, 0.64, 0.85];
export const DAY_START = ROUND_P[0];

const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

// Time-of-day anchor at round boundary `k` (k=0 → match start, k=n → match end).
// The match always finishes at full night (p=1); intermediate boundaries reuse
// the hand-tuned ROUND_P, falling back to an even spread for unusually long
// matches so the mapping never reads past the table.
export function anchor(k: number, n: number): number {
  if (k >= n) return 1;
  if (n <= ROUND_P.length) return ROUND_P[clamp(k, 0, ROUND_P.length - 1)];
  return DAY_START + (1 - DAY_START) * (k / n);
}

// Target phase for the current round, given how much of its clock has elapsed.
// elapsed = 1 − remaining/duration, so a frozen clock yields a frozen phase and
// a slowed clock yields a proportionally slowed sweep.
export function roundTarget(
  roundIndex: number,
  totalRounds: number,
  remainingMs: number,
  durationMs: number,
): number {
  const n = Math.max(1, totalRounds);
  const i = clamp(roundIndex, 0, n - 1);
  const elapsed = durationMs > 0 ? clamp(1 - remainingMs / durationMs, 0, 1) : 0;
  return lerp(anchor(i, n), anchor(i + 1, n), elapsed);
}
