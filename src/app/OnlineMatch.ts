// app/OnlineMatch.ts — real-time 1v1 over a NetSession (plan §9/§10). "Separate
// boards" mode: both players play the same shared-seed boards locally and see
// each other's live score via `clear` events. The schedule (countdown → 5×[round
// + augment]) is time-driven from a shared match start, so no per-transition
// handshakes are needed — only the host announces the start. Deterministic given
// the same room seed + the same local inputs; exercised with a 2-client in-memory
// simulation in tests.
import { createEngine, makeRng } from '../core';
import type {
  AugmentHookBus,
  AugTier,
  Board,
  CommitResult,
  CoreEngine,
  NetEvent,
  NetSession,
  PublicProfile,
  Rect,
} from '../contracts';
import { tierForRound, rollOffer, buildHookBusFor } from '../augments/runtime';

export type OnlinePhase = 'lobby' | 'countdown' | 'round' | 'augment' | 'matchResult';
export type Role = 'host' | 'guest';

export interface OnlineOptions {
  session: NetSession;
  role: Role;
  self: PublicProfile;
  roomId: string; // shared seed base — both clients derive identical boards
  oppName?: string;
  rounds?: number;
  cols?: number;
  rows?: number;
  durationMs?: number;
  targetSum?: number;
  winnerBonus?: number;
  countdownMs?: number;
  augmentMs?: number;
}

export interface OnlineSnapshot {
  phase: OnlinePhase;
  round: number;
  rounds: number;
  remainingMs: number;
  myScore: number;
  oppScore: number;
  myTotal: number;
  oppTotal: number;
  roundWins: { me: number; opp: number };
  offers: string[];
  offerTier: AugTier | null;
  myOwned: string[];
  winner: 'me' | 'opp' | 'draw' | null;
  oppName: string;
  oppPresent: boolean;
}

interface Seg {
  phase: OnlinePhase;
  round: number;
  start: number;
  dur: number;
}

export class OnlineMatch {
  private readonly session: NetSession;
  private readonly role: Role;
  private readonly uid: string;
  private readonly seedBase: string;
  private readonly rounds: number;
  private readonly cols: number;
  private readonly rows: number;
  private readonly durationMs: number;
  private readonly targetSum: number;
  private readonly winnerBonus: number;
  private readonly countdownMs: number;
  private readonly augmentMs: number;

  private readonly engine: CoreEngine = createEngine();
  private readonly schedule: Seg[];
  private readonly totalMs: number;
  private unsub: (() => void) | null = null;

  private phase: OnlinePhase = 'lobby';
  private appliedKey = '';
  private matchStart: number | null = null;
  private nowMs = 0;
  private mySeq = 0;

  private round = 0;
  private remainingMs = 0;
  private myRound = 0;
  private oppRound = 0;
  private myTotal = 0;
  private oppTotal = 0;
  private roundWins = { me: 0, opp: 0 };
  private readonly tallied = new Set<number>();

  private myOwned: string[] = [];
  private oppOwned: string[] = [];
  private offers: string[] = [];
  private offerTier: AugTier | null = null;
  private myPicked = false;

  private oppReadyLobby = false;
  private oppPresent = false;
  private oppName: string;
  private winner: 'me' | 'opp' | 'draw' | null = null;

  constructor(o: OnlineOptions) {
    this.session = o.session;
    this.role = o.role;
    this.uid = o.self.uid;
    this.seedBase = o.roomId;
    this.oppName = o.oppName ?? '상대';
    this.rounds = o.rounds ?? 5;
    this.cols = o.cols ?? 17;
    this.rows = o.rows ?? 10;
    this.durationMs = o.durationMs ?? 30_000;
    this.targetSum = o.targetSum ?? 10;
    this.winnerBonus = o.winnerBonus ?? 50;
    this.countdownMs = o.countdownMs ?? 3000;
    this.augmentMs = o.augmentMs ?? 12_000;
    this.schedule = this.buildSchedule();
    this.totalMs = this.schedule.reduce((a, s) => Math.max(a, s.start + s.dur), 0);
  }

  private buildSchedule(): Seg[] {
    const segs: Seg[] = [{ phase: 'countdown', round: 0, start: 0, dur: this.countdownMs }];
    let t = this.countdownMs;
    for (let r = 0; r < this.rounds; r++) {
      segs.push({ phase: 'round', round: r, start: t, dur: this.durationMs });
      t += this.durationMs;
      if (r < this.rounds - 1) {
        segs.push({ phase: 'augment', round: r, start: t, dur: this.augmentMs });
        t += this.augmentMs;
      }
    }
    return segs;
  }

  private roundSeed(r: number): string {
    return `${this.seedBase}:r${r}`;
  }
  private hookBus(owned: string[]): AugmentHookBus {
    return buildHookBusFor(owned);
  }

  /** Subscribe + announce readiness. The caller must have joined the room first. */
  async start(): Promise<void> {
    this.unsub = this.session.on((e) => this.onEvent(e));
    await this.session.send({ t: 'ready', player: this.uid, phase: 'lobby' });
  }

  private onEvent(e: NetEvent): void {
    if ('player' in e && e.player === this.uid) return; // ignore self echoes
    switch (e.t) {
      case 'ready':
        this.oppReadyLobby = true;
        this.oppPresent = true;
        break;
      case 'phase':
        if (e.phase === 'countdown' && this.matchStart === null) {
          this.matchStart = this.nowMs; // adopt host's start (countdown hides skew)
          this.oppPresent = true;
        }
        break;
      case 'clear':
        this.oppRound = e.score;
        this.oppPresent = true;
        break;
      case 'round-result':
        this.oppRound = e.score;
        this.oppPresent = true;
        break;
      case 'augment-pick':
        this.oppOwned.push(e.augId);
        this.oppPresent = true;
        break;
      case 'heartbeat':
        this.oppPresent = true;
        break;
      default:
        break;
    }
  }

