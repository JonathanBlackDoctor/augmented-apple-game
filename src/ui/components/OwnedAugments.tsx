// ui/components/OwnedAugments.tsx — live "build" sidebar: the augments the
// player currently owns, shown as family-icon chips during play. Reads the
// shared `owned` list (kept in sync by the active controller).
import { useGameStore } from '../../app/store';
import { byId } from '../../augments';
import { AugmentEmblem } from './AugmentEmblem';

export function OwnedAugments() {
  const owned = useGameStore((s) => s.owned);
  if (owned.length === 0) return null;
  return (
    <div className="owned-augments" aria-label="보유 증강">
      {owned.map((id, i) => {
        const a = byId(id);
        if (!a) return null;
        return (
          <div key={`${id}:${i}`} className={`owned-aug-chip ${a.tier}`} title={`${a.name} · ${a.desc}`}>
            <AugmentEmblem aug={a} className="owned-aug-emblem" />
            <span className="owned-aug-name">{a.name}</span>
          </div>
        );
      })}
    </div>
  );
}
