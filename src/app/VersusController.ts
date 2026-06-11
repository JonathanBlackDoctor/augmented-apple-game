// app/VersusController.ts — runtime conductor for the vs-AI mode. Wires the
// headless VersusMatch to the Pixi board, pointer input, monotonic clock, SFX,
// profile (anon identity) and ranking (unranked vs bot). Mirrors MatchController.
import type { Rect, Profile, PublicProfile, CellTag } from '../contracts';
import { BoardView } from '../board/BoardView';
import { computeLayout, type BoardLayout } from '../board/layout';
import { InputController, type DragHandlers } from '../input/InputController';
import { createMonotonicClock, type PausableClock } from './clock';
import { sfx } from './sound';
import { useGameStore } from './store';
import { useVersusStore } from './versusStore';
import { getSettings, BOARD_COLS, BOARD_ROWS, ROUND_DURATION_MS } from './settingsStore';
import { VersusMatch, type VersusSnapshot, type VersusPhase } from './VersusMatch';
import { playActivation, playClear, updateAmbient } from './augmentFx';
import { LocalProfileService, browserKV } from '../profile';
import { StandardRankingService, InMemoryRankingStore } from '../ranking';
import { levelInfo, levelTuning, type EmotePersona } from '../bot';
import { useProgressStore } from './progressStore';
import { COMPANION_ID, COMPANION_FIRST_MS, COMPANION_INTERVAL_MS } from './companion';

const TARGET = 10;
const ROUNDS = 5;
export const AUGMENT_MS = 12_000; // augment-pick window before auto-picking
export const PRE_ROUND_MS = 3_000; // 3·2·1 countdown after the pick, before the round
export const ROUND_CHECK_MS = 3_500; // mid-round review screen duration

