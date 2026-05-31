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
import { decide, type Difficulty } from '../bot';
import { versusOfferTiers, rollOfferTiers, buildHookBusFor } from '../augments/runtime';

export type VersusPhase = 'round' | 'roundCheck' | 'augment' | 'matchResult';

export interface VersusOptions {
  seedBase: string;
  rounds: number;
  cols: number;
  rows: number;
  durationMs: number;
  targetSum: number;
  difficulty: Difficulty;
  // Per-round winner bonus scales with the round number: round R (1-based) grants
  // R * winnerBonusStep (e.g. 10/20/30/40/50), so late rounds — where the strong
  // augments are online — decide more of the match.
  winnerBonusStep: number;
  rerolls: number; // reroll tokens for the whole match (re-rolls the current offer)
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
  rerollsLeft: number;
  myOwned: string[];
  winner: 'me' | 'bot' | 'draw' | null;
}

const DEFAULTS = {
  rounds: 5,
  cols: 17,
  rows: 10,
  durationMs: 30_000,
  targetSum: 10,
  winnerBonusStep: 10,
  rerolls: 1,
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
  private offerRound = 0; // the 0-based round the current offer precedes
  private offerSalt = 0; // bumped on reroll to re-roll the same round's offer
  private rerollsLeft = 0; // reroll tokens left for the whole match
  private winner: 'me' | 'bot' | 'draw' | null = null;

  constructor(opts: Partial<VersusOptions> & { seedBase: string; difficulty: Difficulty }) {
    this.opts = {
      seedBase: opts.seedBase,
      rounds: opts.rounds ?? DEFAULTS.rounds,
      cols: opts.cols ?? DEFAULTS.cols,
      rows: opts.rows ?? DEFAULTS.rows,
      durationMs: opts.durationMs ?? DEFAULTS.durationMs,
      targetSum: opts.targetSum ?? DEFAULTS.targetSum,
      difficulty: opts.difficulty,
      winnerBonusStep: opts.winnerBonusStep ?? DEFAULTS.winnerBonusStep,
      rerolls: opts.rerolls ?? DEFAULTS.rerolls,
      augmentMs: opts.augmentMs ?? DEFAULTS.augmentMs,
      roundCheckMs: opts.roundCheckMs ?? DEFAULTS.roundCheckMs,
    };
    this.botRng = makeRng(`${this.opts.seedBase}:bot`);
    this.rerollsLeft = this.opts.rerolls;
    // Initialise round 0's engines so the board is renderable behind the overlay,
    // then open the start-of-match augment pick before that round actually runs.
    this.beginRound();
    this.openAugment(0);
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
      // The deadline is anchored on the first tick we see this overlay, so a pick
      // opened without a clock (the start-of-match pick) still gets the full window.
      if (this.phaseEndsAt === null) this.phaseEndsAt = nowMs + this.opts.augmentMs;
      this.phaseRemainingMs = Math.max(0, this.phaseEndsAt - nowMs);
      if (nowMs >= this.phaseEndsAt && this.offers.length > 0) {
        this.pickAugment(this.offers[0], nowMs);
      }
    }
    return this.snapshot();
  }

  private runBot(nowMs: number): void {
    const elapsed = nowMs - (this.roundStartMs ?? nowMs);
    let guard = 0;
    while (this.botActive && elapsed >= this.botNextAt && guard++ < 12) {
      const d = decide(this.botEngine.getBoard(), this.opts.targetSum, this.opts.difficulty, this.botRng);
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
    // Bonus scales with the round number (R1=step, R2=2·step, …): later rounds,
    // where the strong augments are online, swing the match harder.
    const bonus = (this.round + 1) * this.opts.winnerBonusStep;
    if (winner === 'me') {
      this.myTotal += bonus;
      this.roundWins.me++;
    } else if (winner === 'bot') {
      this.botTotal += bonus;
      this.roundWins.bot++;
    }
    this.lastRound = { myScore: my, botScore: bot, winner };
    this.phase = 'roundCheck';
    this.phaseEndsAt = nowMs + this.opts.roundCheckMs;
    this.phaseRemainingMs = this.opts.roundCheckMs;
  }

  /** After the review timer: open the next augment pick, or finish the match. */
  private advanceAfterCheck(_nowMs: number): void {
    if (this.round + 1 >= this.opts.rounds) {
      this.winner =
        this.myTotal > this.botTotal ? 'me' : this.botTotal > this.myTotal ? 'bot' : 'draw';
      this.phase = 'matchResult';
      this.phaseEndsAt = null;
      this.phaseRemainingMs = 0;
    } else {
      this.openAugment(this.round + 1);
    }
  }

  /** Open the augment pick that precedes round `forRound` (0-based). The deadline
   *  is anchored lazily on the first tick (see tick()), so this works both for the
   *  mid-match picks and the start-of-match pick opened from the constructor. */
  private openAugment(forRound: number): void {
    this.offerRound = forRound;
    this.offerSalt = 0;
    this.rollMyOffer();
    this.phase = 'augment';
    this.phaseEndsAt = null;
    this.phaseRemainingMs = this.opts.augmentMs;
  }

  /** (Re)roll the human's offer for the current offerRound + offerSalt. */
  private rollMyOffer(): void {
    const tiers = versusOfferTiers(this.offerRound);
    this.offerTier = tiers[tiers.length - 1]; // badge shows the strongest tier on offer
    const seed = `${this.roundSeed(this.offerRound)}:offer:me:s${this.offerSalt}`;
    this.offers = rollOfferTiers(tiers, makeRng(seed), this.myOwned);
  }

  /** Spend a reroll token to draw a fresh offer for the current pick. Returns
   *  false (no-op) outside the augment phase or when no tokens remain. */
  reroll(_nowMs?: number): boolean {
    if (this.phase !== 'augment' || this.rerollsLeft <= 0) return false;
    this.rerollsLeft--;
    this.offerSalt++;
    this.rollMyOffer();
    return true;
  }

  /** Human (or the auto-pick timer) picks an augment; the bot auto-picks its
   *  own; the round the offer preceded begins. */
  pickAugment(id: string, _nowMs?: number): void {
    if (this.phase !== 'augment') return;
    this.myOwned.push(id);
    const tiers = versusOfferTiers(this.offerRound);
    const botOffers = rollOfferTiers(
      tiers,
      makeRng(`${this.roundSeed(this.offerRound)}:offer:bot`),
      this.botOwned,
    );
    if (botOffers.length > 0) this.botOwned.push(botOffers[this.botRng.int(botOffers.length)]);
    this.round = this.offerRound;
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
      rerollsLeft: this.rerollsLeft,
      myOwned: [...this.myOwned],
      winner: this.winner,
    };
  }
}
