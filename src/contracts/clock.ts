// contracts/clock.ts — injected monotonic time source (plan §7, §B)
// Core never reads `performance.now()`/`Date.now()` directly; `app` injects a
// wrapper, tests inject a fake clock. Values are milliseconds, monotonic.

export interface MonotonicClock {
  now(): number;
}
