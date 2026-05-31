// app/VersusController.ts — runtime conductor for the vs-AI mode. Wires the
// headless VersusMatch to the Pixi board, pointer input, monotonic clock, SFX,
// profile (anon identity) and ranking (unranked vs bot). Mirrors MatchController.
// Also renders a small picture-in-picture board mirroring the AI's live board.
import type { Rect, Profile, PublicProfile } from '../contracts';
import { BoardView } from '../board/BoardView';
import { computeLayout, type BoardLayout } from '../board/layout';
import { InputController, type DragHandlers } from '../input/InputController';
import { createMonotonicClock, type PausableClock } from './clock';
import { sfx } from './sound';
import { useGameStore } from './store';
import { useVersusStore } from './versusStore';
import { getSettings, useSettingsStore, BOARD_COLS, BOARD_ROWS } from './settingsStore';
import { VersusMatch, type VersusSnapshot, type VersusPhase } from './VersusMatch';
import { playActivation, playClear, updateAmbient } from './augmentFx';
import { LocalProfileService, browserKV } from '../profile';
import { StandardRankingService, InMemoryRankingStore } from '../ranking';
import { levelInfo, levelTuning, type EmotePersona } from '../bot';
import { useProgressStore } from './progressStore';

const TARGET = 10;
const ROUNDS = 5;
export const AUGMENT_MS = 12_000; // augment-pick window before auto-picking
export const ROUND_CHECK_MS = 3_500; // mid-round review screen duration

// Each rival's emote tone + frequency lives on its AiLevel.emote persona
// (see bot/levels.ts). The throttle just prevents back-to-back spam; how often a
// rival actually emotes is gated by its `chattiness`.
const EMOTE_THROTTLE_MS = 2500;

export class VersusController {
  private readonly board = new BoardView();
  private readonly clock: PausableClock = createMonotonicClock();
  private input: InputController | null = null;
  private layout: BoardLayout | null = null;
  private parent: HTMLElement | null = null;
  private ro: ResizeObserver | null = null;

  // active dimensions / timing (read from settings at match start)
  private cols = 17;
  private rows = 10;
  private durationMs = 30_000;
  private level = 1; // chosen AI level (1..10), read from progress at match start
  private persona: EmotePersona | null = null; // the chosen rival's emote personality

  // AI mini board (picture-in-picture)
  private miniHost: HTMLDivElement | null = null;
  private miniNameEl: HTMLElement | null = null;
  private miniScoreEl: HTMLElement | null = null;
  private botView: BoardView | null = null;
  private miniLayout: BoardLayout | null = null;
  private miniCreating = false;
  private unsubSettings: (() => void) | null = null;
  private lastMiniRound = -1;
  private lastBotSeq = -1;
  private botFlashUntil = 0;

  private raf = 0;
  private comboStreak = 0;
  private match: VersusMatch | null = null;
  private resolved = false;
  private lastPhase: VersusPhase | null = null;
  private prevBotScore = 0;
  private prevMyScore = 0; // track the player's clears to let the rival react
  private lastOppEmoteAt = 0; // throttle for the rival's in-round taunt emotes
  private pendingActivation: string | null = null;
  private activationTimer = 0;

  private readonly profileSvc = new LocalProfileService(browserKV());
  private readonly ranking = new StandardRankingService(new InMemoryRankingStore());
  private profile: Profile | null = null;

  async mount(parent: HTMLElement): Promise<void> {
    this.parent = parent;
    const s = getSettings();
    this.cols = BOARD_COLS;
    this.rows = BOARD_ROWS;
    this.durationMs = s.roundDurationMs;
    this.layout = this.calcLayout();
    await this.board.mount(parent, this.layout);
    this.input = new InputController(this.board.app.canvas, () => this.layout, this.handlers);
    this.input.attach();
    window.addEventListener('resize', this.onResize);
    // Re-fit when the host element itself resizes (not just the window) — a
    // common cause of "clicks land on the wrong cell" after layout shifts.
    this.ro = new ResizeObserver(() => this.onResize());
    this.ro.observe(parent);
    this.profile = await this.profileSvc.signInAnon();

    // AI mini-view host (corner PiP). The host is created once; the Pixi board
    // inside is created/destroyed to honour the showAiMiniboard setting.
    this.miniHost = document.createElement('div');
    this.miniHost.className = 'ai-mini';
    const bar = document.createElement('div');
    bar.className = 'ai-mini-bar';
    const name = document.createElement('span');
    name.className = 'ai-mini-name';
    name.textContent = 'AI';
    this.miniNameEl = name;
    this.miniScoreEl = document.createElement('span');
    this.miniScoreEl.className = 'ai-mini-score';
    this.miniScoreEl.textContent = '0';
    bar.append(name, this.miniScoreEl);
    this.miniHost.appendChild(bar);
    parent.appendChild(this.miniHost);
    await this.ensureMini(s.showAiMiniboard);
    this.unsubSettings = useSettingsStore.subscribe((st) => {
      void this.ensureMini(st.showAiMiniboard);
    });
  }

