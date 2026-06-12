// contracts/core.ts — pure game-engine contract (plan §5.1, §7)
import type { SeededRng } from './rng';
import type { AugmentHookBus } from './augment';

export type AppleValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type Cell = AppleValue | 0; // 0 = empty (cleared)

/** Optional per-cell tag layer for augment-driven board features
 *  (golden = score x2, gem = big flat bonus, bomb = bonus on clear,
 *  wild = matches any value). Kept parallel to `cells` so the base numeric
 *  board stays simple and deterministic. */
export type CellTag = 'normal' | 'golden' | 'gem' | 'bomb' | 'wild';

export interface Board {
  cols: number;
  rows: number;
  cells: Cell[]; // row-major, length = cols*rows
  tags?: CellTag[]; // optional, same length; absent => all 'normal'
}

export interface RoundConfig {
  seed: string; // deterministic board key
  cols: number; // default 17
  rows: number; // default 10
  durationMs: number; // default 30_000
  targetSum: number; // default 10 (augments may change)
  modeId: string; // RoundMode id
  augmentIds: string[]; // this player's accumulated augments
}

/** Selection rectangle in *grid* coordinates (inclusive cell index bounds). */
export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface SelectionEval {
  valid: boolean;
  sum: number;
  cells: number[]; // candidate non-empty cell indices inside the rect
}

export interface ClearResult {
  cells: number[]; // removed cell indices
  count: number; // apples removed
  baseScore: number;
  finalScore: number;
  comboMultiplier: number;
  comboCount: number; // engine's consecutive-clear streak after this clear (single source of truth)
}

export type CommitResult = ClearResult | { rejected: true; reason: string };

export interface ClearAction {
  seq: number;
  rect: Rect;
  tMs: number; // round-relative time of the action (for replay ordering)
}

export interface TickResult {
  remainingMs: number;
  ended: boolean;
}

export interface CoreEngine {
  init(cfg: RoundConfig, rng: SeededRng, hooks: AugmentHookBus): void;
  getBoard(): Readonly<Board>;
  /** Preview/highlight during drag. Pure, no mutation. */
  evaluate(rect: Rect): SelectionEval;
  /** Apply a removal. Mutates the board on success. */
  commit(action: ClearAction): CommitResult;
  /** Advance the timer using an injected monotonic clock value. */
  tick(nowMonotonicMs: number): TickResult;
  /** Report drag state so drag-aware time augments (e.g. slow/pause) work.
   *  Not a source of nondeterminism: never consulted by replay(). */
  setDragging(dragging: boolean): void;
  getScore(): number;
  /** Determinism guarantee: same seed+config => same board; same action log
   *  => same score. Rebuilds the board from config and replays actions. */
  replay(actions: ClearAction[]): number;
}
