// contracts/profile.ts — identity, profile & ranking contracts (plan §5.6, §12)

export type Tier =
  | 'Iron'
  | 'Bronze'
  | 'Silver'
  | 'Gold'
  | 'Platinum'
  | 'Diamond'
  | 'Master';

export interface Profile {
  uid: string;
  nickname: string;
  avatar: string;
  mmr: number;
  tier: Tier;
  wins: number;
  losses: number;
  games: number;
  unlocks: string[];
  createdAt: number;
  /** MMR 조작 방지를 위한 상승 한도 추적 상태. 기존 프로필에는 없을 수 있다. */
  mmrGuard?: MmrGuard;
}

/** MMR 상승 조작(같은 상대 반복 승리, 하루 과다 승리) 방지를 위한 추적 상태. */
export interface MmrGuard {
  /** 마지막으로 랭크 MMR 변동을 처리한 상대 식별자. */
  lastOpponentId: string;
  /** 같은 상대에게 연속으로 MMR이 상승한 횟수. */
  sameOpponentGainStreak: number;
  /** dailyGainDayKey 기준 그날 누적된 MMR 상승 횟수. */
  dailyGainCount: number;
  /** dailyGainCount가 집계되는 일자 키(UTC 자정마다 +1). */
  dailyGainDayKey: number;
}

export type PublicProfile = Pick<Profile, 'uid' | 'nickname' | 'avatar' | 'tier' | 'mmr'>;

export interface ProfileService {
  signInAnon(): Promise<Profile>;
  get(): Profile;
  setNickname(n: string): Promise<void>;
}

export type MatchResult = 'win' | 'loss' | 'draw';

export interface RankingService {
  applyResult(
    self: Profile,
    opp: PublicProfile,
    result: MatchResult,
    ranked: boolean,
  ): Promise<{ mmrDelta: number; tier: Tier }>;
  leaderboard(top: number): Promise<PublicProfile[]>;
  tierFromMmr(mmr: number): Tier;
}