  startVersus(): void {
    const s = getSettings();
    this.cols = BOARD_COLS;
    this.rows = BOARD_ROWS;
    this.durationMs = s.roundDurationMs;
    const prog = useProgressStore.getState();
    prog.clearReward(); // drop any reward reveal from a previous match
    this.level = prog.selectedLevel;
    const info = levelInfo(this.level);
    this.persona = info.emote;
    // Settings (apple count/size) may have changed since mount → re-fit the boards.
    this.layout = this.calcLayout();
    this.board.setLayout(this.layout);
    this.match = new VersusMatch({
      seedBase: `versus:lv${this.level}:${Date.now()}`,
      tuning: levelTuning(this.level),
      rounds: ROUNDS,
      cols: this.cols,
      rows: this.rows,
      durationMs: this.durationMs,
      targetSum: TARGET,
      augmentMs: AUGMENT_MS,
      roundCheckMs: ROUND_CHECK_MS,
    });
    this.comboStreak = 0;
    this.resolved = false;
    this.lastMiniRound = -1;
    this.lastBotSeq = -1;
    this.lastPhase = null;
    this.prevBotScore = 0;
    this.prevMyScore = 0;
    this.lastOppEmoteAt = 0;
    useGameStore.getState().startVersus(ROUNDS, this.durationMs);
    useVersusStore
      .getState()
      .setOpponent(`Lv.${this.level} ${info.name}`, info.avatar, info.title, false);
    if (this.miniNameEl) this.miniNameEl.textContent = `${info.avatar} ${info.name}`;
    this.board.setBoard(this.match.myBoard());
    this.board.showSelection(null, false);
    if (this.botView) {
      this.miniLayout = this.calcMiniLayout();
      this.botView.setLayout(this.miniLayout);
      this.botView.setBoard(this.match.botBoard());
    }
    cancelAnimationFrame(this.raf); // avoid a double loop on restart
    this.loop();
  }

  restart(): void {
    this.clock.resume(); // in case we were paused when restart was pressed
    this.startVersus();
  }

  pick(id: string): void {
    if (!this.match) return;
    // The continuous loop drives the round transition + board refresh; here we
    // only register the pick. (No-op if we're past the augment window.)
    this.match.pickAugment(id, this.clock.now());
    this.pendingActivation = id; // activation FX plays when the next round opens
    sfx.pick();
  }

  pause(): void {
    if (this.clock.paused) return;
    this.clock.pause();
    cancelAnimationFrame(this.raf);
  }

  resume(): void {
    if (!this.clock.paused) return;
    this.clock.resume();
    if (this.match && useGameStore.getState().phase === 'round') this.loop();
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    clearTimeout(this.activationTimer);
    window.removeEventListener('resize', this.onResize);
    this.ro?.disconnect();
    this.ro = null;
    this.unsubSettings?.();
    this.unsubSettings = null;
    this.input?.detach();
    this.board.destroy();
    this.botView?.destroy();
    this.botView = null;
    if (this.miniHost?.parentElement) this.miniHost.parentElement.removeChild(this.miniHost);
    this.miniHost = null;
    this.match = null;
  }

  // Single continuous rAF driver: keeps ticking through the timed roundCheck and
  // augment overlays so their countdowns advance (and auto-pick fires). Started
  // once per match in startVersus(); never re-entered elsewhere.
  private loop = (): void => {
    const m = this.match;
    if (!m) return;
    const snap = m.tick(this.clock.now());
    this.sync(snap);
    const st = useGameStore.getState();
    const vs = useVersusStore.getState();
    if (snap.phase === 'matchResult') {
      void this.finish();
      return;
    }
    if (snap.phase !== 'round' && this.lastPhase === 'round') this.board.resetFx();
    if (snap.phase === 'round') {
      if (this.lastPhase === null) {
        // The rival greets at match start (tone set by its persona).
        if (this.persona) this.botEmote(this.persona.greet, { force: true });
      } else if (this.lastPhase === 'augment') {
        // A fresh round just began (augment → round): refresh the board + combo.
        this.board.resetFx();
        this.board.setBoard(m.myBoard());
        this.comboStreak = 0;
        useGameStore.getState().setCombo(0);
        const activate = this.pendingActivation;
        this.pendingActivation = null;
        clearTimeout(this.activationTimer);
        if (activate) {
          this.activationTimer = window.setTimeout(() => {
            if (useGameStore.getState().phase === 'round') playActivation(this.board, activate);
          }, 140);
        }
        if (this.persona)
          this.botEmote(this.botAhead(snap) ? this.persona.ahead : this.persona.even, {
            chance: 0.85,
          });
      }
      updateAmbient(this.board, snap.myOwned, snap.remainingMs, this.durationMs);
      st.setPhase('round');
    } else if (snap.phase === 'roundCheck') {
      const r = snap.lastRound;
      if (r) {
        vs.setRoundCheck(
          r.myScore,
          r.botScore,
          r.winner === 'me' ? 'me' : r.winner === 'bot' ? 'opp' : 'draw',
          snap.round,
          snap.phaseRemainingMs,
        );
      } else {
        vs.setOverlayRemaining(snap.phaseRemainingMs);
      }
      st.setPhase('roundCheck');
    } else if (snap.phase === 'augment') {
      st.setOffers(snap.offers, snap.offerTier ?? 'silver');
      vs.setOverlayRemaining(snap.phaseRemainingMs);
      st.setPhase('augment');
    }
    this.lastPhase = snap.phase;
    this.raf = requestAnimationFrame(this.loop);
  };

