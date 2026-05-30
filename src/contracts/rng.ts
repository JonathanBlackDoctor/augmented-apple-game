// contracts/rng.ts — deterministic randomness (plan §5.2)
// The interface lives here (logic-free). The concrete `makeRng` implementation
// lives in src/core/rng.ts so that contracts stays pure type declarations.

export interface SeededRng {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform integer in [0, maxExclusive). */
  int(maxExclusive: number): number;
  /** Derive an independent sub-stream. Same label + same parent seed =>
   *  same sub-stream on every client (used to sync shuffles/sabotage). */
  fork(label: string): SeededRng;
}

export type MakeRng = (seed: string) => SeededRng;
