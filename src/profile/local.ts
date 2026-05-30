// profile/local.ts — offline anonymous identity persisted via a KV store
// (plan §12). The Firebase-backed service mirrors this to /profiles/{uid}.
import type { Profile, ProfileService } from '../contracts';
import { tierFromMmr, START_MMR } from '../ranking/elo';

export interface KV {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

/** In-memory KV for tests / SSR. */
export const memoryKV = (): KV => {
  const m = new Map<string, string>();
  return { get: (k) => m.get(k) ?? null, set: (k, v) => void m.set(k, v) };
};

/** localStorage-backed KV for the browser (degrades to no-op in private mode). */
export const browserKV = (): KV => ({
  get: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* private mode / disabled storage — ignore */
    }
  },
});

const KEY = 'aag.profile.v1';
const AVATARS = ['🍎', '🍏', '🍊', '🍇', '🍒', '🍓', '🥝', '🍑'];

function randomUid(): string {
  return 'local-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export class LocalProfileService implements ProfileService {
  private profile: Profile | null = null;
  constructor(private readonly kv: KV) {}

  async signInAnon(): Promise<Profile> {
    const raw = this.kv.get(KEY);
    if (raw) {
      try {
        this.profile = JSON.parse(raw) as Profile;
        return this.profile;
      } catch {
        /* corrupt — recreate below */
      }
    }
    const uid = randomUid();
    this.profile = {
      uid,
      nickname: '사과러' + uid.slice(-4),
      avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)],
      mmr: START_MMR,
      tier: tierFromMmr(START_MMR),
      wins: 0,
      losses: 0,
      games: 0,
      unlocks: [],
      createdAt: Date.now(),
    };
    this.persist();
    return this.profile;
  }

  get(): Profile {
    if (!this.profile) throw new Error('ProfileService.signInAnon() must be called first');
    return this.profile;
  }

  async setNickname(n: string): Promise<void> {
    const p = this.get();
    p.nickname = n.trim().slice(0, 16) || p.nickname;
    this.persist();
  }

  /** Persist after external mutation (e.g. ranking updates self.mmr/tier). */
  persist(): void {
    if (this.profile) this.kv.set(KEY, JSON.stringify(this.profile));
  }
}
