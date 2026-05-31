// ui/components/AugmentEmblem.tsx — renders a per-augment SVG crest.
//
// The crest markup lives in augmentEmblems.ts (ported from the design
// showcase). This component injects it and isolates the crest's gradient/clip
// ids per instance, with a graceful family-emoji fallback for augments that
// have no bespoke crest (e.g. the versus-only 'disrupt' family).
import { useId } from 'react';
import type { Augment } from '../../contracts';
import { EMBLEM_SVG } from './augmentEmblems';
import { FAMILY_ICON } from './augmentIcons';

// Gradient/clip ids in the ported crests are authored as global constants. When
// several crests share a page (pick cards + owned sidebar), identical ids would
// collide and the browser would resolve every reference to the first match.
// Suffix every `id="…"` and `url(#…)` with a per-instance token to isolate them.
function namespaceIds(svg: string, uid: string): string {
  return svg
    .replace(/id="([^"]+)"/g, (_m, id) => `id="${id}-${uid}"`)
    .replace(/url\(#([^)]+)\)/g, (_m, id) => `url(#${id}-${uid})`);
}

export function AugmentEmblem({ aug, className }: { aug: Augment; className?: string }) {
  // useId() is stable across renders and unique per instance; strip the colons
  // React wraps it in so the token is valid inside an id / url(#…) fragment.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const raw = EMBLEM_SVG[aug.id];
  if (!raw) {
    return (
      <span className={className} aria-hidden="true">
        {FAMILY_ICON[aug.family]}
      </span>
    );
  }
  return (
    <span
      className={className}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: namespaceIds(raw, uid) }}
    />
  );
}
