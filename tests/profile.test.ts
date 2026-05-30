import { describe, it, expect } from 'vitest';
import { LocalProfileService, memoryKV } from '../src/profile';

describe('LocalProfileService', () => {
  it('creates and persists an anonymous profile', async () => {
    const kv = memoryKV();
    const svc = new LocalProfileService(kv);
    const p = await svc.signInAnon();
    expect(p.uid).toMatch(/^local-/);
    expect(p.mmr).toBe(1000);
    expect(p.tier).toBe('Silver');
    expect(p.games).toBe(0);
  });

  it('reloads the same identity from the same store', async () => {
    const kv = memoryKV();
    const a = await new LocalProfileService(kv).signInAnon();
    const b = await new LocalProfileService(kv).signInAnon();
    expect(b.uid).toBe(a.uid);
  });

  it('caps nickname at 16 chars and ignores blank', async () => {
    const svc = new LocalProfileService(memoryKV());
    await svc.signInAnon();
    await svc.setNickname('x'.repeat(40));
    expect(svc.get().nickname.length).toBe(16);
    const before = svc.get().nickname;
    await svc.setNickname('   ');
    expect(svc.get().nickname).toBe(before);
  });
});
