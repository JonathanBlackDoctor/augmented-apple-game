// social/dailySeed.ts — deterministic daily-challenge seed (plan §14). PURE.
// Everyone playing on a given day shares one board (hash(YYYY-MM-DD) via core RNG).
function pad2(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

export function dateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function dailySeed(dateOrKey: Date | string = new Date()): string {
  const key = typeof dateOrKey === 'string' ? dateOrKey : dateKey(dateOrKey);
  return `daily:${key}`;
}
