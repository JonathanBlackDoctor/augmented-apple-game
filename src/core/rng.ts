// core/rng.ts — deterministic mulberry32 RNG (plan §5.2, §7).
// PURE: uses only Math.imul/Math.floor (allowed); never Math.random/Date.now.
import type { SeededRng } from '../contracts/rng';

/** xmur3 string hash -> 32-bit unsigned seed. */
function hashSeed(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  h ^= h >>> 16;
  return h >>> 0;
}

class Mulberry32 implements SeededRng {
  private a: number;
  private readonly seedStr: string;

  constructor(seedStr: string) {
    this.seedStr = seedStr;
    this.a = hashSeed(seedStr);
  }

  next(): number {
    this.a |= 0;
    this.a = (this.a + 0x6d2b79f5) | 0;
    let t = Math.imul(this.a ^ (this.a >>> 15), 1 | this.a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(maxExclusive: number): number {
    if (maxExclusive <= 0) return 0;
    return Math.floor(this.next() * maxExclusive);
  }

  fork(label: string): SeededRng {
    // Independent of how much the parent stream has been consumed: the sub-seed
    // is a pure function of (parent seed, label) so every client agrees.
    return new Mulberry32(this.seedStr + '::' + label);
  }
}

export function makeRng(seed: string): SeededRng {
  return new Mulberry32(seed);
}
