// app/VersusMatch.ts — headless 5-round versus engine (you vs an AI bot,
// "separate boards" mode, plan §9/§13). Deterministic given the same seeds, the
// same human commits, and the same bot rng. Drives the vs-AI UI and is exercised
// end-to-end in tests. No DOM/Pixi here — pure orchestration over the core.
import { createEngine, makeRng } from '../core';
import type {
  AugmentHookBus,
  AugTier,
  Board,
  CommitResult,
  CoreEngine,
  Rect,
  RoundConfig,
  SeededRng,
} from '../contracts';
import { decide, type BotTuning } from '../bot';
import { tierForRound, rollOffer, buildHookBusFor } from '../augments/runtime';

export type VersusPhase = 'round' | 'roundCheck' | 'augment' | 'matchResult';

export interface VersusOptions {
  seedBase: string;
  rounds: number;
  cols: number;
  rows: number;
  durationMs: number;
  targetSum: number;
  tuning: BotTuning; // bot strength for this match (from the chosen AI level)
  winnerBonus: number;
  augmentMs: number; // augment-pick window before auto-picking offers[0]
  roundCheckMs: number; // mid-round review screen before advancing
}

export interface VersusSnapshot {
  phase: VersusPhase;
  round: number; // 0-based
  rounds: number;
  remainingMs: number;
  phaseRemainingMs: number; // countdown for the timed roundCheck/augment overlays
  myScore: number;
  botScore: number;
  myTotal: number;
  botTotal: number;
  roundWins: { me: number; bot: number };
  lastRound: { myScore: number; botScore: number; winner: 'me' | 'bot' | 'draw' } | null;
  offers: string[];
  offerTier: AugTier | null;
  myOwned: string[];
  botOwned: string[];
  winner: 'me' | 'bot' | 'draw' | null;
}

const DEFAULTS = {
  rounds: 5,
  cols: 17,
  rows: 10,
  durationMs: 30_000,
  targetSum: 10,
  winnerBonus: 50,
  augmentMs: 12_000,
  roundCheckMs: 3_500,
};

export class VersusMatch {
  private readonly opts: VersusOptions;
  private readonly myEngine: CoreEngine = createEngine();
  private readonly botEngine: CoreEngine = createEngine();
  private readonly botRng: SeededRng;

  private round = 0;
  private phase: VersusPhase = 'round';
  private roundStartMs: number | null = null;
  private remainingMs = 0;
  private phaseEndsAt: number | null = null; // deadline for timed overlay phases
  private phaseRemainingMs = 0;
  private lastRound: { myScore: number; botScore: number; winner: 'me' | 'bot' | 'draw' } | null =
    null;
  private mySeq = 0;
  private botSeq = 0;
  private botNextAt = 0;
  private botActive = true;
  private botLastRect: Rect | null = null;

  private myTotal = 0;
  private botTotal = 0;
  private roundWins = { me: 0, bot: 0 };
  private myOwned: string[] = [];
  private botOwned: string[] = [];
  private offers: string[] = [];
  private offerTier: AugTier | null = null;
  private winner: 'me' | 'bot' | 'draw' | null = null;

  constructor(opts: Partial<VersusOptions> & { seedBase: string; tuning: BotTuning }) {
    this.opts = {
      seedBase: opts.seedBase,
      rounds: opts.rounds ?? DEFAULTS.rounds,
      cols: opts.cols ?? DEFAULTS.cols,
      rows: opts.rows ?? DEFAULTS.rows,
      durationMs: opts.durationMs ?? DEFAULTS.durationMs,
      targetSum: opts.targetSum ?? DEFAULTS.targetSum,
      tuning: opts.tuning,
      winnerBonus: opts.winnerBonus ?? DEFAULTS.winnerBonus,
      augmentMs: opts.augmentMs ?? DEFAULTS.augmentMs,
      roundCheckMs: opts.roundCheckMs ?? DEFAULTS.roundCheckMs,
    };
    this.botRng = makeRng(`${this.opts.seedBase}:bot`);
    this.beginRound();
  }

  private roundSeed(r: number): string {
    return `${this.opts.seedBase}:r${r}`;
  }

  private hookBus(owned: string[]): AugmentHookBus {
    return buildHookBusFor(owned);
  }

  private beginRound(): void {
    const o = this.opts;
    const mkCfg = (owned: string[]): RoundConfig => ({
      seed: this.roundSeed(this.round),
      cols: o.cols,
      rows: o.rows,
      durationMs: o.durationMs,
      targetSum: o.targetSum,
      modeId: 'separate',
      augmentIds: [...owned],
    });
    const seed = this.roundSeed(this.round);
    this.myEngine.init(mkCfg(this.myOwned), makeRng(seed), this.hookBus(this.myOwned));
    this.botEngine.init(mkCfg(this.botOwned), makeRng(seed), this.hookBus(this.botOwned));
    this.remainingMs = o.durationMs;
    this.roundStartMs = null;
    this.mySeq = 0;
    this.botSeq = 0;
    this.botNextAt = 500 + this.botRng.int(600); // first "think" before acting
    this.botActive = true;
    this.botLastRect = null;
    this.phase = 'round';
    this.phaseEndsAt = null;
    this.phaseRemainingMs = 0;
  }

  myBoard(): Readonly<Board> {
    return this.myEngine.getBoard();
  }

  /** The bot's live board — same infrastructure as myBoard(), for the mini-view. */
  botBoard(): Readonly<Board> {
    return this.botEngine.getBoard();
  }

  /** The bot's most recent committed move + a move id, so the UI can briefly
   *  highlight it and detect when a *new* move happened. Null until the first. */
  botLastMove(): { rect: Rect; seq: number } | null {
    return this.botLastRect ? { rect: this.botLastRect, seq: this.botSeq } : null;
  }

