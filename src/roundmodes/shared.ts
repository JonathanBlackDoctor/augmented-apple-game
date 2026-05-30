// roundmodes/shared.ts — "same board, race to clear" mode (plan §9/§10.2).
// Cell claims are resolved atomically (first-come, all-or-nothing).
import type {
  RoundMode,
  RoundConfig,
  PlayerId,
  RoundOutcome,
  BuildRoundResult,
  Claim,
  ClaimResolution,
} from '../contracts';
import { DEFAULT_COLS, DEFAULT_ROWS, DEFAULT_DURATION_MS, DEFAULT_TARGET_SUM } from '../core';

export interface SharedOptions {
  cols: number;
  rows: number;
  durationMs: number;
  targetSum: number;
  winnerBonus: number;
}

export function createSharedMode(opts: Partial<SharedOptions> = {}): RoundMode {
  const cols = opts.cols ?? DEFAULT_COLS;
  const rows = opts.rows ?? DEFAULT_ROWS;
  const durationMs = opts.durationMs ?? DEFAULT_DURATION_MS;
  const targetSum = opts.targetSum ?? DEFAULT_TARGET_SUM;
  const winnerBonus = opts.winnerBonus ?? 50;

  return {
    id: 'shared',
    isShared: true,
    buildRound(seed: string, _players: PlayerId[]): BuildRoundResult {
      const config: RoundConfig = {
        seed,
        cols,
        rows,
        durationMs,
        targetSum,
        modeId: 'shared',
        augmentIds: [],
      };
      return { kind: 'shared', config };
    },
    resolveClaim(claim: Claim, owned: Set<number>): ClaimResolution {
      for (const c of claim.cells) if (owned.has(c)) return { ok: false, reason: 'claimed' };
      for (const c of claim.cells) owned.add(c);
      return { ok: true, cells: claim.cells };
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
