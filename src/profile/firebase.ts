// profile/firebase.ts — ProfileService over Firebase Anonymous Auth + RTDB
// /profiles/{uid} (plan §12). Cross-device persistent identity.
import { signInAnonymously } from 'firebase/auth';
import { ref, get, set, update } from 'firebase/database';
import type { Profile, ProfileService } from '../contracts';
import { tierFromMmr, START_MMR } from '../ranking/elo';
import { getFirebaseAuth, getDb } from '../net/firebaseApp';

const AVATARS = ['🍎', '🍏', '🍊', '🍇', '🍒', '🍓', '🥝', '🍑'];

export class FirebaseProfileService implements ProfileService {
  private profile: Profile | null = null;

  async signInAnon(): Promise<Profile> {
    const cred = await signInAnonymously(getFirebaseAuth());
    const uid = cred.user.uid;
    const db = getDb();
    const snap = await get(ref(db, `profiles/${uid}`));
    if (snap.exists()) {
      this.profile = snap.val() as Profile;
      return this.profile;
    }
    const p: Profile = {
      uid,
      nickname: '사과러' + uid.slice(0, 4),
      avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)],
      mmr: START_MMR,
      tier: tierFromMmr(START_MMR),
      wins: 0,
      losses: 0,
      games: 0,
      unlocks: [],
      createdAt: Date.now(),
    };
    await set(ref(db, `profiles/${uid}`), p);
    this.profile = p;
    return p;
  }

  get(): Profile {
    if (!this.profile) throw new Error('FirebaseProfileService.signInAnon() must be called first');
    return this.profile;
  }

  async setNickname(n: string): Promise<void> {
    const p = this.get();
    p.nickname = n.trim().slice(0, 16) || p.nickname;
    await update(ref(getDb(), `profiles/${p.uid}`), { nickname: p.nickname });
  }

  /** Persist the full profile (e.g. after a ranked result updates mmr/tier). */
  async save(): Promise<void> {
    if (this.profile) await set(ref(getDb(), `profiles/${this.profile.uid}`), this.profile);
  }
}