  /** Preview validity for drag highlighting (UI only). */
  evaluate(rect: Rect): boolean {
    return this.myEngine.evaluate(rect).valid;
  }

  /** Preview validity + running sum for the drag UI (no mutation). */
  evalDetail(rect: Rect): { valid: boolean; sum: number } {
    const e = this.myEngine.evaluate(rect);
    return { valid: e.valid, sum: e.sum };
  }

  setDragging(d: boolean): void {
    this.myEngine.setDragging(d);
  }

  /** Apply a human removal (UI drag-end). No-op outside the round phase. */
  myCommit(rect: Rect, nowMs: number): CommitResult | null {
    if (this.phase !== 'round') return null;
    return this.myEngine.commit({
      seq: ++this.mySeq,
      rect,
      tMs: nowMs - (this.roundStartMs ?? nowMs),
    });
  }

  /** Advance timers + bot AI to `nowMs` (monotonic ms). Returns a snapshot. */
  tick(nowMs: number): VersusSnapshot {
    if (this.phase === 'round') {
      if (this.roundStartMs === null) this.roundStartMs = nowMs;
      const my = this.myEngine.tick(nowMs);
      this.botEngine.tick(nowMs);
      this.remainingMs = my.remainingMs;
      this.runBot(nowMs);
      if (my.ended) this.endRound(nowMs);
    } else if (this.phase === 'roundCheck') {
      this.phaseRemainingMs = Math.max(0, (this.phaseEndsAt ?? nowMs) - nowMs);
      if (nowMs >= (this.phaseEndsAt ?? nowMs)) this.advanceAfterCheck(nowMs);
    } else if (this.phase === 'augment') {
      this.phaseRemainingMs = Math.max(0, (this.phaseEndsAt ?? nowMs) - nowMs);
      if (nowMs >= (this.phaseEndsAt ?? nowMs) && this.offers.length > 0) {
        this.pickAugment(this.offers[0], nowMs);
      }
    }
    return this.snapshot();
  }

  private runBot(nowMs: number): void {
    const elapsed = nowMs - (this.roundStartMs ?? nowMs);
    let guard = 0;
    while (this.botActive && elapsed >= this.botNextAt && guard++ < 12) {
      const d = decide(this.botEngine.getBoard(), this.opts.targetSum, this.opts.tuning, this.botRng);
      if (!d) {
        this.botActive = false;
        break;
      }
      this.botEngine.commit({ seq: ++this.botSeq, rect: d.rect, tMs: elapsed });
      this.botLastRect = d.rect;
      this.botNextAt += d.delayMs;
    }
  }

  /** Tally the just-finished round, then show the mid-round review (roundCheck). */
  private endRound(nowMs: number): void {
    const my = this.myEngine.getScore();
    const bot = this.botEngine.getScore();
    this.myTotal += my;
    this.botTotal += bot;
    const winner: 'me' | 'bot' | 'draw' = my > bot ? 'me' : bot > my ? 'bot' : 'draw';
    if (winner === 'me') {
      this.myTotal += this.opts.winnerBonus;
      this.roundWins.me++;
    } else if (winner === 'bot') {
      this.botTotal += this.opts.winnerBonus;
      this.roundWins.bot++;
    }
    this.lastRound = { myScore: my, botScore: bot, winner };
    this.phase = 'roundCheck';
    this.phaseEndsAt = nowMs + this.opts.roundCheckMs;
    this.phaseRemainingMs = this.opts.roundCheckMs;
  }

  /** After the review timer: roll the augment offers, or finish the match. */
  private advanceAfterCheck(nowMs: number): void {
    if (this.round + 1 >= this.opts.rounds) {
      this.winner =
        this.myTotal > this.botTotal ? 'me' : this.botTotal > this.myTotal ? 'bot' : 'draw';
      this.phase = 'matchResult';
      this.phaseEndsAt = null;
      this.phaseRemainingMs = 0;
    } else {
      const tier = tierForRound(this.round + 1);
      this.offerTier = tier;
      this.offers = rollOffer(tier, makeRng(`${this.roundSeed(this.round + 1)}:offer:me`), this.myOwned);
      this.phase = 'augment';
      this.phaseEndsAt = nowMs + this.opts.augmentMs;
      this.phaseRemainingMs = this.opts.augmentMs;
    }
  }

  /** Human (or the auto-pick timer) picks an augment; the bot auto-picks its
   *  own; next round begins. */
  pickAugment(id: string, _nowMs?: number): void {
    if (this.phase !== 'augment') return;
    this.myOwned.push(id);
    const tier = this.offerTier ?? tierForRound(this.round + 1);
    const botOffers = rollOffer(tier, makeRng(`${this.roundSeed(this.round + 1)}:offer:bot`), this.botOwned);
    if (botOffers.length > 0) this.botOwned.push(botOffers[this.botRng.int(botOffers.length)]);
    this.round++;
    this.beginRound();
  }

  snapshot(): VersusSnapshot {
    return {
      phase: this.phase,
      round: this.round,
      rounds: this.opts.rounds,
      remainingMs: this.remainingMs,
      phaseRemainingMs: this.phaseRemainingMs,
      myScore: this.myEngine.getScore(),
      botScore: this.botEngine.getScore(),
      myTotal: this.myTotal,
      botTotal: this.botTotal,
      roundWins: { ...this.roundWins },
      lastRound: this.lastRound ? { ...this.lastRound } : null,
      offers: [...this.offers],
      offerTier: this.offerTier,
      myOwned: [...this.myOwned],
      botOwned: [...this.botOwned],
      winner: this.winner,
    };
  }
}
