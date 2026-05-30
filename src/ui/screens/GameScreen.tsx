import { useEffect, useRef } from 'react';
import { makeRng } from '../../core';
import { useGameStore } from '../../app/store';
import { MatchController, type MatchPlan } from '../../app/MatchController';
import { VersusController } from '../../app/VersusController';
import { buildHookBusFor, rollOffer, tierForRound } from '../../augments';
import { Hud } from '../components/Hud';
import { VersusHud } from '../components/VersusHud';
import { AugmentOverlay } from '../components/AugmentOverlay';
import { ResultOverlay } from '../components/ResultOverlay';
import { VersusResult } from '../components/VersusResult';

function buildPlan(mode: 'solo' | 'augment'): MatchPlan {
  const seedBase = `${mode}:${Date.now()}`;
  const base = { seedBase, cols: 17, rows: 10, durationMs: 30_000, targetSum: 10, modeId: 'separate' };
  if (mode === 'solo') return { rounds: 1, ...base };
  return {
    rounds: 5,
    ...base,
    buildHookBus: (owned) => buildHookBusFor(owned),
    rollOffer: (roundIndex, owned) => ({
      tier: tierForRound(roundIndex),
      ids: rollOffer(tierForRound(roundIndex), makeRng(`${seedBase}:offer:r${roundIndex}`), owned),
    }),
  };
}

export function GameScreen() {
  const hostRef = useRef<HTMLDivElement>(null);
  const soloRef = useRef<MatchController | null>(null);
  const versusRef = useRef<VersusController | null>(null);
  const phase = useGameStore((s) => s.phase);
  const mode = useGameStore((s) => s.mode);
  const isVersus = mode === 'versus';

  useEffect(() => {
    let disposed = false;
    if (isVersus) {
      const ctrl = new VersusController();
      versusRef.current = ctrl;
      void (async () => {
        const host = hostRef.current;
        if (!host) return;
        await ctrl.mount(host);
        if (disposed) {
          ctrl.destroy();
          return;
        }
        ctrl.startVersus();
      })();
      return () => {
        disposed = true;
        ctrl.destroy();
        versusRef.current = null;
      };
    }
    const ctrl = new MatchController();
    soloRef.current = ctrl;
    void (async () => {
      const host = hostRef.current;
      if (!host) return;
      await ctrl.mount(host);
      if (disposed) {
        ctrl.destroy();
        return;
      }
      ctrl.startMatch(buildPlan(mode === 'augment' ? 'augment' : 'solo'));
    })();
    return () => {
      disposed = true;
      ctrl.destroy();
      soloRef.current = null;
    };
  }, [isVersus, mode]);

  const onPick = (id: string): void => {
    if (isVersus) versusRef.current?.pick(id);
    else soloRef.current?.pick(id);
  };
  const onReplay = (): void => {
    if (isVersus) versusRef.current?.restart();
    else soloRef.current?.restart();
  };
  const onHome = (): void => useGameStore.getState().goHome();

  return (
    <div className="screen game">
      {isVersus ? <VersusHud /> : <Hud />}
      <div className="board-host" ref={hostRef} />
      {phase === 'augment' && <AugmentOverlay onPick={onPick} />}
      {phase === 'result' &&
        (isVersus ? (
          <VersusResult onReplay={onReplay} onHome={onHome} />
        ) : (
          <ResultOverlay onReplay={onReplay} onHome={onHome} />
        ))}
    </div>
  );
}