  private sync(s: VersusSnapshot): void {
    const st = useGameStore.getState();
    useGameStore.setState({ durationMs: this.durationMs, remainingMs: s.remainingMs, owned: s.myOwned });
    st.setRound(s.round);
    st.setRoundScore(s.myScore);
    st.setTotalScore(s.myTotal);
    st.setCombo(this.comboStreak);
    useVersusStore
      .getState()
      .setLive(s.botTotal, s.botScore, { me: s.roundWins.me, opp: s.roundWins.bot });
    // Opponent "+N" popup: bot's per-round score is cumulative, so a positive
    // frame-to-frame delta is a fresh clear (round reset → 0 yields a negative
    // delta we ignore).
    const botDelta = s.botScore - this.prevBotScore;
    const myDelta = s.myScore - this.prevMyScore;
    if (botDelta > 0) {
      useVersusStore.getState().bumpOppGain(botDelta);
      // Reacts to its own clear: gloat when ahead, stay breezy when even/behind.
      if (this.persona)
        this.botEmote(this.botAhead(s) ? this.persona.ahead : this.persona.even, { chance: 0.55 });
    } else if (myDelta > 0 && !this.botAhead(s)) {
      // The player just scored and is (still) ahead → the rival looks rattled.
      if (this.persona) this.botEmote(this.persona.behind, { chance: 0.4 });
    }
    this.prevBotScore = s.botScore;
    this.prevMyScore = s.myScore;
    this.syncMini(s);
  }

  /** Fire a rival emote from `pool`; throttled + probabilistic (scaled by the
   *  rival's chattiness) unless `force`. */
  private botEmote(pool: string[], opts?: { force?: boolean; chance?: number }): void {
    if (pool.length === 0) return;
    const now = this.clock.now();
    if (!opts?.force) {
      if (now - this.lastOppEmoteAt < EMOTE_THROTTLE_MS) return;
      const chattiness = this.persona?.chattiness ?? 1;
      if (Math.random() > (opts?.chance ?? 0.5) * chattiness) return;
    }
    this.lastOppEmoteAt = now;
    useVersusStore.getState().sendOppEmote(pool[Math.floor(Math.random() * pool.length)]);
  }

  /** True when the rival's standing (banked total + current round) leads. */
  private botAhead(s: VersusSnapshot): boolean {
    return s.botTotal + s.botScore > s.myTotal + s.myScore;
  }

  /** Mirror the AI's board into the mini-view and briefly flash its last move. */
  private syncMini(s: VersusSnapshot): void {
    const m = this.match;
    if (!m || !this.botView) return;
    if (this.miniScoreEl) this.miniScoreEl.textContent = String(s.botScore);
    if (s.round !== this.lastMiniRound) {
      this.lastMiniRound = s.round;
      this.lastBotSeq = 0;
      this.botFlashUntil = 0;
      this.botView.setBoard(m.botBoard()); // fresh round board
      this.botView.showSelection(null, false);
      return;
    }
    const move = m.botLastMove();
    if (move && move.seq !== this.lastBotSeq) {
      this.lastBotSeq = move.seq;
      this.botView.setBoard(m.botBoard());
      this.botFlashUntil = this.clock.now() + 500;
    }
    const flash = move && this.clock.now() < this.botFlashUntil ? move.rect : null;
    this.botView.showSelection(flash, true);
  }

