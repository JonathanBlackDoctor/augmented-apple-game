// ranking/memoryStore.ts — offline/test leaderboard store (no backend). PvP and
// AI keep independent boards.
import type { Profile, PublicProfile, RankTrack } from '../contracts';
import type { RankingStore } from './RankingService';

export class InMemoryRankingStore implements RankingStore {
  private profiles = new Map<string, Profile>();
  private boards: Record<RankTrack, Map<string, PublicProfile>> = {
    pvp: new Map(),
    ai: new Map(),
  };

  async saveProfile(p: Profile): Promise<void> {
    this.profiles.set(p.uid, { ...p });
  }
  async putLeaderboard(p: PublicProfile, track: RankTrack): Promise<void> {
    this.boards[track].set(p.uid, { ...p });
  }
  async topLeaderboard(n: number, track: RankTrack): Promise<PublicProfile[]> {
    return [...this.boards[track].values()].sort((a, b) => b.mmr - a.mmr).slice(0, n);
  }
}
