import { useGameStore } from '../../app/store';
import { hudTimerState } from './hudTimer';

export function Hud({ onPause }: { onPause?: () => void }) {
  const s = useGameStore();
  const total = s.roundScore;
  const pct = Math.max(0, Math.min(1, s.durationMs ? s.remainingMs / s.durationMs : 0));
  const secs = Math.max(0, Math.ceil(s.remainingMs / 1000));
  const low = secs <= 5;
  const fill = hudTimerState(secs, s.owned);
  return (
    <div className="hud">
      <div className="hud-side left">
        {s.totalRounds > 1 && (
          <span className="round-chip">
            R{s.roundIndex + 1}
            <span className="of">/{s.totalRounds}</span>
          </span>
        )}
        <span className="score-val">{total}</span>
        <span className="score-unit">점</span>
      </div>
      <div className="hud-center">
        <div className={`time-bar${low ? ' low' : ''}`}>
          <div className={`time-fill${fill ? ' ' + fill : ''}`} style={{ width: `${pct * 100}%` }} />
        </div>
        <span className={`time-num${low ? ' low' : ''}`}>{secs}</span>
      </div>
      <div className="hud-side right">
        {s.combo > 1 && <span className="combo-chip">{s.combo} 콤보</span>}
        {onPause && (
          <button className="icon-btn hud-pause" onClick={onPause} aria-label="일시정지">
            ⏸
          </button>
        )}
      </div>
    </div>
  );
}
