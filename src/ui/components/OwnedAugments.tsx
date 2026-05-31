// ui/components/OwnedAugments.tsx — live "build" sidebars during versus play:
// the augments each side currently owns, shown as compact trading-card faces
// (a scaled-down `.aug-card`). The player's cards sit on the left, the
// opponent's on the right. Reads the shared `owned` list (kept in sync by the
// active controller) and the versus store's `oppOwned`.
import { useGameStore } from '../../app/store';
import { useVersusStore } from '../../app/versusStore';
import { byId } from '../../augments';
import { AugmentEmblem } from './AugmentEmblem';

function AugmentCardRow({ ids, side }: { ids: string[]; side: 'left' | 'right' }) {
  if (ids.length === 0) return null;
  return (
    <div className={`owned-augments ${side}`} aria-label={side === 'left' ? '내 증강' : '상대 증강'}>
      {ids.map((id, i) => {
        const a = byId(id);
        if (!a) return null;
        return (
          <div key={`${id}:${i}`} className={`owned-card ${a.tier}`} title={`${a.name} · ${a.desc}`}>
            <div className="owned-card-art">
              <AugmentEmblem aug={a} className="owned-card-emblem" />
            </div>
            <span className="owned-card-name">{a.name}</span>
          </div>
        );
      })}
    </div>
  );
}

export function OwnedAugments() {
  const owned = useGameStore((s) => s.owned);
  return <AugmentCardRow ids={owned} side="left" />;
}

export function OpponentAugments() {
  const oppOwned = useVersusStore((s) => s.oppOwned);
  return <AugmentCardRow ids={oppOwned} side="right" />;
}
