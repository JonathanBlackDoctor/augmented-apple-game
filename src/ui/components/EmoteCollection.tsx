// ui/components/EmoteCollection.tsx — the emote "dex": every collectible emote,
// with locked ones hidden behind a "?". Opened from the level-select screen.
import { useProgressStore } from '../../app/progressStore';
import { EMOTES } from '../../emotes';

export function EmoteCollection({ onClose }: { onClose: () => void }) {
  const unlocked = useProgressStore((s) => s.unlockedEmotes);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="result-card emote-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="result-title">감정표현 도감</h2>
        <p className="aug-sub">
          레벨을 클리어해 모아보세요 ({unlocked.length}/{EMOTES.length})
        </p>
        <div className="emote-grid">
          {EMOTES.map((e) => {
            const has = unlocked.includes(e.id);
            return (
              <div key={e.id} className={`emote-cell${has ? '' : ' locked'}`}>
                <span className="emote-emoji">{has ? e.emoji : '❓'}</span>
                <span className="emote-label">{has ? e.label : '???'}</span>
              </div>
            );
          })}
        </div>
        <div className="btn-row">
          <button className="btn primary" onClick={onClose}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
