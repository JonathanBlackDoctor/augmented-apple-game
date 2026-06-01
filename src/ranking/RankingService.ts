// ranking/RankingService.ts — applies match results to a profile + leaderboard
// mirror (plan §12). Backend-agnostic: the store is injected (in-memory offline,
// Firebase online).
import type { Profile, PublicProfile, MatchResult, RankingService, Tier } from '../contracts';
import { nextMmr, tierFromMmr } from './elo';
import { evaluateGuard } from './mmrGuard';

export interface RankingStore {
  saveProfile(p: Profile): Promise<void>;
  putLeaderboard(p: PublicProfile): Promise<void>;
  topLeaderboard(n: number): Promise<PublicProfile[]>;
}

export function toPublic(p: Profile): PublicProfile {
  return { uid: p.uid, nickname: p.nickname, avatar: p.avatar, tier: p.tier, mmr: p.mmr };
}

export class StandardRankingService implements RankingService {
  constructor(
    private readonly store: RankingStore,
    private readonly now: () => number = () => Date.now(),
  ) {}

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
    const target = nextMmr(self.mmr, opp.mmr, result, self.games, ranked);

    // MMR 조작 방지: 랭크 경기에서 같은 상대 연속 상승/하루 누적 상승 한도를
    // 넘는 상승은 차단한다(상승분만 0으로 막고, 전적·하락은 그대로 둔다).
    let mmr = target;
    if (ranked) {
      const wouldGain = target > before;
      const guard = evaluateGuard(self.mmrGuard, opp.uid, wouldGain, this.now());
      if (wouldGain && !guard.allowGain) mmr = before;
      self.mmrGuard = guard.next;
    }

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