// Each rival's emote tone + frequency lives on its AiLevel.emote persona
// (see bot/levels.ts). The throttle just prevents back-to-back spam; how often a
// rival actually emotes is gated by its `chattiness`.
const EMOTE_THROTTLE_MS = 1800;

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
  private durationMs = ROUND_DURATION_MS;
  private level = 1; // chosen AI level (1..10), read from progress at match start
  private persona: EmotePersona | null = null; // the chosen rival's emote personality

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
  // 새콤이 companion (board.companion): auto-clears on MY board at a fixed cadence.
  private companionOn = false;
  private companionStart = 0;
  private companionNextAt = 0;

  private readonly profileSvc = new LocalProfileService(browserKV());
  private readonly ranking = new StandardRankingService(new InMemoryRankingStore());
  private profile: Profile | null = null;

  async mount(parent: HTMLElement): Promise<void> {
    this.parent = parent;
    this.cols = BOARD_COLS;
    this.rows = BOARD_ROWS;
    this.durationMs = ROUND_DURATION_MS;
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
  }

  startVersus(): void {
    this.cols = BOARD_COLS;
    this.rows = BOARD_ROWS;
    this.durationMs = ROUND_DURATION_MS;
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
      preRoundMs: PRE_ROUND_MS,
      roundCheckMs: ROUND_CHECK_MS,
    });
    this.comboStreak = 0;
    this.resolved = false;
    this.lastPhase = null;
    this.prevBotScore = 0;
    this.prevMyScore = 0;
    this.lastOppEmoteAt = 0;
    useGameStore.getState().startVersus(ROUNDS, this.durationMs);
    useVersusStore
      .getState()
      .setOpponent(`Lv.${this.level} ${info.name}`, info.avatar, info.title, false);
    // Don't paint the round-0 apples yet: the start-of-match augment pick + 3·2·1
    // intro come first, and drawing the board here flashes the apples for a frame
    // before those overlays mount. The board is drawn when the round actually
    // begins (preRound → round), matching the online flow.
    this.board.showSelection(null, false);
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

  /** Spend a reroll token on the current augment offer (no-op if none left). */
  reroll(): void {
    if (!this.match) return;
    if (this.match.reroll(this.clock.now())) {
      const snap = this.match.snapshot();
      const st = useGameStore.getState();
      st.setOffers(snap.offers, snap.offerTier ?? 'silver');
      st.setRerollsLeft(snap.rerollsLeft);
      sfx.pick();
    }
  }

  pause(): void {
    if (this.clock.paused) return;
    this.clock.pause();
    cancelAnimationFrame(this.raf);
  }

  resume(): void {
    if (!this.clock.paused) return;
    this.clock.resume();
    // The versus loop is a single continuous driver: it powers the round timer
    // *and* the timed roundCheck/augment overlays (their countdowns + auto-pick),
    // and it's what applies phase transitions after a pick. Re-arm it for any
    // live phase — restricting to 'round' froze the start-of-match augment pick
    // after the intro countdown (timer stuck, clicks registered but never advanced).
    if (this.match && useGameStore.getState().phase !== 'result') this.loop();
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    clearTimeout(this.activationTimer);
    window.removeEventListener('resize', this.onResize);
    this.ro?.disconnect();
    this.ro = null;
    this.input?.detach();
    this.board.destroy();
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
    if (snap.phase !== 'round' && this.lastPhase === 'round') {
      this.board.resetFx();
      this.companionOn = false;
    }
    if (snap.phase === 'round') {
      if (this.lastPhase === null) {
        // The rival greets at match start (tone set by its persona).
        if (this.persona) this.botEmote(this.persona.greet, { force: true });
      } else if (this.lastPhase === 'preRound') {
        // A fresh round just began (preRound countdown → round): refresh board + combo.
        this.board.resetFx();
        this.board.setBoard(m.myBoard());
        this.armCompanion(snap);
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
            chance: 0.95,
          });
      }
      updateAmbient(this.board, snap.myOwned, snap.remainingMs, this.durationMs);
      this.tickCompanion();
      st.setPhase('round');
    } else if (snap.phase === 'preRound') {
      // Augment locked in → 3·2·1 countdown before the round runs. The board timer
      // stays frozen (the round hasn't begun); GameScreen shows the countdown.
      st.setPhase('preRound');
    } else if (snap.phase === 'roundCheck') {
      const r = snap.lastRound;
      if (r) {
        vs.setRoundCheck(
          {
            my: r.myScore,
            opp: r.botScore,
            winner: r.winner === 'me' ? 'me' : r.winner === 'bot' ? 'opp' : 'draw',
            round: snap.round,
            bonus: r.bonus,
            myTotal: snap.myTotal,
            oppTotal: snap.botTotal,
            history: snap.roundHistory.map((h) => ({
              my: h.my,
              opp: h.bot,
              winner: h.winner === 'me' ? 'me' : h.winner === 'bot' ? 'opp' : 'draw',
            })),
          },
          snap.phaseRemainingMs,
        );
        // React to the round result the moment the review screen opens.
        if (this.lastPhase !== 'roundCheck' && this.persona) {
          const pool =
            r.winner === 'bot'
              ? this.persona.roundWin
              : r.winner === 'me'
                ? this.persona.roundLoss
                : this.persona.even;
          this.botEmote(pool, { chance: 0.9, ignoreThrottle: true });
        }
      } else {
        vs.setOverlayRemaining(snap.phaseRemainingMs);
      }
      st.setPhase('roundCheck');
    } else if (snap.phase === 'augment') {
      st.setOffers(snap.offers, snap.offerTier ?? 'silver');
      st.setRerollsLeft(snap.rerollsLeft);
      vs.setOverlayRemaining(snap.phaseRemainingMs);
      // Muse aloud while the augment picker is up (once, on phase entry).
      if (this.lastPhase !== 'augment' && this.persona)
        this.botEmote(this.persona.augment, { chance: 0.85, ignoreThrottle: true });
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
    const history = s.roundHistory.map((h) => ({
      my: h.my,
      opp: h.bot,
      winner: h.winner === 'me' ? ('me' as const) : h.winner === 'bot' ? ('opp' as const) : ('draw' as const),
    }));
    useVersusStore
      .getState()
      .setLive(
        s.botTotal,
        s.botScore,
        { me: s.roundWins.me, opp: s.roundWins.bot },
        s.botOwned,
        history,
      );
    // Opponent "+N" popup: bot's per-round score is cumulative, so a positive
    // frame-to-frame delta is a fresh clear (round reset → 0 yields a negative
    // delta we ignore).
    const botDelta = s.botScore - this.prevBotScore;
    const myDelta = s.myScore - this.prevMyScore;
    if (botDelta > 0) {
      useVersusStore.getState().bumpOppGain(botDelta);
      // 시간의 지배자: when the rival (who owns time.lord) clears, MY apples are
      // veiled as "?" for 0.5s — re-armed on each of its clears.
      if (s.botOwned.includes('time.lord')) this.board.pulseHideLabels(500);
      // Reacts to its own clear: gloat when ahead, stay breezy when even/behind.
      if (this.persona)
        this.botEmote(this.botAhead(s) ? this.persona.ahead : this.persona.even, { chance: 0.72 });
    } else if (myDelta > 0 && !this.botAhead(s)) {
      // The player just scored and is (still) ahead → the rival looks rattled.
      if (this.persona) this.botEmote(this.persona.behind, { chance: 0.6 });
    }
    this.prevBotScore = s.botScore;
    this.prevMyScore = s.myScore;
  }

  /** Fire a rival emote from `pool`; throttled + probabilistic (scaled by the
   *  rival's chattiness) unless `force`. `ignoreThrottle` keeps the chance gate
   *  but skips the back-to-back cooldown — used for phase-transition reactions
   *  (round check / augment pick) that are naturally spaced from in-round chatter. */
  private botEmote(
    pool: string[],
    opts?: { force?: boolean; chance?: number; ignoreThrottle?: boolean },
  ): void {
    if (pool.length === 0) return;
    const now = this.clock.now();
    if (!opts?.force) {
      if (!opts?.ignoreThrottle && now - this.lastOppEmoteAt < EMOTE_THROTTLE_MS) return;
      const chattiness = this.persona?.chattiness ?? 1;
      if (Math.random() > (opts?.chance ?? 0.5) * chattiness) return;
    }
    this.lastOppEmoteAt = now;
    useVersusStore.getState().sendOppEmote(pool[Math.floor(Math.random() * pool.length)]);
  }

  /** Arm 새콤이's auto-clear cadence for a fresh round (owner check + presence). */
  private armCompanion(snap: VersusSnapshot): void {
    this.companionOn = snap.myOwned.includes(COMPANION_ID);
    this.companionStart = this.clock.now();
    this.companionNextAt = COMPANION_FIRST_MS;
    this.board.companionPresence(this.companionOn);
  }

  /** Let 새콤이 pop a sum-10 group for me whenever its timer comes due. */
  private tickCompanion(): void {
    const m = this.match;
    if (!this.companionOn || !m) return;
    const t = this.clock.now() - this.companionStart;
    let guard = 0;
    while (t >= this.companionNextAt && guard++ < 4) {
      this.companionNextAt += COMPANION_INTERVAL_MS;
      const info = m.companionClear(this.clock.now());
      if (!info) break;
      this.playCompanion(info);
    }
  }

  private playCompanion(info: { cells: number[]; preTags: CellTag[]; finalScore: number }): void {
    const m = this.match;
    if (!m) return;
    this.board.burst(info.cells);
    this.board.setBoard(m.myBoard());
    const center = this.board.centroidPx(info.cells);
    if (center) this.board.companionPop(center.x, center.y);
    this.board.scorePopup(info.cells, info.finalScore);
    useGameStore.getState().setRoundScore(m.snapshot().myScore);
    sfx.clear(1);
  }

  /** True when the rival's standing (banked total + current round) leads. */
  private botAhead(s: VersusSnapshot): boolean {
    return s.botTotal + s.botScore > s.myTotal + s.myScore;
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
    // New personal-best total (across all modes)? Capture before finishMatch()
    // rolls the persisted best forward.
    const gs = useGameStore.getState();
    const newRecord = s.myTotal > gs.bestTotal;
    gs.setTotalScore(s.myTotal);
    gs.finishMatch();
    useVersusStore.getState().setResult(winner, mmrDelta, newRecord);
    useGameStore.getState().setPhase('result');
  }

  private handlers: DragHandlers = {
    onStart: () => {
      this.match?.setDragging(true);
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

  private onResize = (): void => {
    const next = this.calcLayout();
    if (!this.layout || next.width !== this.layout.width || next.height !== this.layout.height) {
      this.layout = next;
      this.board.setLayout(this.layout);
    }
  };
}
