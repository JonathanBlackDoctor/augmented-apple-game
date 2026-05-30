import { useGameStore } from '../../app/store';
import { byId } from '../../augments';

const TIER_LABEL: Record<string, string> = { silver: '실버', gold: '골드', prismatic: '프리즘' };
const FAMILY_LABEL: Record<string, string> = {
  time: '시간',
  combo: '콤보',
  board: '보드',
  rule: '룰',
  risk: '하이리스크',
  disrupt: '견제',
};

export function AugmentOverlay({ onPick }: { onPick: (id: string) => void }) {
  const offers = useGameStore((s) => s.offers);
  const tier = useGameStore((s) => s.offerTier);
  const roundIndex = useGameStore((s) => s.roundIndex);
  return (
    <div className="overlay">
      <div className="augment-panel">
        <div className="aug-head">
          {tier && <span className={`tier-badge ${tier}`}>{TIER_LABEL[tier]}</span>}
          <h2>라운드 {roundIndex + 1} · 증강 선택</h2>
          <p className="aug-sub">하나를 골라 빌드를 쌓으세요 · 리롤 없음</p>
        </div>
        <div className="aug-grid">
          {offers.map((id) => {
            const a = byId(id);
            if (!a) return null;
            return (
              <button key={id} className={`aug-card ${a.tier}`} onClick={() => onPick(id)}>
                <span className="aug-fam">{FAMILY_LABEL[a.family] ?? a.family}</span>
                <span className="aug-name">{a.name}</span>
                <span className="aug-desc">{a.desc}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
