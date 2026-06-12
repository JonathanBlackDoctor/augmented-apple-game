// core/engine.ts — the deterministic game engine (plan §5.1, §7).
// PURE: depends only on contracts + sibling core modules. No framework, DOM,
// network, ambient clock, or Math.random. All time is injected via tick();
// all randomness flows from cfg.seed (replayable) or the injected live RNG.
import type {
  Board,
  CellTag,
  ClearAction,
  ClearResult,
  CommitResult,
  CoreEngine,
  RoundConfig,
  SelectionEval,
  Rect,
  TickResult,
} from '../contracts/core';
import type { SeededRng } from '../contracts/rng';
import type {
  AugmentHookBus,
  ClearCtx,
  SelCtx,
  SelOverride,
  TickState,
  TickCtx,
} from '../contracts/augment';
import { makeRng } from './rng';
import { generateBoard, rectToCells } from './board';

// A combo only carries over if the next successful clear lands within this
// window of the previous one; a longer pause lets the chain lapse.
const COMBO_WINDOW_MS = 2000;

class Engine implements CoreEngine {
  private baseCfg!: RoundConfig;
  private cfg!: RoundConfig; // effective (post modifyRoundConfig)
  private bus!: AugmentHookBus;
  private seedRng!: SeededRng; // deterministic forks for board/clear

  private board!: Board;
  private score = 0;
  private comboCount = 0;
  private lastClearTMs = 0; // round-relative time of the last successful clear
  private failCount = 0;

  private remainingMs = 0;
  private lastNow: number | null = null;
  private lastActivityMs = 0;
  private dragging = false;
  private ended = false;

  // NOTE: the injected `rng` (3rd param) is reserved for cross-client live
  // sabotage in Phase 4; board/clear randomness is derived from cfg.seed so
  // replay() is fully deterministic without it.
  init(cfg: RoundConfig, _rng: SeededRng, hooks: AugmentHookBus): void {
    this.bus = hooks;
    this.baseCfg = cfg;
    // Augments may extend time / change target / board size before generation.
    const eff = hooks.run('modifyRoundConfig', cfg) as RoundConfig | undefined;
    this.cfg = eff ?? cfg;
    this.seedRng = makeRng(this.cfg.seed);

    this.board = generateBoard(this.cfg);
    hooks.run('onBoardInit', this.board, this.seedRng.fork('boardInit'));

    this.score = 0;
    this.comboCount = 0;
    this.lastClearTMs = 0;
    this.failCount = 0;
    this.remainingMs = this.cfg.durationMs;
    this.lastNow = null;
    this.lastActivityMs = 0;
    this.dragging = false;
    this.ended = false;
  }

  getBoard(): Readonly<Board> {
    return this.board;
  }

  evaluate(rect: Rect): SelectionEval {
    const { cells, sum } = rectToCells(this.board, rect);
    const baseValid = cells.length > 0 && sum === this.cfg.targetSum;
    const ctx: SelCtx = {
      board: this.board,
      rect,
      cells,
      sum,
      targetSum: this.cfg.targetSum,
    };
    const ov = this.bus.run('validateSelection', ctx) as Partial<SelOverride> | undefined;
    const valid = baseValid || ov?.accept === true;
    return { valid, sum, cells: ov?.cells ?? cells };
  }

  commit(action: ClearAction): CommitResult {
    const ev = this.evaluate(action.rect);
    if (this.ended) {
      this.comboCount = 0;
      return { rejected: true, reason: 'round-ended' };
    }
    if (!ev.valid) {
      this.failCount++;
      this.comboCount = 0; // a failed drag breaks the combo
      return { rejected: true, reason: ev.cells.length === 0 ? 'empty' : 'sum-mismatch' };
    }

    const cells = ev.cells;
    const clearedValues = cells.map((i) => this.board.cells[i] as number);
    const clearedTags: CellTag[] = cells.map((i) => this.board.tags?.[i] ?? 'normal');

    // The chain only continues if this clear lands within COMBO_WINDOW_MS of
    // the previous one; a longer gap lets the combo lapse and restart at 1.
    if (this.comboCount > 0 && action.tMs - this.lastClearTMs > COMBO_WINDOW_MS) {
      this.comboCount = 0;
    }
    this.comboCount++;
    this.lastClearTMs = action.tMs;
    this.lastActivityMs = this.lastNow ?? this.lastActivityMs;

    // Remove apples first; onClear sees the cleared values/tags via ctx.
    for (const i of cells) {
      this.board.cells[i] = 0;
      if (this.board.tags) this.board.tags[i] = 'normal';
    }

    const base: ClearResult = {
      cells,
      count: cells.length,
      baseScore: cells.length,
      finalScore: cells.length,
      comboMultiplier: 1,
      comboCount: this.comboCount,
    };
    const ctx: ClearCtx = {
      board: this.board,
      config: this.cfg,
      comboCount: this.comboCount,
      failCount: this.failCount,
      tMs: action.tMs,
      rng: this.seedRng.fork('clear:' + action.seq),
      clearedValues,
      clearedTags,
      grantTimeMs: (ms: number) => {
        this.remainingMs += ms;
      },
    };
    const result = (this.bus.run('onClear', base, ctx) as ClearResult | undefined) ?? base;
    this.score += result.finalScore;
    return result;
  }

  tick(nowMonotonicMs: number): TickResult {
    if (this.ended) return { remainingMs: 0, ended: true };
    if (this.lastNow === null) {
      this.lastNow = nowMonotonicMs;
      this.lastActivityMs = nowMonotonicMs;
      return { remainingMs: this.remainingMs, ended: false };
    }
    const rawDelta = Math.max(0, nowMonotonicMs - this.lastNow);
    this.lastNow = nowMonotonicMs;

    const state0: TickState = {
      remainingMs: this.remainingMs - rawDelta,
      paused: false,
    };
    const ctx: TickCtx = {
      isDragging: this.dragging,
      idleMs: Math.max(0, nowMonotonicMs - this.lastActivityMs),
      deltaMs: rawDelta,
    };
    const next = (this.bus.run('onTick', state0, ctx) as TickState | undefined) ?? state0;

    // Cap banked time at 2x the effective round duration so time-family augments
    // (e.g. countdown's +0.5s/clear) can't accumulate unbounded.
    const maxMs = this.cfg.durationMs * 2;
    this.remainingMs = Math.min(maxMs, Math.max(0, next.remainingMs));
    if (this.remainingMs <= 0) this.ended = true;
    return { remainingMs: this.remainingMs, ended: this.ended };
  }

  setDragging(dragging: boolean): void {
    if (dragging && !this.dragging) this.lastActivityMs = this.lastNow ?? this.lastActivityMs;
    this.dragging = dragging;
  }

  getScore(): number {
    return this.score;
  }

  replay(actions: ClearAction[]): number {
    // Deterministic re-simulation: rebuild from the original config + bus and
    // replay the action log. Same seed+config+log => same score.
    const tmp = new Engine();
    tmp.init(this.baseCfg, makeRng(this.baseCfg.seed), this.bus);
    for (const a of actions) tmp.commit(a);
    return tmp.getScore();
  }
}

export function createEngine(): CoreEngine {
  return new Engine();
}
