// ranking/RankingService.ts — applies match results to a profile + leaderboard
// mirror (plan §12). Backend-agnostic: the store is injected (in-memory offline,
// Firebase online).
import type { Profile, PublicProfile, MatchResult, RankingService, Tier } from '../contracts';
import { nextMmr, tierFromMmr } from './elo';

export interface RankingStore {
  saveProfile(p: Profile): Promise<void>;
  putLeaderboard(p: PublicProfile): Promise<void>;
  topLeaderboard(n: number): Promise<PublicProfile[]>;
}

export function toPublic(p: Profile): PublicProfile {
  return { uid: p.uid, nickname: p.nickname, avatar: p.avatar, tier: p.tier, mmr: p.mmr };
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
    ranked: boolean,
  ): Promise<{ mmrDelta: number; tier: Tier }> {
    const before = self.mmr;
    const mmr = nextMmr(self.mmr, opp.mmr, result, self.games, ranked);
    const delta = mmr - before;
    self.mmr = mmr;
    self.tier = tierFromMmr(mmr);
    self.games += 1;
    if (result === 'win') self.wins += 1;
    else if (result === 'loss') self.losses += 1;
    await this.store.saveProfile(self);
    if (ranked) await this.store.putLeaderboard(toPublic(self));
    return { mmrDelta: delta, tier: self.tier };
  }

  async leaderboard(top: number): Promise<PublicProfile[]> {
    return this.store.topLeaderboard(top);
  }
}
