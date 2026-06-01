import { describe, it, expect } from 'vitest';
import {
  evaluateGuard,
  dayKeyOf,
  initialGuard,
  MAX_CONSECUTIVE_GAINS_VS_SAME_OPPONENT,
  MAX_DAILY_GAINS,
} from '../src/ranking/mmrGuard';
import { StandardRankingService } from '../src/ranking/RankingService';
import type { RankingStore } from '../src/ranking/RankingService';
import type { Profile, PublicProfile } from '../src/contracts';

const DAY_MS = 24 * 60 * 60 * 1000;
const now = 100 * DAY_MS;

describe('mmrGuard.evaluateGuard', () => {
  it('같은 상대 상대로 5회까지 상승을 허용하고 6회째부터 차단한다', () => {
    let guard = initialGuard();
    const allowed: boolean[] = [];
    for (let i = 0; i < MAX_CONSECUTIVE_GAINS_VS_SAME_OPPONENT + 2; i++) {
      const ev = evaluateGuard(guard, 'rival', true, now);
      allowed.push(ev.allowGain);
      guard = ev.next;
    }
    expect(allowed).toEqual([true, true, true, true, true, false, false]);
    expect(guard.sameOpponentGainStreak).toBe(MAX_CONSECUTIVE_GAINS_VS_SAME_OPPONENT);
  });

  it('연속 상승 한도 초과 시 same-opponent 사유를 보고한다', () => {
    let guard = initialGuard();
    for (let i = 0; i < MAX_CONSECUTIVE_GAINS_VS_SAME_OPPONENT; i++) {
      guard = evaluateGuard(guard, 'rival', true, now).next;
    }
    const ev = evaluateGuard(guard, 'rival', true, now);
    expect(ev.allowGain).toBe(false);
    expect(ev.reason).toBe('same-opponent');
  });

  it('다른 상대로 바뀌면 연속 상승 streak이 리셋된다', () => {
    let guard = initialGuard();
    for (let i = 0; i < MAX_CONSECUTIVE_GAINS_VS_SAME_OPPONENT; i++) {
      guard = evaluateGuard(guard, 'rival', true, now).next;
    }
    expect(evaluateGuard(guard, 'rival', true, now).allowGain).toBe(false);
    const ev = evaluateGuard(guard, 'someone-else', true, now);
    expect(ev.allowGain).toBe(true);
    expect(ev.next.sameOpponentGainStreak).toBe(1);
  });

  it('패배/무승부(상승 아님)는 연속 상승 streak을 끊는다', () => {
    let guard = initialGuard();
    guard = evaluateGuard(guard, 'rival', true, now).next;
    guard = evaluateGuard(guard, 'rival', true, now).next;
    expect(guard.sameOpponentGainStreak).toBe(2);
    guard = evaluateGuard(guard, 'rival', false, now).next;
    expect(guard.sameOpponentGainStreak).toBe(0);
    const ev = evaluateGuard(guard, 'rival', true, now);
    expect(ev.allowGain).toBe(true);
    expect(ev.next.sameOpponentGainStreak).toBe(1);
  });

  it('하루 10회까지 상승을 허용하고 11회째부터 차단한다 (상대를 매번 바꿔도)', () => {
    let guard = initialGuard();
    const allowed: boolean[] = [];
    for (let i = 0; i < MAX_DAILY_GAINS + 2; i++) {
      const ev = evaluateGuard(guard, `opp-${i}`, true, now);
      allowed.push(ev.allowGain);
      guard = ev.next;
    }
    expect(allowed.slice(0, MAX_DAILY_GAINS).every(Boolean)).toBe(true);
    expect(allowed[MAX_DAILY_GAINS]).toBe(false);
    expect(allowed[MAX_DAILY_GAINS + 1]).toBe(false);
  });

  it('일일 한도 초과 시 daily-limit 사유를 보고한다', () => {
    let guard = initialGuard();
    for (let i = 0; i < MAX_DAILY_GAINS; i++) {
      guard = evaluateGuard(guard, `opp-${i}`, true, now).next;
    }
    const ev = evaluateGuard(guard, 'fresh-opp', true, now);
    expect(ev.allowGain).toBe(false);
    expect(ev.reason).toBe('daily-limit');
  });

  it('날짜가 바뀌면 일일 카운터가 리셋된다', () => {
    let guard = initialGuard();
    for (let i = 0; i < MAX_DAILY_GAINS; i++) {
      guard = evaluateGuard(guard, `opp-${i}`, true, now).next;
    }
    expect(evaluateGuard(guard, 'x', true, now).allowGain).toBe(false);
    const ev = evaluateGuard(guard, 'x', true, now + DAY_MS);
    expect(ev.allowGain).toBe(true);
    expect(ev.next.dailyGainCount).toBe(1);
  });

  it('dayKeyOf는 같은 날이면 같은 키, 자정 넘어가면 +1', () => {
    expect(dayKeyOf(now)).toBe(dayKeyOf(now + DAY_MS - 1));
    expect(dayKeyOf(now + DAY_MS)).toBe(dayKeyOf(now) + 1);
  });
});

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    uid: 'me',
    nickname: '나',
    avatar: '🍎',
    mmr: 1000,
    tier: 'Silver',
    wins: 0,
    losses: 0,
    games: 30, // 배치 종료(정착) 상태 → K-factor 안정화
    unlocks: [],
    createdAt: 0,
    ...overrides,
  };
}

