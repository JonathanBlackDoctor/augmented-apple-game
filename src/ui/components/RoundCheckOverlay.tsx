// ui/components/RoundCheckOverlay.tsx — mid-round review (대결 전용). Stages an
// "emotional ledger": round scores count up, the winner's bonus chip lands, the
// cumulative totals roll up, then the series pip strip reveals. Auto-advances
// when the controller's countdown (overlayRemainingMs) elapses. Presentation
// only — the pure core is untouched; reduced-motion snaps every stage to final.
import { useEffect, useState } from 'react';
import { useGameStore } from '../../app/store';
import { useVersusStore, type RoundResult } from '../../app/versusStore';
import { ROUND_CHECK_MS } from '../../app/VersusController';
import { AnimNum } from './AnimNum';

interface RoundCheckOverlayProps {
  // Online mode supplies its own review data (from onlineStore); omitted → versus.
  result?: RoundResult | null;
  wins?: { me: number; opp: number };
  oppName?: string;
  remaining?: number;
  totalRounds?: number;
  roundCheckMs?: number;
}

function prefersReducedMotion(): boolean {
  try {
    return (
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  } catch {
    return false;
  }
}

// per-stage delays (ms): 0 scores → 1 bonus chip → 2 totals rollup → 3 pips
const STAGE_DELAYS = [700, 300, 450];

export function RoundCheckOverlay({
  result,
  wins: winsProp,
  oppName: oppNameProp,
  remaining: remainingProp,
  totalRounds: totalRoundsProp,
  roundCheckMs,
}: RoundCheckOverlayProps = {}) {
  const rStore = useVersusStore((s) => s.roundResult);
  const winsStore = useVersusStore((s) => s.roundWins);
  const oppNameStore = useVersusStore((s) => s.oppName);
  const remainingStore = useVersusStore((s) => s.overlayRemainingMs);
  const totalRoundsStore = useGameStore((s) => s.totalRounds);
  // `result` can legitimately be null (no round yet), so distinguish "not passed".
  const r = result !== undefined ? result : rStore;
  const wins = winsProp ?? winsStore;
  const oppName = oppNameProp ?? oppNameStore;
  const remaining = remainingProp ?? remainingStore;
  const totalRounds = totalRoundsProp ?? totalRoundsStore;
  const checkMs = roundCheckMs ?? ROUND_CHECK_MS;

  const reduce = prefersReducedMotion();
  const [step, setStep] = useState(reduce ? STAGE_DELAYS.length : 0);

  // advance one stage per delay; restart whenever a new round result lands
  useEffect(() => {
    if (reduce) {
      setStep(STAGE_DELAYS.length);
      return;
    }
    setStep(0);
    const timers = STAGE_DELAYS.map((_, i) =>
      setTimeout(
        () => setStep((s) => Math.max(s, i + 1)),
        STAGE_DELAYS.slice(0, i + 1).reduce((a, b) => a + b, 0),
      ),
    );
    return () => timers.forEach(clearTimeout);
  }, [r?.round, reduce]);

  if (!r) return null;
  const pct = Math.max(0, Math.min(1, remaining / checkMs));
  const verdict =
    r.winner === 'me' ? '내가 이긴 라운드!' : r.winner === 'opp' ? '상대가 이긴 라운드' : '비긴 라운드';
  const dur = (ms: number): number => (reduce ? 0 : ms);
  const myBefore = r.myTotal - r.my - (r.winner === 'me' ? r.bonus : 0);
  const oppBefore = r.oppTotal - r.opp - (r.winner === 'opp' ? r.bonus : 0);
  const lastIdx = r.history.length - 1;

  return (
    <div className="overlay">
      <div className="augment-panel round-check-panel">
        <div className="aug-head">
          <span className="round-chip">
            라운드 {r.round + 1}
            <span className="of">/{totalRounds}</span>
          </span>
          <h2>라운드 점검</h2>
          <p className="aug-sub">{verdict}</p>
        </div>
        <div className="rc-scores">
          <div className={`rc-side${r.winner === 'me' ? ' won' : ''}`}>
            {r.winner === 'me' && r.bonus > 0 && step >= 1 && (
              <span className="rc-bonus">+{r.bonus} 보너스</span>
            )}
            <span className="rc-label">나</span>
            <span className="rc-score">
              <AnimNum from={0} to={r.my} dur={dur(700)} />
            </span>
          </div>
          <span className="rc-vs">vs</span>
          <div className={`rc-side${r.winner === 'opp' ? ' won' : ''}`}>
            {r.winner === 'opp' && r.bonus > 0 && step >= 1 && (
              <span className="rc-bonus">+{r.bonus} 보너스</span>
            )}
            <span className="rc-label">{oppName}</span>
            <span className="rc-score">
              <AnimNum from={0} to={r.opp} dur={dur(700)} />
            </span>
          </div>
        </div>

        <div className="rc-total">
          <span className="rc-total-label">누적 총점</span>
          <span className="rc-total-val">
            <AnimNum from={myBefore} to={r.myTotal} run={step >= 2} dur={dur(450)} />
            <span className="rc-total-sep">:</span>
            <AnimNum
              from={oppBefore}
              to={r.oppTotal}
              run={step >= 2}
              dur={dur(450)}
              className="opp"
            />
          </span>
        </div>

        <div className="rc-pips">
          {r.history.map((h, i) => {
            const w = h.winner === 'me' ? 'w' : h.winner === 'opp' ? 'l' : 'd';
            const isNew = step >= 3 && i === lastIdx;
            return (
              <span key={i} className={`rc-pip ${w}${isNew ? ' new' : ''}`}>
                <span className="rc-pip-r">R{i + 1}</span>
                <span className="rc-pip-v">
                  {h.my}:{h.opp}
                </span>
              </span>
            );
          })}
        </div>

        <div className="rc-series">
          누적 전적 <strong>{wins.me} : {wins.opp}</strong>
        </div>
        <div className="time-bar">
          <div className="time-fill" style={{ width: `${pct * 100}%` }} />
        </div>
      </div>
    </div>
  );
}
