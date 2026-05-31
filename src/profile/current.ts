// profile/current.ts — convenience loader for "my" profile used by read-only
// screens (home rank badge, leaderboard self-highlight). Mirrors the backend
// selection the match controllers use: Firebase when configured, else local.
import type { Profile } from '../contracts';
import { FIREBASE_CONFIGURED } from '../net/firebaseConfig';
import { LocalProfileService, browserKV } from './index';

// Not cached: the match controllers persist mmr/tier after each ranked result,
// so re-reading on every mount keeps the home/leaderboard badges fresh.
export async function loadMyProfile(): Promise<Profile> {
  if (FIREBASE_CONFIGURED) {
    try {
      const { FirebaseProfileService } = await import('./firebase');
      return await new FirebaseProfileService().signInAnon();
    } catch {
      /* fall through to local */
    }
  }
  return new LocalProfileService(browserKV()).signInAnon();
}
