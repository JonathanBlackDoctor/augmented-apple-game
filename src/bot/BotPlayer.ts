// bot/BotPlayer.ts — AI opponent decision logic (plan §13). Unranked (MMR k=0).
// PURE: randomness via injected SeededRng; timing is returned, the caller (app)
// schedules it against the real clock. Strength is fully described by a BotTuning
// (see bot/levels.ts for the 10 named campaign rivals that supply it).
import type { Board, Rect, SeededRng } from '../contracts';
import { findMoves, type BotMove } from './solver';

export interface BotTuning {
  minDelayMs: number;
  maxDelayMs: number;
  pickTop: number; // sample among the N largest moves (1 = always the best)
  blunderChance: number; // chance to ignore strength and pick a fully random move
}

export interface BotDecision {
  rect: Rect;
  delayMs: number; // how long the bot "thinks" before committing this move
}

/** Decide the bot's next move on `board` for the given tuning. Null = no move. */
export function decide(
  board: Board,
  target: number,
  t: BotTuning,
  rng: SeededRng,
): BotDecision | null {
  const moves = findMoves(board, target);
  if (moves.length === 0) return null;
  const delayMs = t.minDelayMs + rng.int(Math.max(1, t.maxDelayMs - t.minDelayMs + 1));
  let pick: BotMove;
  if (rng.next() < t.blunderChance) {
    pick = moves[rng.int(moves.length)]; // random (suboptimal) move
  } else {
    // Sample among the N largest moves; pickTop=1 collapses to perfect play.
    const sorted = [...moves].sort((a, b) => b.count - a.count).slice(0, Math.max(1, t.pickTop));
    pick = sorted[rng.int(sorted.length)];
  }
  return { rect: pick.rect, delayMs };
}
