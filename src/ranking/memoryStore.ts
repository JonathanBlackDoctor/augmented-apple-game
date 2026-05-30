// ranking/memoryStore.ts — offline/test leaderboard store (no backend).
import type { Profile, PublicProfile } from '../contracts';
import type { RankingStore } from './RankingService';

export class InMemoryRankingStore implements RankingStore {
  private profiles = new Map<string, Profile>();
  private board = new Map<string, PublicProfile>();

  async saveProfile(p: Profile): Promise<void> {
    this.profiles.set(p.uid, { ...p });
  }
  async putLeaderboard(p: PublicProfile): Promise<void> {
    this.board.set(p.uid, { ...p });
  }
  async topLeaderboard(n: number): Promise<PublicProfile[]> {
    return [...this.board.values()].sort((a, b) => b.mmr - a.mmr).slice(0, n);
  }
}
