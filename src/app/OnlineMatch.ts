// app/OnlineMatch.ts — real-time 1v1 over a NetSession (plan §9/§10). "Separate
// boards": both players play the same shared-seed boards locally and see each
// other's live score via `clear` events. The schedule (countdown → 5×[round +
// augment]) is time-driven from a shared match start. Robustness: heartbeats +
// opponent-disconnect forfeit, a no-opponent lobby timeout, and a 2-player
// capacity lock (events from any third party are ignored). Exercised with a
// 2-client in-memory simulation in tests.
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
import { versusOfferTiers, rollOfferTiers, buildHookBusFor } from '../augments/runtime';

export type OnlinePhase = 'lobby' | 'countdown' | 'round' | 'augment' | 'matchResult';
export type Role = 'host' | 'guest';

export interface OnlineOptions {
  session: NetSession;
  role: Role;
  self: PublicProfile;
  roomId: string;
  oppName?: string;
  rounds?: number;
  cols?: number;
  rows?: number;
  durationMs?: number;
  targetSum?: number;
  winnerBonusStep?: number; // per-round winner bonus = round * step (10/20/30/40/50)
  rerolls?: number; // reroll tokens for the whole match
  countdownMs?: number;
  augmentMs?: number;
  hbIntervalMs?: number;
  disconnectMs?: number;
  lobbyTimeoutMs?: number;
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
  // completed rounds so far (oldest→newest), for the result round strip
  roundHistory: { my: number; opp: number; winner: 'me' | 'opp' | 'draw' }[];
  offers: string[];
  offerTier: AugTier | null;
  rerollsLeft: number;
  myOwned: string[];
  winner: 'me' | 'opp' | 'draw' | null;
  oppName: string;
  oppPresent: boolean;
  oppConnected: boolean;
  oppLeft: boolean;
  noOpponent: boolean;
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
  // Board aspect. The host fixes this from its viewport and broadcasts it on the
  // countdown `phase` event; the guest adopts it before round 0 so both clients
  // play the identical shared-seed board.
  private cols: number;
  private rows: number;
  private readonly durationMs: number;
  private readonly targetSum: number;
  private readonly winnerBonusStep: number;
  private readonly countdownMs: number;
  private readonly augmentMs: number;
  private readonly hbIntervalMs: number;
  private readonly disconnectMs: number;
  private readonly lobbyTimeoutMs: number;

  private readonly engine: CoreEngine = createEngine();
  private readonly schedule: Seg[];
  private readonly totalMs: number;
  private unsub: (() => void) | null = null;

  private phase: OnlinePhase = 'lobby';
  private appliedKey = '';
  private matchStart: number | null = null;
  private lobbyStart: number | null = null;
  private nowMs = 0;
  private mySeq = 0;
  private lastHbSent = 0;
  private lastOppSeen: number | null = null;

  private round = 0;
  private remainingMs = 0;
  private myRound = 0;
  private oppRound = 0;
  private myTotal = 0;
  private oppTotal = 0;
  private roundWins = { me: 0, opp: 0 };
  private roundHistory: { my: number; opp: number; winner: 'me' | 'opp' | 'draw' }[] = [];
  private readonly tallied = new Set<number>();

  private myOwned: string[] = [];
  private oppOwned: string[] = [];
  private offers: string[] = [];
  private offerTier: AugTier | null = null;
  private offerSalt = 0; // bumped on reroll to re-draw the current offer
  private rerollsLeft = 0; // reroll tokens left for the whole match
  private myPicked = false;

