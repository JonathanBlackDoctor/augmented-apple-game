// app/companion.ts — shared tuning for the 새콤이 ally (augment `board.companion`).
//
// The companion is an app-layer behaviour, not a core hook: while the owner holds
// the augment, the active controller (solo / vs-AI / online) periodically clears
// one sum-10 group on the OWNER's own board and animates 새콤이 doing it. Keeping
// the cadence + id here means all three controllers stay in lockstep.
import type { Board, Rect } from '../contracts';
import { findMoves } from '../bot';

export const COMPANION_ID = 'board.companion';

/** Delay before 새콤이's first helping clear, and the gap between clears (ms). */
export const COMPANION_FIRST_MS = 2600;
export const COMPANION_INTERVAL_MS = 3900;

/** Pick the sum-`target` rectangle the companion should clear: the one removing
 *  the most apples (most satisfying), deterministic so it never desyncs a replay.
 *  Returns null when the board has no valid move left. */
export function companionMove(board: Board, target: number): Rect | null {
  const moves = findMoves(board, target);
  if (moves.length === 0) return null;
  let best = moves[0];
  for (const m of moves) if (m.count > best.count) best = m;
  return best.rect;
}
