// contracts/matchmaking.ts — queue / room / deep-link / bot fallback (plan §11)
import type { NetSession } from './net';

export interface Matchmaker {
  createRoom(modeSet: string[]): Promise<{ roomId: string; link: string }>;
  joinRoom(roomId: string): Promise<NetSession>;
  quickMatch(): Promise<{ session: NetSession; opponent: 'human' | 'bot' }>;
  cancel(): void;
}
