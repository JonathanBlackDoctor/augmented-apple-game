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
  // PvP (competitive) rating — the PRIMARY rank shown as the player's identity.
  mmr: number;
  tier: Tier;
  wins: number;
  losses: number;
  games: number;
  // AI-ladder rating — tracked separately so farming the campaign never inflates
  // the competitive PvP ladder. Visible, but secondary to PvP.
  aiMmr: number;
  aiTier: Tier;
  aiWins: number;
  aiLosses: number;
  aiGames: number;
  unlocks: string[];
  createdAt: number;
}

export type PublicProfile = Pick<Profile, 'uid' | 'nickname' | 'avatar' | 'tier' | 'mmr'>;

export type MatchResult = 'win' | 'loss' | 'draw';

/** Which independent ladder a result counts toward (separate MMR + leaderboard). */
export type RankTrack = 'pvp' | 'ai';

export interface ProfileService {
  signInAnon(): Promise<Profile>;
  get(): Profile;
  setNickname(n: string): Promise<void>;
}

export interface RankingService {
  applyResult(
    self: Profile,
    opp: PublicProfile,
    result: MatchResult,
    track: RankTrack,
  ): Promise<{ mmrDelta: number; tier: Tier }>;
  leaderboard(top: number, track: RankTrack): Promise<PublicProfile[]>;
  tierFromMmr(mmr: number): Tier;
}