  private async finish(): Promise<void> {
    const m = this.match;
    if (!m || this.resolved) return;
    this.resolved = true;
    const s = m.snapshot();
    const winner = s.winner === 'me' ? 'me' : s.winner === 'bot' ? 'opp' : 'draw';
    // Beating the level unlocks the next one + its emote reward (first clear only).
    if (winner === 'me') useProgressStore.getState().recordClear(this.level);
    let mmrDelta: number | null = 0;
    if (this.profile) {
      const opp: PublicProfile = {
        uid: 'bot',
        nickname: 'AI',
        avatar: '🤖',
        tier: 'Silver',
        mmr: this.profile.mmr,
      };
      const result = winner === 'me' ? 'win' : winner === 'opp' ? 'loss' : 'draw';
      const r = await this.ranking.applyResult(this.profile, opp, result, false); // bot = unranked
      mmrDelta = r.mmrDelta;
      this.profileSvc.persist();
    }
    this.board.showSelection(null, false);
    useVersusStore.getState().setResult(winner, mmrDelta);
    useGameStore.getState().setPhase('result');
  }

  private handlers: DragHandlers = {
    onStart: () => {
      this.match?.setDragging(true);
      if (this.match?.snapshot().myOwned.includes('time.lord')) {
        this.board.setLabelsHidden(true);
        this.board.effects?.desat(true);
      }
    },
    onMove: (rect: Rect | null) => {
      if (!this.match || !rect) {
        this.board.showSelection(null, false);
        return;
      }
      const ev = this.match.evalDetail(rect);
      this.board.showSelection(rect, ev.valid, ev.sum);
    },
    onEnd: (rect: Rect | null) => {
      const m = this.match;
      if (!m) return;
      m.setDragging(false);
      if (m.snapshot().myOwned.includes('time.lord')) {
        this.board.setLabelsHidden(false);
        this.board.effects?.desat(false);
      }
      this.board.showSelection(null, false);
      if (!rect) return;
      // Stray single-cell tap can't be a valid move — silent no-op (keep combo).
      const evalBefore = m.evalDetail(rect);
      if (rect.x0 === rect.x1 && rect.y0 === rect.y1 && !evalBefore.valid) return;
      const preTags = m.myBoard().tags?.slice() ?? [];
      const res = m.myCommit(rect, this.clock.now());
      if (!res || 'rejected' in res) {
        this.comboStreak = 0;
        useGameStore.getState().setCombo(0);
        if (res) sfx.fail();
        return;
      }
      this.comboStreak++;
      this.board.burst(res.cells);
      this.board.setBoard(m.myBoard());
      const snap = m.snapshot();
      useGameStore.getState().setRoundScore(snap.myScore);
      useGameStore.getState().setCombo(this.comboStreak, res.count);
      sfx.clear(this.comboStreak);
      playClear(this.board, snap.myOwned, {
        cells: res.cells,
        tags: res.cells.map((i) => preTags[i] ?? 'normal'),
        count: res.count,
        comboStreak: this.comboStreak,
        sum: evalBefore.sum,
        baseScore: res.baseScore,
        finalScore: res.finalScore,
        comboMultiplier: res.comboMultiplier,
        remainingMs: snap.remainingMs,
        durationMs: this.durationMs,
      });
    },
  };

  private calcLayout(): BoardLayout {
    const w = this.parent?.clientWidth || window.innerWidth;
    const h = this.parent?.clientHeight || window.innerHeight;
    const scale = getSettings().appleScale;
    return computeLayout(this.cols, this.rows, w, h, Math.max(4, Math.round(Math.min(w, h) * 0.014)), scale);
  }

  private calcMiniLayout(): BoardLayout {
    const hw = this.parent?.clientWidth || window.innerWidth;
    const w = Math.max(120, Math.min(240, Math.round(hw * 0.28)));
    const h = Math.round((w * this.rows) / this.cols); // keep main-board aspect
    return computeLayout(this.cols, this.rows, w, h, 4);
  }

  /** Create/show or hide+destroy the mini board to match the setting. */
  private async ensureMini(enabled: boolean): Promise<void> {
    if (!this.miniHost) return;
    if (enabled) {
      this.miniHost.style.display = '';
      if (!this.botView && !this.miniCreating) {
        this.miniCreating = true;
        try {
          const bv = new BoardView({ fx: false });
          this.miniLayout = this.calcMiniLayout();
          await bv.mount(this.miniHost, this.miniLayout);
          this.botView = bv;
          if (this.match) {
            this.lastMiniRound = -1;
            this.lastBotSeq = -1;
            this.botView.setBoard(this.match.botBoard());
          }
        } finally {
          this.miniCreating = false;
        }
      }
    } else {
      this.miniHost.style.display = 'none';
      this.botView?.destroy();
      this.botView = null;
    }
  }

  private onResize = (): void => {
    const next = this.calcLayout();
    if (!this.layout || next.width !== this.layout.width || next.height !== this.layout.height) {
      this.layout = next;
      this.board.setLayout(this.layout);
    }
    if (this.botView) {
      const m = this.calcMiniLayout();
      if (!this.miniLayout || m.width !== this.miniLayout.width || m.height !== this.miniLayout.height) {
        this.miniLayout = m;
        this.botView.setLayout(m);
      }
    }
  };
}
