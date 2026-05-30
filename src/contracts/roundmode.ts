// contracts/roundmode.ts — versus-mode plugin contract (plan §5.4, §9)
import type { RoundConfig } from './core';

export type PlayerId = string;

export interface RoundOutcome {
  perPlayer: Record<PlayerId, number>;
  winner: PlayerId | 'draw';
  bonus: number; // round-winner bonus added to cumulative total
}

export interface Claim {
  player: PlayerId;
  seq: number;
  cells: number[];
  tsServer: number;
}

export type ClaimResolution = { ok: true; cells: number[] } | { ok: false; reason: string };

export type BuildRoundResult =
  | { kind: 'separate'; configs: Record<PlayerId, RoundConfig> }
  | { kind: 'shared'; config: RoundConfig };

export interface RoundMode {
  id: string;
  isShared: boolean;
  buildRound(seed: string, players: PlayerId[]): BuildRoundResult;
  /** Shared-board only: atomically resolve a cell claim against owned cells. */
  resolveClaim?(claim: Claim, owned: Set<number>): ClaimResolution;
  scoreRound(perPlayer: Record<PlayerId, number>): RoundOutcome;
}
