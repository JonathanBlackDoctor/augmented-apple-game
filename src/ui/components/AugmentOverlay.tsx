import { useGameStore } from '../../app/store';
import { byId } from '../../augments';
import { FAMILY_ICON } from './augmentIcons';
import { AugmentEmblem } from './AugmentEmblem';

const TIER_LABEL: Record<string, string> = { silver: '실버', gold: '골드', prismatic: '프리즘' };
const FAMILY_LABEL: Record<string, string> = {
  time: '시간',
  combo: '콤보',
  board: '보드',
  rule: '룰',
  risk: '하이리스크',
  disrupt: '견제',
};

interface AugmentOverlayProps {
  onPick: (id: string) => void;
  // When provided (versus mode), render a pick-countdown that auto-selects on 0.
  remainingMs?: number;
  totalMs?: number;
  // When provided (versus mode), render a reroll control wired to this handler.
  onReroll?: () => void;
}

export function AugmentOverlay({ onPick, remainingMs, totalMs, onReroll }: AugmentOverlayProps) {
  const offers = useGameStore((s) => s.offers);
  const tier = useGameStore((s) => s.offerTier);
  const roundIndex = useGameStore((s) => s.roundIndex);
  const rerollsLeft = useGameStore((s) => s.rerollsLeft);
  const owned = useGameStore((s) => s.owned);
  const timed = remainingMs !== undefined && totalMs !== undefined && totalMs > 0;
  const pct = timed ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 0;
  const secs = timed ? Math.max(0, Math.ceil(remainingMs / 1000)) : 0;
  const canReroll = onReroll !== undefined;
  return (
    <div className="overlay">
      <div className="augment-panel">
        <div className="aug-head">
          {tier && <span className={`tier-badge ${tier}`}>{TIER_LABEL[tier]}</span>}
          <h2>라운드 {roundIndex + 1} · 증강 선택</h2>
          <p className="aug-sub">
            {canReroll ? '하나를 골라 빌드를 쌓으세요' : '하나를 골라 빌드를 쌓으세요 · 리롤 없음'}
          </p>
          {canReroll && (
            <button
              className="aug-reroll"
              onClick={onReroll}
              disabled={rerollsLeft <= 0}
              title={rerollsLeft > 0 ? '새로운 증강 3개로 다시 뽑기' : '리롤권을 모두 사용했습니다'}
            >
              🎲 리롤 ({rerollsLeft})
            </button>
          )}
          {timed && (
            <div className="aug-timer">
              <div className={`time-bar${secs <= 3 ? ' low' : ''}`}>
                <div className="time-fill" style={{ width: `${pct * 100}%` }} />
              </div>
              <span className={`time-num${secs <= 3 ? ' low' : ''}`}>{secs}</span>
            </div>
          )}
        </div>
        <div className="aug-grid">
          {offers.map((id) => {
            const a = byId(id);
            if (!a) return null;
            return (
              <button key={id} className={`aug-card ${a.tier}`} onClick={() => onPick(id)}>
                <div className="aug-art">
                  <AugmentEmblem aug={a} className="emblem-host" />
                </div>
                <div className="aug-meta">
                  <span className="aug-fam">
                    <span className="aug-fam-icon">{FAMILY_ICON[a.family]}</span>
                    {FAMILY_LABEL[a.family] ?? a.family}
                  </span>
                  <span className="aug-name">{a.name}</span>
                  <span className="aug-desc">{a.desc}</span>
                </div>
              </button>
            );
          })}
        </div>
        <div className="cur-build">
          <span className="cur-build-label">현재 빌드</span>
          {owned.length === 0 ? (
            <span className="cur-build-empty">아직 없음 — 첫 증강이에요</span>
          ) : (
            owned.map((id, i) => {
              const a = byId(id);
              if (!a) return null;
              return (
                <span key={`${id}:${i}`} className={`build-chip ${a.tier}`}>
                  <span className="build-chip-icon">{FAMILY_ICON[a.family]}</span>
                  {a.name}
                </span>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
