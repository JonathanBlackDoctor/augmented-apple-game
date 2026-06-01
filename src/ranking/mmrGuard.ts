// ranking/mmrGuard.ts — MMR 조작 방지 한도 판정 (PURE: no IO, no ambient state).
// 같은 상대와 짜고 반복 승리해서 점수를 올리는 행위를 막기 위해, 랭크 경기에서
// 다음 두 한도까지만 MMR 상승을 반영하고 그 이후 상승은 0으로 차단한다.
//   - 같은 상대에게 연속 상승은 최대 5회까지(6회째부터 차단).
//   - 하루(UTC)에 누적 상승은 최대 10회까지(11회째부터 차단).
// 차단되어도 경기 전적/판수는 정상 기록되며, 패배·무승부로 인한 하락은 항상 반영된다.
import type { MmrGuard } from '../contracts';

export const MAX_CONSECUTIVE_GAINS_VS_SAME_OPPONENT = 5;
export const MAX_DAILY_GAINS = 10;

const DAY_MS = 24 * 60 * 60 * 1000;

/** epoch(ms) → UTC 기준 일자 키. 자정마다 1씩 증가한다. */
export function dayKeyOf(nowMs: number): number {
  return Math.floor(nowMs / DAY_MS);
}

export function initialGuard(): MmrGuard {
  return {
    lastOpponentId: '',
    sameOpponentGainStreak: 0,
    dailyGainCount: 0,
    dailyGainDayKey: 0,
  };
}

export type GuardBlockReason = 'same-opponent' | 'daily-limit';

export interface GuardEvaluation {
  /** MMR 상승을 실제로 반영해도 되는지 여부. */
  allowGain: boolean;
  /** 상승이 차단된 사유. 허용이거나 애초에 상승이 아니면 null. */
  reason: GuardBlockReason | null;
  /** 이번 결과를 반영한 다음 가드 상태. */
  next: MmrGuard;
}

/**
 * 한 랭크 경기 결과를 가드 상태에 반영한다.
 *
 * @param prev       직전 가드 상태(없으면 초기값으로 간주).
 * @param opponentId 이번 상대 식별자.
 * @param gained     이번 경기에서 (조작 제한 적용 전) MMR이 상승하는지 여부.
 * @param nowMs      현재 시각(ms).
 */
export function evaluateGuard(
  prev: MmrGuard | undefined,
  opponentId: string,
  gained: boolean,
  nowMs: number,
): GuardEvaluation {
  const base = prev ?? initialGuard();
  const today = dayKeyOf(nowMs);

  // 날짜가 바뀌었으면 일일 카운터를 리셋한다.
  const dailyCount = base.dailyGainDayKey === today ? base.dailyGainCount : 0;
  // 상대가 바뀌었으면 연속 상승 streak을 리셋한다.
  const streak =
    base.lastOpponentId === opponentId ? base.sameOpponentGainStreak : 0;

  if (!gained) {
    // 상승이 아니면(패배/무승부/변동 없음) 연속 상승 기록을 끊는다. 일일 상승 카운터는 유지.
    return {
      allowGain: false,
      reason: null,
      next: {
        lastOpponentId: opponentId,
        sameOpponentGainStreak: 0,
        dailyGainCount: dailyCount,
        dailyGainDayKey: today,
      },
    };
  }

  const dailyBlocked = dailyCount >= MAX_DAILY_GAINS;
  const sameOppBlocked = streak >= MAX_CONSECUTIVE_GAINS_VS_SAME_OPPONENT;

  if (dailyBlocked || sameOppBlocked) {
    // 상승 차단: 카운터를 늘리지 않고 현재 한도 상태를 유지한다.
    return {
      allowGain: false,
      reason: dailyBlocked ? 'daily-limit' : 'same-opponent',
      next: {
        lastOpponentId: opponentId,
        sameOpponentGainStreak: streak,
        dailyGainCount: dailyCount,
        dailyGainDayKey: today,
      },
    };
  }

  // 상승 허용: 두 카운터를 모두 증가시킨다.
  return {
    allowGain: true,
    reason: null,
    next: {
      lastOpponentId: opponentId,
      sameOpponentGainStreak: streak + 1,
      dailyGainCount: dailyCount + 1,
      dailyGainDayKey: today,
    },
  };
}
