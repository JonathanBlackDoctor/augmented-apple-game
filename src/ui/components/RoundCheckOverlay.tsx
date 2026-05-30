// ui/components/RoundCheckOverlay.tsx — mid-round review (대결 전용). Shows the
// just-finished round's scores, who won it, and the running series, then
// auto-advances when the controller's countdown (overlayRemainingMs) elapses.
import { useGameStore } from '../../app/store';
import { useVersusStore } from '../../app/versusStore';
import { ROUND_CHECK_MS } from '../../app/VersusController';

export function RoundCheckOverlay() {
  const r = useVersusStore((s) => s.roundResult);
  const wins = useVersusStore((s) => s.roundWins);
  const oppName = useVersusStore((s) => s.oppName);
  const remaining = useVersusStore((s) => s.overlayRemainingMs);
  const totalRounds = useGameStore((s) => s.totalRounds);
  if (!r) return null;
  const pct = Math.max(0, Math.min(1, remaining / ROUND_CHECK_MS));
  const verdict = r.winner === 'me' ? '내가 이긴 라운드!' : r.winner === 'opp' ? '상대가 이긴 라운드' : '비긴 라운드';
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
            <span className="rc-label">나</span>
            <span className="rc-score">{r.my}</span>
          </div>
          <span className="rc-vs">vs</span>
          <div className={`rc-side${r.winner === 'opp' ? ' won' : ''}`}>
            <span className="rc-label">{oppName}</span>
            <span className="rc-score">{r.opp}</span>
          </div>
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