const rival: PublicProfile = {
  uid: 'rival',
  nickname: '라이벌',
  avatar: '🍏',
  tier: 'Silver',
  mmr: 1000,
};

class MemoryStore implements RankingStore {
  profiles: Profile[] = [];
  async saveProfile(p: Profile): Promise<void> {
    this.profiles.push({ ...p });
  }
  async putLeaderboard(): Promise<void> {}
  async topLeaderboard(): Promise<PublicProfile[]> {
    return [];
  }
}

describe('StandardRankingService MMR 조작 방지 통합', () => {
  const fixedNow = 100 * DAY_MS;

  it('같은 상대 6연승 시 6번째 승리는 MMR이 오르지 않는다', async () => {
    const svc = new StandardRankingService(new MemoryStore(), () => fixedNow);
    const me = makeProfile();
    const deltas: number[] = [];
    for (let i = 0; i < 6; i++) {
      const r = await svc.applyResult(me, rival, 'win', true);
      deltas.push(r.mmrDelta);
    }
    expect(deltas.slice(0, 5).every((d) => d > 0)).toBe(true);
    expect(deltas[5]).toBe(0);
    expect(me.wins).toBe(6); // 전적은 정상 기록
    expect(me.games).toBe(36);
  });

  it('상승이 차단돼도 이후 패배로 인한 MMR 하락은 정상 반영된다', async () => {
    const svc = new StandardRankingService(new MemoryStore(), () => fixedNow);
    const me = makeProfile();
    for (let i = 0; i < 6; i++) {
      await svc.applyResult(me, rival, 'win', true); // 6번째는 차단됨
    }
    const before = me.mmr;
    const r = await svc.applyResult(me, rival, 'loss', true);
    expect(r.mmrDelta).toBeLessThan(0);
    expect(me.mmr).toBeLessThan(before);
    expect(me.losses).toBe(1);
  });

  it('언랭크(vs AI) 경기는 가드에 영향을 주지 않는다', async () => {
    const svc = new StandardRankingService(new MemoryStore(), () => fixedNow);
    const me = makeProfile();
    // 언랭크 경기 다수 → mmrGuard는 undefined로 유지(랭크에서만 갱신)
    for (let i = 0; i < 3; i++) {
      await svc.applyResult(me, rival, 'win', false);
    }
    expect(me.mmrGuard).toBeUndefined();
    // 이후 랭크 5연승까지 정상 상승
    const deltas: number[] = [];
    for (let i = 0; i < 5; i++) {
      deltas.push((await svc.applyResult(me, rival, 'win', true)).mmrDelta);
    }
    expect(deltas.every((d) => d > 0)).toBe(true);
  });
});