  private segAt(elapsed: number): Seg {
    let cur = this.schedule[0];
    for (const s of this.schedule) {
      if (elapsed >= s.start) cur = s;
      else break;
    }
    return cur;
  }

  /** Advance to monotonic `nowMs`. Drives timers + phase transitions. */
  tick(nowMs: number): OnlineSnapshot {
    this.nowMs = nowMs;
    if (this.matchStart === null) {
      if (this.role === 'host' && this.oppReadyLobby) {
        this.matchStart = nowMs;
        void this.session.send({ t: 'phase', phase: 'countdown', round: 0, startAtServerTs: nowMs });
      } else {
        return this.snapshot();
      }
    }
    const elapsed = nowMs - this.matchStart;
    if (elapsed >= this.totalMs) {
      this.enterPhase({ phase: 'matchResult', round: this.rounds - 1, start: 0, dur: 0 });
      return this.snapshot();
    }
    const seg = this.segAt(elapsed);
    const key = `${seg.phase}:${seg.round}`;
    if (key !== this.appliedKey) this.enterPhase(seg);
    if (this.phase === 'round') {
      const t = this.engine.tick(nowMs);
      this.remainingMs = t.remainingMs;
    }
    return this.snapshot();
  }

  private enterPhase(seg: Seg): void {
    const prevPhase = this.phase;
    const prevRound = this.round;
    // Finalize the round we are leaving.
    if (prevPhase === 'round') this.finalizeRound(prevRound);

    this.appliedKey = `${seg.phase}:${seg.round}`;
    this.phase = seg.phase;
    this.round = seg.round;

    if (seg.phase === 'round') {
      // Auto-pick if the player skipped the augment window.
      if (prevPhase === 'augment' && !this.myPicked && this.offers.length > 0) this.pickAugment(this.offers[0]);
      this.beginRound(seg.round);
    } else if (seg.phase === 'augment') {
      const tier = tierForRound(seg.round + 1);
      this.offerTier = tier;
      this.offers = rollOffer(tier, makeRng(`${this.roundSeed(seg.round + 1)}:offer:${this.uid}`), this.myOwned);
      this.myPicked = false;
    } else if (seg.phase === 'matchResult') {
      this.winner = this.myTotal > this.oppTotal ? 'me' : this.oppTotal > this.myTotal ? 'opp' : 'draw';
    }
  }

  private beginRound(r: number): void {
    const cfg = {
      seed: this.roundSeed(r),
      cols: this.cols,
      rows: this.rows,
      durationMs: this.durationMs,
      targetSum: this.targetSum,
      modeId: 'separate',
      augmentIds: [...this.myOwned],
    };
    this.engine.init(cfg, makeRng(cfg.seed), this.hookBus(this.myOwned));
    this.engine.tick(this.nowMs); // anchor the timer
    this.remainingMs = this.durationMs;
    this.mySeq = 0;
    this.myRound = 0;
    this.oppRound = 0;
  }

  private finalizeRound(r: number): void {
    if (this.tallied.has(r)) return;
    this.tallied.add(r);
    this.myRound = this.engine.getScore();
    void this.session.send({ t: 'round-result', player: this.uid, round: r, score: this.myRound });
    this.myTotal += this.myRound;
    this.oppTotal += this.oppRound;
    if (this.myRound > this.oppRound) {
      this.myTotal += this.winnerBonus;
      this.roundWins.me++;
    } else if (this.oppRound > this.myRound) {
      this.oppTotal += this.winnerBonus;
      this.roundWins.opp++;
    }
  }

  myBoard(): Readonly<Board> {
    return this.engine.getBoard();
  }
  evaluate(rect: Rect): boolean {
    return this.engine.evaluate(rect).valid;
  }
  setDragging(d: boolean): void {
    this.engine.setDragging(d);
  }

  /** Apply a local removal during the round phase, broadcasting the new score. */
  myCommit(rect: Rect): CommitResult | null {
    if (this.phase !== 'round') return null;
    const res = this.engine.commit({ seq: ++this.mySeq, rect, tMs: this.nowMs - (this.matchStart ?? this.nowMs) });
    if (res && !('rejected' in res)) {
      void this.session.send({
        t: 'clear',
        player: this.uid,
        seq: this.mySeq,
        cells: res.cells,
        score: this.engine.getScore(),
        ts: this.nowMs,
      });
    }
    return res;
  }

  /** Pick an augment during the augment phase (broadcast for the opponent). */
  pickAugment(id: string): void {
    if (this.myPicked) return;
    this.myPicked = true;
    this.myOwned.push(id);
    void this.session.send({ t: 'augment-pick', player: this.uid, round: this.round + 1, augId: id });
  }

  snapshot(): OnlineSnapshot {
    return {
      phase: this.phase,
      round: this.round,
      rounds: this.rounds,
      remainingMs: this.remainingMs,
      myScore: this.phase === 'round' ? this.engine.getScore() : this.myRound,
      oppScore: this.oppRound,
      myTotal: this.myTotal,
      oppTotal: this.oppTotal,
      roundWins: { ...this.roundWins },
      offers: [...this.offers],
      offerTier: this.offerTier,
      myOwned: [...this.myOwned],
      winner: this.winner,
      oppName: this.oppName,
      oppPresent: this.oppPresent,
    };
  }

  destroy(): void {
    this.unsub?.();
    this.unsub = null;
    this.session.close();
  }
}
