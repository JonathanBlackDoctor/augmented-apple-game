// ui/components/hudTimer.ts — timer-bar visual state from the remaining seconds
// and the owned augments. Shared by the solo / versus / online HUDs so the bar
// reads urgency consistently (ported from the "증강 쇼케이스" HUD).
export type TimerState = '' | 'warn' | 'danger' | 'prism';

export function hudTimerState(secs: number, owned: string[]): TimerState {
  if (owned.includes('risk.glasscannon')) return 'prism'; // timer races at 2×
  if (secs <= 5) return 'danger';
  if (secs <= 8) return 'warn';
  return '';
}
