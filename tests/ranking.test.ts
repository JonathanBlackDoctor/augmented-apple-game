import { describe, it, expect } from 'vitest';
import { expectedScore, kFactor, nextMmr, tierFromMmr } from '../src/ranking/elo';
import { StandardRankingService, InMemoryRankingStore } from '../src/ranking';
import type { Profile, PublicProfile } from '../src/contracts';

describe('elo math', () => {
  it('expected score is 0.5 for equal mmr', () => {
    expect(expectedScore(1000, 1000)).toBeCloseTo(0.5, 6);
  });
  it('favors the higher-rated player', () => {
    expect(expectedScore(1400, 1000)).toBeGreaterThan(0.9);
    expect(expectedScore(1000, 1400)).toBeLessThan(0.1);
  });
  it('k-factor: placement / settled / unranked', () => {
    expect(kFactor(0, true)).toBe(40);
    expect(kFactor(9, true)).toBe(40);
    expect(kFactor(10, true)).toBe(24);
    expect(kFactor(3, false)).toBe(0);
  });
  it('equal opponents: win +20 (K=40), loss -20, draw 0', () => {
    expect(nextMmr(1000, 1000, 'win', 0, true)).toBe(1020);
    expect(nextMmr(1000, 1000, 'loss', 0, true)).toBe(980);
    expect(nextMmr(1000, 1000, 'draw', 0, true)).toBe(1000);
  });
  it('unranked never changes mmr', () => {
    expect(nextMmr(1000, 1500, 'win', 0, false)).toBe(1000);
  });
  it('tier boundaries', () => {
    expect(tierFromMmr(799)).toBe('Iron');
    expect(tierFromMmr(800)).toBe('Bronze');
    expect(tierFromMmr(1000)).toBe('Silver');
    expect(tierFromMmr(1200)).toBe('Gold');
    expect(tierFromMmr(1400)).toBe('Platinum');
    expect(tierFromMmr(1600)).toBe('Diamond');
    expect(tierFromMmr(1800)).toBe('Master');
  });
});

describe('RankingService', () => {
  const mkProfile = (uid: string, mmr: number, games = 0): Profile => ({
    uid,
    nickname: uid,
    avatar: '🍎',
    mmr,
    tier: tierFromMmr(mmr),
    wins: 0,
    losses: 0,
    games,
    aiMmr: 1000,
    aiTier: tierFromMmr(1000),
    aiWins: 0,
    aiLosses: 0,
    aiGames: 0,
    unlocks: [],
    createdAt: 0,
  });
  const opp = (mmr: number): PublicProfile => ({ uid: 'op', nickname: 'op', avatar: '🍏', tier: tierFromMmr(mmr), mmr });

  it('applies a PvP win and mirrors to the PvP leaderboard only', async () => {
    const svc = new StandardRankingService(new InMemoryRankingStore());
    const self = mkProfile('me', 1000);
    const { mmrDelta, tier } = await svc.applyResult(self, opp(1000), 'win', 'pvp');
    expect(mmrDelta).toBe(20);
    expect(self.mmr).toBe(1020);
    expect(self.wins).toBe(1);
    expect(self.games).toBe(1);
    expect(tier).toBe('Silver');
    const lb = await svc.leaderboard(10, 'pvp');
    expect(lb[0].uid).toBe('me');
    expect(lb[0].mmr).toBe(1020);
    // The AI ladder is untouched by a PvP result.
    expect(self.aiMmr).toBe(1000);
    expect((await svc.leaderboard(10, 'ai')).length).toBe(0);
  });

  it('AI and PvP ladders are fully independent (separate MMR + leaderboard)', async () => {
    const svc = new StandardRankingService(new InMemoryRankingStore());
    const self = mkProfile('me', 1000);
    const { mmrDelta } = await svc.applyResult(self, opp(1000), 'win', 'ai');
    expect(mmrDelta).toBe(20);
    expect(self.aiMmr).toBe(1020);
    expect(self.aiWins).toBe(1);
    expect(self.aiGames).toBe(1);
    // PvP rating + record stay put.
    expect(self.mmr).toBe(1000);
    expect(self.wins).toBe(0);
    expect(self.games).toBe(0);
    const aiLb = await svc.leaderboard(10, 'ai');
    expect(aiLb[0].uid).toBe('me');
    expect(aiLb[0].mmr).toBe(1020);
    expect((await svc.leaderboard(10, 'pvp')).length).toBe(0);
  });
});
