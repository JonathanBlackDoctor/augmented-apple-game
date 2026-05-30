// board/theme.ts — "minimal premium" design tokens (plan Appendix A).
// Warm, restrained palette; soft shapes; calm contrast. Shared by the Pixi
// board; the React shell mirrors these as CSS variables in ui/styles.css.

export const theme = {
  color: {
    bg: 0x17120f, // deep warm near-black (board backdrop)
    boardPanel: 0x211a16, // subtle panel under the grid
    apple: 0xe5503b, // warm ripe red
    appleTop: 0xff7d68, // soft top highlight
    appleEdge: 0xa83320, // darker rim
    golden: 0xf2b33a, // golden apple (augment)
    goldenTop: 0xffd97a,
    goldenEdge: 0xc6871a,
    wild: 0x8a7dff, // wild apple (augment) — matches any value
    wildTop: 0xb9b1ff,
    wildEdge: 0x5b4fd6,
    gem: 0x3fcfd5, // gem apple (augment) — big flat bonus
    gemTop: 0x9af0f3,
    gemEdge: 0x1f9aa0,
    bomb: 0x4a4a52, // bomb apple (augment) — bonus on clear
    bombTop: 0x7c7c86,
    bombEdge: 0x26262b,
    leaf: 0x6fae5a,
    text: 0xfff6ee, // cream numerals
    selStroke: 0x9defb0, // valid selection outline
    selFill: 0x66c98a, // valid selection wash
    selNeutralStroke: 0xf2e7da, // in-progress (not yet 10) outline
    particle: 0xffb483,
    particleAlt: 0xff8a5c,
  },
  ratio: {
    appleRadius: 0.4, // of cell
    highlightRadius: 0.16,
    selectionRadius: 0.12, // rounded corner of selection box (× cell)
    fontSize: 0.46, // of cell
  },
  font: '"Pretendard", ui-rounded, "SF Pro Rounded", "Segoe UI", system-ui, sans-serif',
} as const;

export type Theme = typeof theme;
