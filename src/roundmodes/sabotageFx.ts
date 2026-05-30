// roundmodes/sabotageFx.ts — deterministic sabotage primitives (plan §8.3/§10.3).
// Effects that must look identical on both clients derive from a shared subseed,
// so each side computes the same result without transmitting the outcome.
import type { SeededRng } from '../contracts';
import { makeRng } from '../core';

/** A permutation of [0..n) derived deterministically from `subseed`
 *  (Fisher–Yates). Used by the "earthquake/shuffle" sabotage. */
export function shuffleOrder(n: number, subseed: string): number[] {
  const rng: SeededRng = makeRng(subseed);
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}
