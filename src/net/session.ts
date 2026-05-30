// net/session.ts — NetSession built on a NetBackend (plan §5.5). The same
// session works over the in-memory backend (offline/tests) or Firebase (online).
import type { NetSession, NetEvent, PublicProfile, ClaimResolution } from '../contracts';
import type { NetBackend, RoomChannel } from './backend';

export class BackendNetSession implements NetSession {
  private channel: RoomChannel | null = null;
  private uid = '';

  constructor(private readonly backend: NetBackend) {}

  async join(roomId: string, profile: PublicProfile): Promise<void> {
    this.uid = profile.uid;
    this.channel = this.backend.open(roomId);
    await this.channel.send({ t: 'ready', player: this.uid, phase: 'lobby' });
  }

  on(cb: (e: NetEvent) => void): () => void {
    if (!this.channel) throw new Error('NetSession.join() must be called before on()');
    return this.channel.subscribe(cb);
  }

  async send(e: NetEvent): Promise<void> {
    if (!this.channel) throw new Error('NetSession.join() must be called before send()');
    await this.channel.send(e);
  }

  async claim(cells: number[], seq: number): Promise<ClaimResolution> {
    if (!this.channel) throw new Error('NetSession.join() must be called before claim()');
    return this.channel.claim(this.uid, cells, seq);
  }

  close(): void {
    this.channel?.close();
    this.channel = null;
  }
}
