import { useEffect, useState } from 'react';
import { useGameStore } from '../../app/store';
import { useVersusStore } from '../../app/versusStore';
import { hudTimerState } from './hudTimer';

interface Pop {
  seq: number;
  amount: number;
}

export function VersusHud({ onPause }: { onPause?: () => void }) {
  const s = useGameStore();
  const v = useVersusStore();
  const myTotal = s.totalScore + s.roundScore;
  const oppTotal = v.oppTotal + v.oppRoundScore;
  const pct = Math.max(0, Math.min(1, s.durationMs ? s.remainingMs / s.durationMs : 0));
  const secs = Math.max(0, Math.ceil(s.remainingMs / 1000));
  const low = secs <= 5;
  const fill = hudTimerState(secs, s.owned);

  // Mirror the bot's "+N" gain pulses into a short list of floating popups.
  const [pops, setPops] = useState<Pop[]>([]);
  useEffect(() => {
    if (v.oppGainSeq === 0) return;
    setPops((cur) => [...cur, { seq: v.oppGainSeq, amount: v.oppGainAmount }]);
  }, [v.oppGainSeq, v.oppGainAmount]);
  const removePop = (seq: number): void => setPops((cur) => cur.filter((p) => p.seq !== seq));

  return (
    <div className="hud versus-hud">
      <div className="vs-side me">
        <span className="vs-label">나</span>
        <span className="vs-score">{myTotal}</span>
        {s.combo > 1 && <span className="combo-chip">{s.combo}콤보</span>}
      </div>
      <div className="hud-center">
        <div className="vs-meta">
          <span className="round-chip">
            R{s.roundIndex + 1}
            <span className="of">/{s.totalRounds}</span>
          </span>
          <span className="vs-wins">
            {v.roundWins.me} : {v.roundWins.opp}
          </span>
          {onPause && (
            <button className="icon-btn hud-pause" onClick={onPause} aria-label="일시정지">
              ⏸
            </button>
          )}
        </div>
        <div className={`time-bar${low ? ' low' : ''}`}>
          <div className={`time-fill${fill ? ' ' + fill : ''}`} style={{ width: `${pct * 100}%` }} />
        </div>
        <span className={`time-num${low ? ' low' : ''}`}>{secs}</span>
      </div>
      <div className="vs-side opp">
        <span className="vs-label">{v.oppName}</span>
        <span className="vs-score">{oppTotal}</span>
        {pops.map((p) => (
          <span key={p.seq} className="score-pop" onAnimationEnd={() => removePop(p.seq)}>
            +{p.amount}
          </span>
        ))}
      </div>
    </div>
  );
}
