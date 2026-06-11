// ranking/firebaseStore.ts — RankingStore backed by Firebase RTDB (plan §12).
// Persists profiles + a /leaderboard mirror queried by MMR. Dynamically imported
// so the offline bundle never pulls in Firebase.
import { ref, set, update, query, orderByChild, limitToLast, get } from 'firebase/database';
import type { Profile, PublicProfile, RankTrack } from '../contracts';
import type { RankingStore } from './RankingService';
import { getDb } from '../net/firebaseApp';

/** Separate RTDB nodes per ladder: /leaderboard (PvP) and /leaderboardAi (AI). */
function boardNode(track: RankTrack): string {
  return track === 'ai' ? 'leaderboardAi' : 'leaderboard';
}

export class FirebaseRankingStore implements RankingStore {
  async saveProfile(p: Profile): Promise<void> {
    await set(ref(getDb(), `profiles/${p.uid}`), p);
  }

  async putLeaderboard(p: PublicProfile, track: RankTrack): Promise<void> {
    await update(ref(getDb(), `${boardNode(track)}/${p.uid}`), { ...p });
  }

  async topLeaderboard(n: number, track: RankTrack): Promise<PublicProfile[]> {
    const snap = await get(
      query(ref(getDb(), boardNode(track)), orderByChild('mmr'), limitToLast(n)),
    );
    const out: PublicProfile[] = [];
    snap.forEach((c) => {
      const v = c.val() as PublicProfile | null;
      if (v) out.push(v);
    });
    return out.sort((a, b) => b.mmr - a.mmr);
  }
}
