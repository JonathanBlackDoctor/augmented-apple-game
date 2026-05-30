// ui/components/augmentIcons.ts — emoji glyphs per augment family. The Augment
// type carries no icon field, so we map by family for a quick visual cue shared
// by the owned-augment sidebar and the augment-pick cards.
import type { AugFamily } from '../../contracts';

export const FAMILY_ICON: Record<AugFamily, string> = {
  time: '⏱️',
  combo: '🔥',
  board: '🍎',
  rule: '📏',
  risk: '🎲',
  disrupt: '⚔️',
};
