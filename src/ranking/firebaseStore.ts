// ranking/firebaseStore.ts — RankingStore backed by Firebase RTDB (plan §12).
// Persists profiles + a /leaderboard mirror queried by MMR. Dynamically imported
// so the offline bundle never pulls in Firebase.
import { ref, set, update, query, orderByChild, limitToLast, get } from 'firebase/database';
import type { Profile, PublicProfile } from '../contracts';
import type { RankingStore } from './RankingService';
import { getDb } from '../net/firebaseApp';

export class FirebaseRankingStore implements RankingStore {
  async saveProfile(p: Profile): Promise<void> {
    await set(ref(getDb(), `profiles/${p.uid}`), p);
  }

  async putLeaderboard(p: PublicProfile): Promise<void> {
    await update(ref(getDb(), `leaderboard/${p.uid}`), { ...p });
  }

  async topLeaderboard(n: number): Promise<PublicProfile[]> {
    const snap = await get(query(ref(getDb(), 'leaderboard'), orderByChild('mmr'), limitToLast(n)));
    const out: PublicProfile[] = [];
    snap.forEach((c) => {
      const v = c.val() as PublicProfile | null;
      if (v) out.push(v);
    });
    return out.sort((a, b) => b.mmr - a.mmr);
  }
}
