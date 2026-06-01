import type { AugTier, AugFamily } from '../../contracts';
import { useGameStore } from '../../app/store';
import { byId, SET_SYNERGY_BONUS, SET_SYNERGY_THRESHOLD } from '../../augments';
import { FAMILY_ICON } from './augmentIcons';
import { AugmentEmblem } from './AugmentEmblem';

const SET_BONUS_PCT = Math.round(SET_SYNERGY_BONUS * 100);

/** Tally owned augments by family (most-collected first) for the set-bonus row. */
function familyTallies(owned: string[]): { family: AugFamily; count: number }[] {
  const counts = new Map<AugFamily, number>();
  for (const id of owned) {
    const fam = byId(id)?.family;
    if (fam) counts.set(fam, (counts.get(fam) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([family, count]) => ({ family, count }))
    .sort((a, b) => b.count - a.count);
}

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
  // When provided (versus + online), render a pick-countdown that auto-selects on 0.
  remainingMs?: number;
  totalMs?: number;
  // When provided (versus + online), render a reroll control wired to this handler.
  onReroll?: () => void;
  // Online mode keeps its state in onlineStore, not the shared game store; when
  // these are supplied they override the store reads so this one component serves
  // both modes. Omitted → versus/solo reads from useGameStore as before.
  offers?: string[];
  offerTier?: AugTier | null;
  roundIndex?: number;
  rerollsLeft?: number;
  owned?: string[];
}

export function AugmentOverlay({
  onPick,
  remainingMs,
  totalMs,
  onReroll,
  offers: offersProp,
  offerTier: tierProp,
  roundIndex: roundIndexProp,
  rerollsLeft: rerollsProp,
  owned: ownedProp,
}: AugmentOverlayProps) {
  const offersStore = useGameStore((s) => s.offers);
  const tierStore = useGameStore((s) => s.offerTier);
  const roundIndexStore = useGameStore((s) => s.roundIndex);
  const rerollsStore = useGameStore((s) => s.rerollsLeft);
  const ownedStore = useGameStore((s) => s.owned);
  const offers = offersProp ?? offersStore;
  const tier = tierProp ?? tierStore;
  const roundIndex = roundIndexProp ?? roundIndexStore;
  const rerollsLeft = rerollsProp ?? rerollsStore;
  const owned = ownedProp ?? ownedStore;
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
        {owned.length > 0 && (
          <div className="cur-build-sets">
            <span className="set-hint">
              같은 계열 {SET_SYNERGY_THRESHOLD}개 모으면 점수 +{SET_BONUS_PCT}%
            </span>
            <div className="set-tallies">
              {familyTallies(owned).map(({ family, count }) => {
                const done = count >= SET_SYNERGY_THRESHOLD;
                return (
                  <span key={family} className={`set-tally${done ? ' done' : ''}`}>
                    <span className="set-tally-icon">{FAMILY_ICON[family]}</span>
                    {FAMILY_LABEL[family] ?? family} {count}/{SET_SYNERGY_THRESHOLD}
                    {done && <span className="set-tally-bonus">+{SET_BONUS_PCT}%</span>}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
