// profile/defaults.ts — rank-field defaults shared by the local + Firebase
// profile services. PvP and AI are independent ladders, each starting at
// START_MMR. `withRankDefaults` backfills profiles persisted before the AI
// ladder existed so older saves load without `undefined` ratings.
import type { Profile } from '../contracts';
import { START_MMR, tierFromMmr } from '../ranking/elo';

/** Fresh rank fields for a brand-new profile (both ladders at the start MMR). */
export function newRankFields() {
  return {
    mmr: START_MMR,
    tier: tierFromMmr(START_MMR),
    wins: 0,
    losses: 0,
    games: 0,
    aiMmr: START_MMR,
    aiTier: tierFromMmr(START_MMR),
    aiWins: 0,
    aiLosses: 0,
    aiGames: 0,
  };
}

/** Backfill any missing rank fields (e.g. a profile saved before the AI ladder). */
export function withRankDefaults(p: Profile): Profile {
  const mmr = p.mmr ?? START_MMR;
  const aiMmr = p.aiMmr ?? START_MMR;
  return {
    ...p,
    mmr,
    tier: p.tier ?? tierFromMmr(mmr),
    wins: p.wins ?? 0,
    losses: p.losses ?? 0,
    games: p.games ?? 0,
    aiMmr,
    aiTier: p.aiTier ?? tierFromMmr(aiMmr),
    aiWins: p.aiWins ?? 0,
    aiLosses: p.aiLosses ?? 0,
    aiGames: p.aiGames ?? 0,
  };
}
