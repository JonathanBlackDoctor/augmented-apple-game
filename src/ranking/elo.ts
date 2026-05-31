// ranking/elo.ts — ELO/MMR math & tier table (plan §12). PURE: no IO, no ambient state.
import type { Tier, MatchResult } from '../contracts';

export const START_MMR = 1000;

/** Expected score for `self` vs `opp` (logistic, 400-scale). */
export function expectedScore(selfMmr: number, oppMmr: number): number {
  return 1 / (1 + Math.pow(10, (oppMmr - selfMmr) / 400));
}

/** K-factor: 40 during placement (<10 games), else 24. Unranked (bot) => 0. */
export function kFactor(games: number, ranked: boolean): number {
  if (!ranked) return 0;
  return games < 10 ? 40 : 24;
}

export function resultScore(r: MatchResult): number {
  return r === 'win' ? 1 : r === 'draw' ? 0.5 : 0;
}

/** New MMR after a result, rounded to an integer. */
export function nextMmr(
  selfMmr: number,
  oppMmr: number,
  r: MatchResult,
  games: number,
  ranked: boolean,
): number {
  const k = kFactor(games, ranked);
  const e = expectedScore(selfMmr, oppMmr);
  return Math.round(selfMmr + k * (resultScore(r) - e));
}

interface TierBand {
  tier: Tier;
  min: number;
}

// Ordered high -> low for first-match lookup (plan §12 tier table).
const TIER_BANDS: TierBand[] = [
  { tier: 'Master', min: 1800 },
  { tier: 'Diamond', min: 1600 },
  { tier: 'Platinum', min: 1400 },
  { tier: 'Gold', min: 1200 },
  { tier: 'Silver', min: 1000 },
  { tier: 'Bronze', min: 800 },
  { tier: 'Iron', min: -Infinity },
];

export function tierFromMmr(mmr: number): Tier {
  for (const b of TIER_BANDS) if (mmr >= b.min) return b.tier;
  return 'Iron';
}

export interface MmrBand {
  tier: Tier;
  min: number; // band floor (Iron reported as 0 for display/progress)
  max: number; // next band's floor (top band: min + 300)
  pct: number; // 0..100 progress within [min, max)
}

/** Current tier band + progress toward the next tier (for result-screen bars). */
export function mmrBand(mmr: number): MmrBand {
  const asc = [...TIER_BANDS].reverse(); // low → high
  let i = 0;
  for (let j = 0; j < asc.length; j++) if (mmr >= asc[j].min) i = j;
  const cur = asc[i];
  const next = asc[i + 1];
  const min = Number.isFinite(cur.min) ? cur.min : 0;
  const max = next ? next.min : min + 300;
  const pct = Math.max(0, Math.min(100, ((mmr - min) / (max - min)) * 100));
  return { tier: cur.tier, min, max, pct };
}
