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
