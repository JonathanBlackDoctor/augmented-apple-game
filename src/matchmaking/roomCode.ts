// matchmaking/roomCode.ts — 3-digit numeric room codes. Easy to read aloud and
// type on a phone keypad. PURE (randomness injected).
import type { SeededRng } from '../contracts';

const ALPHABET = '0123456789';
export const ROOM_CODE_LEN = 3;

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
