// matchmaking/roomCode.ts — 6-char room codes (plan appendix B). Excludes
// visually ambiguous characters I, O, 0, 1. PURE (randomness injected).
import type { SeededRng } from '../contracts';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LEN = 6;

export function makeRoomCode(rng: SeededRng, len: number = ROOM_CODE_LEN): string {
  let s = '';
  for (let i = 0; i < len; i++) s += ALPHABET[rng.int(ALPHABET.length)];
  return s;
}

export function isValidRoomCode(code: string): boolean {
  if (code.length !== ROOM_CODE_LEN) return false;
  for (const ch of code) if (!ALPHABET.includes(ch)) return false;
  return true;
}
