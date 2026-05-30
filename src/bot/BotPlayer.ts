// bot/BotPlayer.ts — AI opponent decision logic (plan §13). Unranked (MMR k=0).
// PURE: randomness via injected SeededRng; timing is returned, the caller (app)
// schedules it against the real clock.
import type { Board, Rect, SeededRng } from '../contracts';
import { findMoves, type BotMove } from './solver';

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface BotTuning {
  minDelayMs: number;
  maxDelayMs: number;
  pickTop: number; // among the N largest moves
  blunderChance: number; // chance to pick a random (suboptimal) move
}

// Tuned down so the bot is beatable: slower "thinking", more blunders, and even
// 'hard' samples among the top moves instead of playing perfectly.
export const TUNING: Record<Difficulty, BotTuning> = {
  easy: { minDelayMs: 2200, maxDelayMs: 3800, pickTop: 1, blunderChance: 0.5 },
  normal: { minDelayMs: 1400, maxDelayMs: 2400, pickTop: 6, blunderChance: 0.25 },
  hard: { minDelayMs: 800, maxDelayMs: 1600, pickTop: 3, blunderChance: 0.1 },
};

export interface BotDecision {
  rect: Rect;
  delayMs: number; // how long the bot "thinks" before committing this move
}

/** Decide the bot's next move on `board`. Returns null when no move exists. */
export function decide(
  board: Board,
  target: number,
  diff: Difficulty,
  rng: SeededRng,
): BotDecision | null {
  const t = TUNING[diff];
  const moves = findMoves(board, target);
  if (moves.length === 0) return null;
  const delayMs = t.minDelayMs + rng.int(Math.max(1, t.maxDelayMs - t.minDelayMs + 1));
  const blunder = rng.next() < t.blunderChance;
  let pick: BotMove;
  if (blunder || diff === 'easy') {
    pick = moves[rng.int(moves.length)];
  } else {
    // normal & hard: sample among the N largest moves. Even 'hard' no longer
    // always grabs the single best, so it's strong but beatable.
    const sorted = [...moves].sort((a, b) => b.count - a.count).slice(0, Math.max(1, t.pickTop));
    pick = sorted[rng.int(sorted.length)];
  }
  return { rect: pick.rect, delayMs };
}

/** Difficulty auto-matched to the player's tier-ish MMR (plan §13). */
export function difficultyForMmr(mmr: number): Difficulty {
  if (mmr < 1100) return 'easy';
  if (mmr < 1500) return 'normal';
  return 'hard';
}
