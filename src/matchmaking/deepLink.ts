// matchmaking/deepLink.ts — ?room=CODE&inv=UID parsing/building (plan §11).
// Query-string based so GitHub Pages path routing needs no special handling.
export interface DeepLink {
  room?: string;
  inv?: string;
}

export function parseDeepLink(search: string): DeepLink {
  const q = new URLSearchParams(search.startsWith('?') ? search : '?' + search);
  return {
    room: q.get('room') || undefined,
    inv: q.get('inv') || undefined,
  };
}

export function buildRoomLink(origin: string, room: string, inv?: string): string {
  const u = new URL(origin);
  u.searchParams.set('room', room);
  if (inv) u.searchParams.set('inv', inv);
  return u.toString();
}
