// app/clock.ts — monotonic clock injected into the pure core (plan §B).
// Pausable: while paused, now() is frozen and paused spans are excluded from
// elapsed time, so the round timer and bot schedule both halt cleanly.
import type { MonotonicClock } from '../contracts';

export interface PausableClock extends MonotonicClock {
  pause(): void;
  resume(): void;
  readonly paused: boolean;
}

export function createMonotonicClock(): PausableClock {
  const start = performance.now();
  let pausedAt: number | null = null; // raw perf time at which we paused
  let lost = 0; // total ms spent paused (excluded from now())
  return {
    now: () => (pausedAt ?? performance.now()) - start - lost,
    pause(): void {
      if (pausedAt === null) pausedAt = performance.now();
    },
    resume(): void {
      if (pausedAt !== null) {
        lost += performance.now() - pausedAt;
        pausedAt = null;
      }
    },
    get paused(): boolean {
      return pausedAt !== null;
    },
  };
}
