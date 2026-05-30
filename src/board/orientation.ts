// board/orientation.ts — choose a board aspect that maximizes apple size for
// the current viewport. The grid keeps the same cell count either way; on a
// portrait phone we use the tall layout so the wide 17-column grid isn't
// squeezed into the narrow width (which shrinks cells to ~22px). Swapping to
// 10×17 there yields ~37px cells instead.
export interface GridDims {
  cols: number;
  rows: number;
}

const WIDE: GridDims = { cols: 17, rows: 10 };

/** Pick {cols,rows} for the current viewport. Portrait → tall (swapped). */
export function pickGridDims(wide: GridDims = WIDE): GridDims {
  const portrait =
    typeof window !== 'undefined' && window.innerHeight > window.innerWidth;
  return portrait ? { cols: wide.rows, rows: wide.cols } : { ...wide };
}
