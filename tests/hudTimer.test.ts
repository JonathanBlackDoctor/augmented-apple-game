import { describe, it, expect } from 'vitest';
import { hudTimerState } from '../src/ui/components/hudTimer';

describe('hudTimerState', () => {
  it('shows prism whenever glasscannon is owned (timer races at 2×)', () => {
    expect(hudTimerState(25, ['risk.glasscannon'])).toBe('prism');
    expect(hudTimerState(3, ['risk.glasscannon'])).toBe('prism');
  });

  it('escalates warn (≤8s) → danger (≤5s) by remaining time', () => {
    expect(hudTimerState(20, [])).toBe('');
    expect(hudTimerState(8, [])).toBe('warn');
    expect(hudTimerState(5, [])).toBe('danger');
    expect(hudTimerState(1, [])).toBe('danger');
  });
});
