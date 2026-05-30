// roundmodes/separate.ts — "each player on their own identical board" mode
// (plan §9). Simplest/base mode; shared & sabotage modes follow in Phase 4.
import type {
  RoundMode,
  RoundConfig,
  PlayerId,
  RoundOutcome,
  BuildRoundResult,
} from '../contracts';
import { DEFAULT_COLS, DEFAULT_ROWS, DEFAULT_DURATION_MS, DEFAULT_TARGET_SUM } from '../core';

export interface SeparateOptions {
  cols: number;
  rows: number;
  durationMs: number;
  targetSum: number;
  winnerBonus: number;
}

export function createSeparateMode(opts: Partial<SeparateOptions> = {}): RoundMode {
  const cols = opts.cols ?? DEFAULT_COLS;
  const rows = opts.rows ?? DEFAULT_ROWS;
  const durationMs = opts.durationMs ?? DEFAULT_DURATION_MS;
  const targetSum = opts.targetSum ?? DEFAULT_TARGET_SUM;
  const winnerBonus = opts.winnerBonus ?? 50;

  return {
    id: 'separate',
    isShared: false,
    buildRound(seed: string, players: PlayerId[]): BuildRoundResult {
      const configs: Record<PlayerId, RoundConfig> = {};
      for (const p of players) {
        // Same seed => identical board for every player (augmentIds filled by app).
        configs[p] = { seed, cols, rows, durationMs, targetSum, modeId: 'separate', augmentIds: [] };
      }
      return { kind: 'separate', configs };
    },
    scoreRound(perPlayer: Record<PlayerId, number>): RoundOutcome {
      let winner: PlayerId | 'draw' = 'draw';
      let best = -Infinity;
      let tie = false;
      for (const [p, s] of Object.entries(perPlayer)) {
        if (s > best) {
          best = s;
          winner = p;
          tie = false;
        } else if (s === best) {
          tie = true;
        }
      }
      if (tie) winner = 'draw';
      return { perPlayer, winner, bonus: winner === 'draw' ? 0 : winnerBonus };
    },
  };
}
