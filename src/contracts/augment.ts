// contracts/augment.ts — augment system contract (plan §5.3, §8)
import type { Board, RoundConfig, ClearResult, Rect, CellTag } from './core';
import type { SeededRng } from './rng';
import type { SabotageEvent } from './net';
import type { PlayerId } from './roundmode';

export type AugTier = 'silver' | 'gold' | 'prismatic';
export type AugFamily = 'time' | 'combo' | 'board' | 'rule' | 'risk' | 'disrupt';

// ---- Hook contexts ----------------------------------------------------------

export interface SelCtx {
  board: Readonly<Board>;
  rect: Rect;
  cells: number[]; // candidate non-empty cell indices inside the rect
  sum: number; // sum of candidate apple values
  targetSum: number;
}

export interface SelOverride {
  /** Force this selection to be accepted (e.g. sum 9/11, multiples of 10). */
  accept: boolean;
  /** Optionally override which cells get cleared (e.g. wild substitution). */
  cells?: number[];
}

export interface ClearCtx {
  board: Readonly<Board>;
  config: RoundConfig;
  comboCount: number; // consecutive successful clears (current streak)
  failCount: number; // failed drags so far this round
  tMs: number; // round-relative time
  rng: SeededRng; // deterministic per-clear sub-stream (fork of round seed)
  /** Original apple values of the cleared cells (board is already mutated). */
  clearedValues: number[];
  /** Original tags of the cleared cells, parallel to ClearResult.cells. */
  clearedTags: CellTag[];
  /** Grant bonus time to the round timer (e.g. time-family augments). */
  grantTimeMs(ms: number): void;
}

export interface TickState {
  remainingMs: number;
  paused: boolean;
}

export interface TickCtx {
  isDragging: boolean;
  idleMs: number; // time since last activity
  deltaMs: number; // elapsed since previous tick
}

export interface SabCtx {
  self: PlayerId;
  opponent?: PlayerId;
  round: number;
  rng: SeededRng;
  clear?: ClearResult;
}

// ---- Hook definitions -------------------------------------------------------

export interface AugmentHooks {
  modifyRoundConfig?(cfg: RoundConfig): RoundConfig;
  onBoardInit?(b: Board, rng: SeededRng): void;
  validateSelection?(c: SelCtx): Partial<SelOverride> | void;
  onClear?(r: ClearResult, c: ClearCtx): ClearResult;
  onTick?(s: TickState, c: TickCtx): TickState;
  emitSabotage?(c: SabCtx): SabotageEvent[];
  onIncomingSabotage?(e: SabotageEvent, c: SabCtx): void;
}

export type HookPoint = keyof AugmentHooks;

export interface Augment {
  id: string;
  name: string;
  desc: string;
  tier: AugTier;
  family: AugFamily;
  hooks: AugmentHooks;
  stacks?: boolean; // default false: only one copy meaningful
  conflictsWith?: string[]; // augment ids excluded once this is owned
}

/** core calls into the bus at each hook point; augments register handlers. */
export interface AugmentHookBus {
  run<K extends HookPoint>(point: K, ...args: any[]): any;
}

export interface AugmentRuntime {
  /** Offer exactly 3 distinct augment ids of `tier`, excluding owned/conflicts.
   *  Deterministic given the same rng + owned set. */
  rollOffer(tier: AugTier, rng: SeededRng, owned: string[]): [string, string, string];
  pick(id: string): void;
  /** Build a hook bus over the currently-owned (accumulated) augments. */
  buildHookBus(): AugmentHookBus;
}
