// Reproduces the "match-start augment pick is frozen after the 3·2·1 intro" bug
// at the controller level: mounts a VersusController with stubbed DOM/Pixi deps,
// drives the exact GameScreen sequence (startVersus → pause → [intro] → resume),
// and asserts the augment-pick countdown advances + a pick transitions to a round.
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---- heavy DOM/Pixi deps stubbed so the controller can run headless ----------
vi.mock('../src/board/BoardView', () => ({
  BoardView: class {
    app = { canvas: {} };
    effects = { desat: () => {} };
    async mount() {}
    setLayout() {}
    setBoard() {}
    showSelection() {}
    resetFx() {}
    burst() {}
    setLabelsHidden() {}
    destroy() {}
  },
}));
vi.mock('../src/input/InputController', () => ({
  InputController: class {
    attach() {}
    detach() {}
  },
}));
vi.mock('../src/app/augmentFx', () => ({
  playActivation: () => {},
  playClear: () => {},
  updateAmbient: () => {},
}));
vi.mock('../src/app/sound', () => ({
  sfx: {
    pick: () => {},
    clear: () => {},
    fail: () => {},
    end: () => {},
    start: () => {},
    setEnabled: () => {},
  },
}));
vi.mock('../src/profile', () => ({
  LocalProfileService: class {
    async signInAnon() {
      return { uid: 'u', nickname: 'me', avatar: '🙂', tier: 'Silver', mmr: 1000 };
    }
    persist() {}
  },
  browserKV: () => ({ get: () => null, set: () => {} }),
}));
vi.mock('../src/ranking', () => ({
  StandardRankingService: class {
    async applyResult() {
      return { mmrDelta: 0 };
    }
  },
  InMemoryRankingStore: class {},
}));

// ---- minimal browser globals -------------------------------------------------
let now = 0;
let rafId = 0;
const rafQueue = new Map<number, FrameRequestCallback>();
beforeEach(() => {
  now = 0;
  rafId = 0;
  rafQueue.clear();
  vi.stubGlobal('performance', { now: () => now });
  // A faithful rAF: cancelAnimationFrame must actually drop the queued frame, so
  // a paused controller really stops ticking (the no-op stub hid the bug).
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    const id = ++rafId;
    rafQueue.set(id, cb);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    rafQueue.delete(id);
  });
  vi.stubGlobal('window', {
    addEventListener: () => {},
    removeEventListener: () => {},
    setTimeout: (fn: () => void) => {
      fn();
      return 0;
    },
    clearTimeout: () => {},
    innerWidth: 1024,
    innerHeight: 768,
  });
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    disconnect() {}
  });
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
  });
});

// Drain the oldest frame the loop scheduled, advancing the clock by dtMs first.
function step(dtMs: number): void {
  now += dtMs;
  const next = rafQueue.entries().next();
  if (next.done) return;
  const [id, cb] = next.value;
  rafQueue.delete(id);
  cb(now);
}

describe('VersusController — match-start augment pick after the intro', () => {
  it('keeps the augment countdown ticking and accepts a pick once the intro resumes', async () => {
    const { VersusController } = await import('../src/app/VersusController');
    const { useGameStore } = await import('../src/app/store');
    const { useVersusStore } = await import('../src/app/versusStore');

    const ctrl = new VersusController();
    await ctrl.mount({ clientWidth: 1024, clientHeight: 768 } as unknown as HTMLElement);

    // GameScreen's exact start sequence: run the match, then freeze for the intro.
    ctrl.startVersus();
    expect(useGameStore.getState().phase).toBe('augment');
    const startRemaining = useVersusStore.getState().overlayRemainingMs;
    expect(startRemaining).toBeGreaterThan(0);

    ctrl.pause();
    // Intro plays for ~2.4s of real time while the clock is frozen.
    now += 2400;
    ctrl.resume();

    // The continuous loop must resume and keep advancing the augment countdown.
    step(16);
    step(200);
    step(200);
    const afterRemaining = useVersusStore.getState().overlayRemainingMs;
    expect(useGameStore.getState().phase).toBe('augment');
    expect(afterRemaining).toBeLessThan(startRemaining);

    // Picking an augment opens the 3·2·1 pre-round countdown; the round itself
    // begins only once that countdown elapses (loop applies both transitions).
    const offer = useGameStore.getState().offers[0];
    expect(offer).toBeTruthy();
    ctrl.pick(offer);
    step(16);
    expect(useGameStore.getState().phase).toBe('preRound');
    // Advance past the pre-round countdown (default 3s) into the live round.
    for (let i = 0; i < 40 && useGameStore.getState().phase !== 'round'; i++) step(100);
    expect(useGameStore.getState().phase).toBe('round');

    ctrl.destroy();
  });
});