  private oppUid: string | null = null;
  private oppReadyLobby = false;
  private oppPresent = false;
  private oppLeft = false;
  private noOpponent = false;
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
    this.winnerBonusStep = o.winnerBonusStep ?? 10;
    this.rerollsLeft = o.rerolls ?? 1;
    this.countdownMs = o.countdownMs ?? 3000;
    this.augmentMs = o.augmentMs ?? 12_000;
    this.hbIntervalMs = o.hbIntervalMs ?? 2000;
    this.disconnectMs = o.disconnectMs ?? 8000;
    this.lobbyTimeoutMs = o.lobbyTimeoutMs ?? 15_000;
    this.schedule = this.buildSchedule();
    this.totalMs = this.schedule.reduce((a, s) => Math.max(a, s.start + s.dur), 0);
  }

  private buildSchedule(): Seg[] {
    const segs: Seg[] = [{ phase: 'countdown', round: 0, start: 0, dur: this.countdownMs }];
    let t = this.countdownMs;
    for (let r = 0; r < this.rounds; r++) {
      // An augment pick precedes every round (incl. a start-of-match pick before
      // round 0): 5 picks total. The seg's `round` is the round it precedes.
      segs.push({ phase: 'augment', round: r, start: t, dur: this.augmentMs });
      t += this.augmentMs;
      segs.push({ phase: 'round', round: r, start: t, dur: this.durationMs });
      t += this.durationMs;
    }
    return segs;
  }

  private roundSeed(r: number): string {
    return `${this.seedBase}:r${r}`;
  }
  private hookBus(owned: string[]): AugmentHookBus {
    return buildHookBusFor(owned);
  }

  async start(nowMs = 0): Promise<void> {
    // Anchor our clock before subscribing: the backend replays existing events
    // synchronously on subscribe, and onEvent records `lastOppSeen = this.nowMs`.
    // Without this, a replayed opponent `ready` is stamped at nowMs=0 while the
    // first tick() runs at performance.now()-based time (seconds in), making the
    // disconnect check fire instantly and declare a bogus forfeit win.
    this.nowMs = nowMs;
    this.unsub = this.session.on((e) => this.onEvent(e));
    await this.session.send({ t: 'ready', player: this.uid, phase: 'lobby' });
  }

  private onEvent(e: NetEvent): void {
    if (e.t === 'phase') {
      if (this.role === 'guest') {
        this.lastOppSeen = this.nowMs;
        this.oppPresent = true;
        // Adopt the host's board aspect before the first round is built.
        if (typeof e.cols === 'number' && typeof e.rows === 'number') {
          this.cols = e.cols;
          this.rows = e.rows;
        }
        if (e.phase === 'countdown' && this.matchStart === null) this.matchStart = this.nowMs;
      }
      return;
    }
    if (!('player' in e)) return; // excludes the player-less 'sabotage' event
    if (e.player === this.uid) return;
    if (this.oppUid === null) this.oppUid = e.player;
    else if (e.player !== this.oppUid) return; // 2-player capacity: ignore a 3rd party
    this.lastOppSeen = this.nowMs;
    this.oppPresent = true;
    switch (e.t) {
      case 'ready':
        this.oppReadyLobby = true;
        break;
      case 'clear':
        this.oppRound = e.score;
        break;
      case 'round-result':
        this.oppRound = e.score;
        break;
      case 'augment-pick':
        this.oppOwned.push(e.augId);
        break;
      case 'heartbeat':
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

  tick(nowMs: number): OnlineSnapshot {
    this.nowMs = nowMs;
    if (this.matchStart === null) {
      if (this.lobbyStart === null) this.lobbyStart = nowMs;
      if (this.role === 'host' && this.oppReadyLobby) {
        this.matchStart = nowMs;
        void this.session.send({
          t: 'phase',
          phase: 'countdown',
          round: 0,
          startAtServerTs: nowMs,
          cols: this.cols,
          rows: this.rows,
        });
      } else {
        if (this.role === 'host' && !this.oppReadyLobby && nowMs - this.lobbyStart > this.lobbyTimeoutMs) {
          this.noOpponent = true;
        }
        return this.snapshot();
      }
    }
    if (nowMs - this.lastHbSent > this.hbIntervalMs) {
      this.lastHbSent = nowMs;
      void this.session.send({ t: 'heartbeat', player: this.uid, ts: nowMs });
    }
    if (this.phase !== 'matchResult' && this.lastOppSeen !== null && nowMs - this.lastOppSeen > this.disconnectMs) {
      this.oppLeft = true;
      this.winner = 'me';
      this.phase = 'matchResult';
      this.appliedKey = 'matchResult:forfeit';
      return this.snapshot();
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
    if (prevPhase === 'round') this.finalizeRound(prevRound);

    this.appliedKey = `${seg.phase}:${seg.round}`;
    this.phase = seg.phase;
    this.round = seg.round;

    if (seg.phase === 'round') {
      if (prevPhase === 'augment' && !this.myPicked && this.offers.length > 0) this.pickAugment(this.offers[0]);
      this.beginRound(seg.round);
    } else if (seg.phase === 'augment') {
      this.offerSalt = 0;
      this.rollMyOffer(seg.round); // seg.round is the round this pick precedes
      this.myPicked = false;
    } else if (seg.phase === 'matchResult') {
      this.winner = this.myTotal > this.oppTotal ? 'me' : this.oppTotal > this.myTotal ? 'opp' : 'draw';
    }
  }

  /** (Re)draw this client's offer for the pick preceding `forRound`. */
  private rollMyOffer(forRound: number): void {
    const tiers = versusOfferTiers(forRound);
    this.offerTier = tiers[tiers.length - 1]; // badge shows the strongest tier on offer
    const seed = `${this.roundSeed(forRound)}:offer:${this.uid}:s${this.offerSalt}`;
    this.offers = rollOfferTiers(tiers, makeRng(seed), this.myOwned);
  }

  /** Spend a reroll token to re-draw the current offer (local only — the network
   *  only ever carries the final pick). No-op outside augment / once picked /
   *  when out of tokens. */
  reroll(): boolean {
    if (this.phase !== 'augment' || this.myPicked || this.rerollsLeft <= 0) return false;
    this.rerollsLeft--;
    this.offerSalt++;
    this.rollMyOffer(this.round);
    return true;
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
    this.engine.tick(this.nowMs);
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
    // Bonus scales with the round number (R1=step … R5=5·step), weighting the late
    // rounds where the strong augments are online.
    const bonus = (r + 1) * this.winnerBonusStep;
    const winner: 'me' | 'opp' | 'draw' =
      this.myRound > this.oppRound ? 'me' : this.oppRound > this.myRound ? 'opp' : 'draw';
    if (winner === 'me') {
      this.myTotal += bonus;
      this.roundWins.me++;
    } else if (winner === 'opp') {
      this.oppTotal += bonus;
      this.roundWins.opp++;
    }
    this.roundHistory.push({ my: this.myRound, opp: this.oppRound, winner });
  }

  myBoard(): Readonly<Board> {
    return this.engine.getBoard();
  }
  /** Current board aspect (guest reflects the host's choice once adopted). */
  dims(): { cols: number; rows: number } {
    return { cols: this.cols, rows: this.rows };
  }
  evaluate(rect: Rect): boolean {
    return this.engine.evaluate(rect).valid;
  }
  /** Preview validity + running sum for the drag UI (no mutation). */
  evalDetail(rect: Rect): { valid: boolean; sum: number } {
    const e = this.engine.evaluate(rect);
    return { valid: e.valid, sum: e.sum };
  }
  setDragging(d: boolean): void {
    this.engine.setDragging(d);
  }

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

  pickAugment(id: string): void {
    if (this.myPicked) return;
    this.myPicked = true;
    this.myOwned.push(id);
    void this.session.send({ t: 'augment-pick', player: this.uid, round: this.round, augId: id });
  }

  snapshot(): OnlineSnapshot {
    const oppConnected =
      this.lastOppSeen !== null && this.nowMs - this.lastOppSeen < this.disconnectMs;
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
      roundHistory: this.roundHistory.map((h) => ({ ...h })),
      offers: [...this.offers],
      offerTier: this.offerTier,
      rerollsLeft: this.rerollsLeft,
      myOwned: [...this.myOwned],
      winner: this.winner,
      oppName: this.oppName,
      oppPresent: this.oppPresent,
      oppConnected,
      oppLeft: this.oppLeft,
      noOpponent: this.noOpponent,
    };
  }

  destroy(): void {
    this.unsub?.();
    this.unsub = null;
    this.session.close();
  }
}
