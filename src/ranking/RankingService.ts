// ranking/RankingService.ts — applies match results to a profile + leaderboard
// mirror (plan §12). Backend-agnostic: the store is injected (in-memory offline,
// Firebase online). PvP and AI are SEPARATE ladders — each has its own MMR on the
// profile and its own leaderboard node, selected by the `track`.
import type { Profile, PublicProfile, MatchResult, RankingService, RankTrack, Tier } from '../contracts';
import { nextMmr, tierFromMmr } from './elo';

export interface RankingStore {
  saveProfile(p: Profile): Promise<void>;
  putLeaderboard(p: PublicProfile, track: RankTrack): Promise<void>;
  topLeaderboard(n: number, track: RankTrack): Promise<PublicProfile[]>;
}

/** A public profile carrying the rating/tier of the requested ladder. */
export function toPublic(p: Profile, track: RankTrack): PublicProfile {
  const mmr = track === 'ai' ? p.aiMmr : p.mmr;
  const tier = track === 'ai' ? p.aiTier : p.tier;
  return { uid: p.uid, nickname: p.nickname, avatar: p.avatar, tier, mmr };
}

export class StandardRankingService implements RankingService {
  constructor(private readonly store: RankingStore) {}

  tierFromMmr(mmr: number): Tier {
    return tierFromMmr(mmr);
  }

  async applyResult(
    self: Profile,
    opp: PublicProfile,
    result: MatchResult,
    track: RankTrack,
  ): Promise<{ mmrDelta: number; tier: Tier }> {
    const ai = track === 'ai';
    const before = ai ? self.aiMmr : self.mmr;
    const games = ai ? self.aiGames : self.games;
    // Both ladders rank; placement vs settled K-factor keys off each ladder's own
    // game count (so AI placement is independent of PvP placement).
    const mmr = nextMmr(before, opp.mmr, result, games, true);
    const delta = mmr - before;
    const tier = tierFromMmr(mmr);
    if (ai) {
      self.aiMmr = mmr;
      self.aiTier = tier;
      self.aiGames += 1;
      if (result === 'win') self.aiWins += 1;
      else if (result === 'loss') self.aiLosses += 1;
    } else {
      self.mmr = mmr;
      self.tier = tier;
      self.games += 1;
      if (result === 'win') self.wins += 1;
      else if (result === 'loss') self.losses += 1;
    }
    await this.store.saveProfile(self);
    await this.store.putLeaderboard(toPublic(self, track), track);
    return { mmrDelta: delta, tier };
  }

  async leaderboard(top: number, track: RankTrack): Promise<PublicProfile[]> {
    return this.store.topLeaderboard(top, track);
  }
}
