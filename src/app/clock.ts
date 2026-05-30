// app/clock.ts — monotonic clock injected into the pure core (plan §B).
import type { MonotonicClock } from '../contracts';

export function createMonotonicClock(): MonotonicClock {
  const start = performance.now();
  return { now: () => performance.now() - start };
}
