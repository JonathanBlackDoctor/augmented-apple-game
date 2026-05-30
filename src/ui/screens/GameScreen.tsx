import { useEffect, useRef, useState } from 'react';
import { makeRng } from '../../core';
import { useGameStore } from '../../app/store';
import { getSettings } from '../../app/settingsStore';
import { MatchController, type MatchPlan } from '../../app/MatchController';
import { VersusController, AUGMENT_MS } from '../../app/VersusController';
import { useVersusStore } from '../../app/versusStore';
import { buildHookBusFor, rollOffer, tierForRound } from '../../augments';
import { Hud } from '../components/Hud';
import { VersusHud } from '../components/VersusHud';
import { AugmentOverlay } from '../components/AugmentOverlay';
import { RoundCheckOverlay } from '../components/RoundCheckOverlay';
import { OwnedAugments } from '../components/OwnedAugments';
import { ResultOverlay } from '../components/ResultOverlay';
import { VersusResult } from '../components/VersusResult';
import { SettingsOverlay } from '../components/SettingsOverlay';
import { HelpOverlay } from '../components/HelpOverlay';
import { PauseOverlay } from '../components/PauseOverlay';

function buildPlan(mode: 'solo' | 'augment'): MatchPlan {
  const seedBase = `${mode}:${Date.now()}`;
  const s = getSettings();
  const base = {
    seedBase,
    cols: s.boardCols,
    rows: s.boardRows,
    durationMs: s.roundDurationMs,
    targetSum: 10,
    modeId: 'separate',
  };
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
  const overlayRemainingMs = useVersusStore((s) => s.overlayRemainingMs);
  const isVersus = mode === 'versus';
  const [paused, setPaused] = useState(false);
  const [overlay, setOverlay] = useState<'settings' | 'help' | null>(null);

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

  const activeCtrl = (): MatchController | VersusController | null =>
    isVersus ? versusRef.current : soloRef.current;
  const onPause = (): void => {
    activeCtrl()?.pause();
    setPaused(true);
  };
  const onResume = (): void => {
    activeCtrl()?.resume();
    setPaused(false);
  };
  const onRestart = (): void => {
    setOverlay(null);
    setPaused(false);
    onReplay();
  };
  const onHomeFromPause = (): void => {
    setPaused(false);
    setOverlay(null);
    onHome();
  };

  // Pause is only meaningful during an active round.
  const pauseHandler = phase === 'round' ? onPause : undefined;

  return (
    <div className="screen game">
      {isVersus ? <VersusHud onPause={pauseHandler} /> : <Hud onPause={pauseHandler} />}
      <div className="board-host" ref={hostRef} />
      {isVersus && <OwnedAugments />}
      {phase === 'roundCheck' && isVersus && <RoundCheckOverlay />}
      {phase === 'augment' &&
        (isVersus ? (
          <AugmentOverlay onPick={onPick} remainingMs={overlayRemainingMs} totalMs={AUGMENT_MS} />
        ) : (
          <AugmentOverlay onPick={onPick} />
        ))}
      {phase === 'result' &&
        (isVersus ? (
          <VersusResult onReplay={onReplay} onHome={onHome} />
        ) : (
          <ResultOverlay onReplay={onReplay} onHome={onHome} />
        ))}
      {paused && (
        <PauseOverlay
          onResume={onResume}
          onRestart={onRestart}
          onHome={onHomeFromPause}
          onSettings={() => setOverlay('settings')}
          onHelp={() => setOverlay('help')}
        />
      )}
      {overlay === 'settings' && <SettingsOverlay onClose={() => setOverlay(null)} />}
      {overlay === 'help' && <HelpOverlay onClose={() => setOverlay(null)} />}
    </div>
  );
}
