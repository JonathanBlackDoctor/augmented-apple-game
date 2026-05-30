// board/theme.ts — "Sunlit Orchard" (방향 A) design tokens.
// Warm cream paper, glossy satin orchard-red apples, honey-gold accent.
// Shared by the Pixi board; the React shell mirrors these as CSS variables in
// ui/styles.css. Source of truth: 디자인 시안 방향 A (.dir-a in styles.css).
// Note: the board is layered over the live day→night sky, so it draws no
// opaque backdrop of its own — `bg` is transparent.

export const theme = {
  color: {
    bg: 0xfbf5e9, // cream paper (fallback; canvas is transparent over the sky)
    boardPanel: 0xfffdf7, // subtle panel under the grid
    apple: 0xe04a36, // ripe orchard red
    appleTop: 0xff9a77, // soft satin top highlight
    appleEdge: 0xb8311e, // darker rim
    golden: 0xe3a12a, // golden apple (augment) — honey gold
    goldenTop: 0xffe7a2,
    goldenEdge: 0xb97f12,
    wild: 0x8a7dff, // wild apple (augment) — matches any value
    wildTop: 0xb9b1ff,
    wildEdge: 0x5b4fd6,
    gem: 0x3fcfd5, // gem apple (augment) — big flat bonus
    gemTop: 0x9af0f3,
    gemEdge: 0x1f9aa0,
    bomb: 0x4a4a52, // bomb apple (augment) — bonus on clear
    bombTop: 0x7c7c86,
    bombEdge: 0x26262b,
    leaf: 0x5e9a4e,
    text: 0xfff4ec, // cream numerals
    numShadow: 0x781e10, // numeral text shadow (warm deep red)
    selStroke: 0x3e9f63, // valid selection outline (orchard green)
    selFill: 0x3e9f63, // valid selection wash
    selNeutralStroke: 0x3a2a1e, // in-progress (not yet 10) outline (ink)
    particle: 0xe04a36,
    particleAlt: 0xff7c61,
  },
  ratio: {
    appleRadius: 0.42, // of cell (plump silhouette half-extent)
    highlightRadius: 0.16,
    selectionRadius: 0.16, // rounded corner of selection box (× cell)
    fontSize: 0.44, // of cell
  },
  font: '"Pretendard Variable", "Pretendard", ui-rounded, "Segoe UI", system-ui, sans-serif',
} as const;

export type Theme = typeof theme;
