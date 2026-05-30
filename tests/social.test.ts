import { describe, it, expect } from 'vitest';
import { dailySeed, dateKey } from '../src/social/dailySeed';
import { generateBoard } from '../src/core/board';

describe('daily seed', () => {
  it('formats the date key as YYYY-MM-DD', () => {
    expect(dateKey(new Date(2026, 4, 30))).toBe('2026-05-30');
    expect(dateKey(new Date(2026, 0, 1))).toBe('2026-01-01');
  });

  it('is stable for a day and differs across days', () => {
    expect(dailySeed('2026-05-30')).toBe('daily:2026-05-30');
    expect(dailySeed('2026-05-30')).toBe(dailySeed('2026-05-30'));
    expect(dailySeed('2026-05-31')).not.toBe(dailySeed('2026-05-30'));
  });

  it('produces a deterministic board for the day', () => {
    const cfg = {
      seed: dailySeed('2026-05-30'),
      cols: 17,
      rows: 10,
      durationMs: 30_000,
      targetSum: 10,
      modeId: 'daily',
      augmentIds: [],
    };
    expect(generateBoard(cfg).cells).toEqual(generateBoard(cfg).cells);
  });
});
