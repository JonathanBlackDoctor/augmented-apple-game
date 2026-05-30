// board/BoardView.ts — PixiJS v8 renderer for the apple grid (plan §4 #5).
// Owns no game logic: it renders a Board, a selection box, and clear particles.
import { Application, Container, Graphics, Text } from 'pixi.js';
import type { Board, Rect, CellTag } from '../contracts';
import { theme } from './theme';
import type { BoardLayout } from './layout';
import { cellRect, cellCenter } from './layout';
import { BoardFx } from './BoardFx';

interface Particle {
  g: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  r: number;
}

interface Popup {
  t: Text;
  x: number;
  y: number;
  life: number; // 1 → 0
  max: number; // ms
}

export class BoardView {
  readonly app: Application;
  private gridLayer = new Container();
  private selLayer = new Graphics();
  private fxLayer = new Container();

  private cells: Container[] = [];
  private bodies: Graphics[] = [];
  private labels: Text[] = [];
  private badges: (Text | null)[] = [];
  private particles: Particle[] = [];
  private popups: Popup[] = [];

  private layout: BoardLayout | null = null;
  private board: Board | null = null;
  private mounted = false;

  // DOM effect overlay (augment activation / clear FX, running-sum bubble).
  // Disabled for the tiny AI mini-view (`new BoardView({ fx: false })`).
  private fx: BoardFx | null = null;
  private readonly fxEnabled: boolean;

  constructor(opts?: { fx?: boolean }) {
    this.app = new Application();
    this.fxEnabled = opts?.fx !== false;
  }

  /** The DOM FX overlay, or null on the FX-disabled mini-view. */
  get effects(): BoardFx | null {
    return this.fx;
  }

  async mount(parent: HTMLElement, layout: BoardLayout): Promise<void> {
    this.layout = layout;
    await this.app.init({
      width: layout.width,
      height: layout.height,
      // Transparent so the live day→night orchard sky shows through behind the grid.
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });
    parent.appendChild(this.app.canvas);
    this.app.stage.addChild(this.gridLayer, this.selLayer, this.fxLayer);
    this.app.ticker.add(this.onTick);
    this.mounted = true;
    if (this.fxEnabled) {
      this.fx = new BoardFx();
      this.fx.mount(parent, this.app.canvas);
    }
    if (this.board) this.rebuild();
  }

  setLayout(layout: BoardLayout): void {
    this.layout = layout;
    if (!this.mounted) return;
    this.app.renderer.resize(layout.width, layout.height);
    this.rebuild();
    this.fx?.sync();
  }

  setBoard(board: Board): void {
    const sizeChanged =
      !this.board || this.board.cols !== board.cols || this.board.rows !== board.rows;
    this.board = board;
    if (!this.mounted) return;
    if (sizeChanged || this.cells.length !== board.cells.length) this.rebuild();
    else this.refresh();
  }

  /** Draw the in-progress / valid selection box over the grid. When `sum` is
   *  given, also float a running-sum bubble above the selection (honey while
   *  in progress, green when it's a valid clear). */
  showSelection(rect: Rect | null, valid: boolean, sum?: number): void {
    const g = this.selLayer;
    g.clear();
    if (this.fx) {
      if (rect && this.layout && sum != null) {
        const l = this.layout;
        const x0 = Math.min(rect.x0, rect.x1);
        const x1 = Math.max(rect.x0, rect.x1);
        const y0 = Math.min(rect.y0, rect.y1);
        const cx = l.originX + ((x0 + x1 + 1) / 2) * l.cell;
        const topY = l.originY + y0 * l.cell;
        this.fx.sumBubble(cx, topY, String(sum), valid);
      } else {
        this.fx.hideSum();
      }
    }
    if (!rect || !this.layout) return;
    const l = this.layout;
    const a = cellRect(l, Math.min(rect.x0, rect.x1), Math.min(rect.y0, rect.y1));
    const x1 = Math.max(rect.x0, rect.x1);
    const y1 = Math.max(rect.y0, rect.y1);
    const w = (x1 - Math.min(rect.x0, rect.x1) + 1) * l.cell;
    const h = (y1 - Math.min(rect.y0, rect.y1) + 1) * l.cell;
    const radius = l.cell * theme.ratio.selectionRadius;
    if (valid) {
      // Most important positive feedback: orchard-green fill + glowing ring.
      g.roundRect(a.x - 3, a.y - 3, w + 6, h + 6, radius + 3).stroke({
        color: theme.color.selStroke,
        width: 6,
        alpha: 0.28,
      });
      g.roundRect(a.x, a.y, w, h, radius)
        .fill({ color: theme.color.selFill, alpha: 0.18 })
        .stroke({ color: theme.color.selStroke, width: 3, alpha: 0.95 });
    } else {
      // In-progress (sum ≠ target): restrained neutral ink box.
      g.roundRect(a.x, a.y, w, h, radius)
        .fill({ color: theme.color.selNeutralStroke, alpha: 0.05 })
        .stroke({ color: theme.color.selNeutralStroke, width: 2, alpha: 0.4 });
    }
  }

  /** Emit a satisfying burst at each cleared cell, then hide them. */
  burst(cellIndices: number[]): void {
    if (!this.layout || !this.board) return;
    const l = this.layout;
    for (const idx of cellIndices) {
      const col = idx % this.board.cols;
      const row = Math.floor(idx / this.board.cols);
      const { cx, cy } = cellCenter(l, col, row);
      const n = 5 + Math.floor(Math.random() * 3);
      for (let k = 0; k < n; k++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = (0.04 + Math.random() * 0.12) * l.cell;
        const r = l.cell * (0.06 + Math.random() * 0.08);
        const g = new Graphics();
        g.circle(0, 0, r).fill(k % 2 ? theme.color.particleAlt : theme.color.particle);
        g.position.set(cx, cy);
        this.fxLayer.addChild(g);
        this.particles.push({
          g,
          x: cx,
          y: cy,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 0.05 * l.cell,
          life: 1,
          max: 380 + Math.random() * 220,
          r,
        });
      }
      const c = this.cells[idx];
      if (c) c.visible = false;
    }
  }

  /** Float a "+N" score popup at the centroid of the cleared cells. */
  scorePopup(cellIndices: number[], value: number): void {
    if (!this.layout || !this.board || cellIndices.length === 0 || value <= 0) return;
    const l = this.layout;
    let sx = 0;
    let sy = 0;
    for (const idx of cellIndices) {
      const col = idx % this.board.cols;
      const row = Math.floor(idx / this.board.cols);
      const { cx, cy } = cellCenter(l, col, row);
      sx += cx;
      sy += cy;
    }
    const cx = sx / cellIndices.length;
    const cy = sy / cellIndices.length;
    const t = new Text({
      text: `+${value}`,
      style: {
        fontFamily: theme.font,
        fontSize: Math.round(l.cell * 0.7),
        fontWeight: '900',
        fill: theme.color.golden,
        stroke: { color: theme.color.numShadow, width: Math.max(2, l.cell * 0.06) },
      },
    });
    t.anchor.set(0.5);
    t.position.set(cx, cy);
    this.fxLayer.addChild(t);
    this.popups.push({ t, x: cx, y: cy, life: 1, max: 750 });
  }

  destroy(): void {
    this.mounted = false;
    this.fx?.destroy();
    this.fx = null;
    try {
      this.app.ticker.remove(this.onTick);
      this.app.destroy(true, { children: true });
    } catch {
      /* already torn down */
    }
  }

  // ---- FX overlay geometry (cell index -> canvas px, for the conductor) ------

  /** Pixel center of a cell within the canvas/overlay box. */
  cellCenterPx(idx: number): { x: number; y: number } | null {
    if (!this.layout || !this.board) return null;
    const col = idx % this.board.cols;
    const row = Math.floor(idx / this.board.cols);
    const { cx, cy } = cellCenter(this.layout, col, row);
    return { x: cx, y: cy };
  }

  /** Pixel centroid of a set of cells (e.g. a clear). */
  centroidPx(indices: number[]): { x: number; y: number } | null {
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (const i of indices) {
      const p = this.cellCenterPx(i);
      if (p) {
        sx += p.x;
        sy += p.y;
        n++;
      }
    }
    return n ? { x: sx / n, y: sy / n } : null;
  }

  /** Pixel center of the whole grid (anchor for activation flourishes). */
  boardCenterPx(): { x: number; y: number } | null {
    const l = this.layout;
    if (!l) return null;
    return { x: l.originX + (l.cols * l.cell) / 2, y: l.originY + (l.rows * l.cell) / 2 };
  }

  /** Live cell indices currently carrying `tag` (for round-start spawn FX). */
  cellsWithTag(tag: CellTag): number[] {
    const tags = this.board?.tags;
    const b = this.board;
    if (!tags || !b) return [];
    const out: number[] = [];
    for (let i = 0; i < tags.length; i++) if (tags[i] === tag && (b.cells[i] || 0) > 0) out.push(i);
    return out;
  }

  /** Clear transient FX + state classes (between rounds / on reset). */
  resetFx(): void {
    this.fx?.reset();
  }

  // ---- internals ------------------------------------------------------------

  private onTick = (): void => {
    const dt = this.app.ticker.deltaMS;
    if (this.particles.length > 0) {
      const next: Particle[] = [];
      for (const p of this.particles) {
        p.life -= dt / p.max;
        if (p.life <= 0) {
          p.g.destroy();
          continue;
        }
        p.x += p.vx * (dt / 16.67);
        p.y += p.vy * (dt / 16.67);
        p.vy += 0.012 * (this.layout?.cell ?? 30) * (dt / 16.67); // gravity
        p.g.position.set(p.x, p.y);
        p.g.alpha = Math.max(0, p.life);
        p.g.scale.set(0.6 + p.life * 0.4);
        next.push(p);
      }
      this.particles = next;
    }
    if (this.popups.length > 0) {
      const cell = this.layout?.cell ?? 30;
      const next: Popup[] = [];
      for (const p of this.popups) {
        p.life -= dt / p.max;
        if (p.life <= 0) {
          p.t.destroy();
          continue;
        }
        p.y -= 0.03 * cell * (dt / 16.67); // drift upward
        p.t.position.set(p.x, p.y);
        p.t.alpha = Math.min(1, p.life * 1.6); // hold, then fade out
        p.t.scale.set(0.7 + (1 - p.life) * 0.4);
        next.push(p);
      }
      this.popups = next;
    }
  };

  private rebuild(): void {
    this.gridLayer.removeChildren();
    this.cells = [];
    this.bodies = [];
    this.labels = [];
    this.badges = [];
    if (!this.board || !this.layout) return;
    const l = this.layout;
    const b = this.board;
    for (let i = 0; i < b.cells.length; i++) {
      const col = i % b.cols;
      const row = Math.floor(i / b.cols);
      const { cx, cy } = cellCenter(l, col, row);
      const cont = new Container();
      cont.position.set(cx, cy);
      const tag = b.tags?.[i] ?? 'normal';

      const body = new Graphics();
      const label = new Text({
        text: this.labelFor(b.cells[i], tag),
        style: {
          fontFamily: theme.font,
          fontSize: Math.round(l.cell * theme.ratio.fontSize),
          fontWeight: '800',
          fill: theme.color.text,
          dropShadow: {
            color: theme.color.numShadow,
            alpha: 0.5,
            blur: 0,
            distance: 2,
            angle: Math.PI / 2,
          },
        },
      });
      label.anchor.set(0.5);
      label.position.set(0, l.cell * 0.02);
      this.drawApple(body, l.cell, tag);

      cont.addChild(body, label);
      const badge = this.makeBadge(tag, l.cell);
      if (badge) cont.addChild(badge);
      cont.visible = b.cells[i] > 0;
      this.gridLayer.addChild(cont);
      this.cells.push(cont);
      this.bodies.push(body);
      this.labels.push(label);
      this.badges.push(badge);
    }
  }

  // Reconcile every cell to the current board: visibility, number and apple
  // style. Works for both in-round clears (cells -> empty) and a brand-new
  // board of the same size (e.g. the next round, or the AI's mirrored board),
  // where cells must be re-shown and their numbers refreshed.
  private refresh(): void {
    if (!this.board || !this.layout) return;
    const b = this.board;
    const cell = this.layout.cell;
    for (let i = 0; i < this.cells.length; i++) {
      const c = this.cells[i];
      if (!c) continue;
      const v = b.cells[i];
      c.visible = v > 0;
      if (v <= 0) continue;
      const tag = b.tags?.[i] ?? 'normal';
      const label = this.labels[i];
      if (label) label.text = this.labelFor(v, tag);
      const body = this.bodies[i];
      if (body) this.drawApple(body, cell, tag);
      this.reconcileBadge(i, tag, cell);
    }
  }

  /** Hide/show the numeric labels (time.lord: numbers vanish while dragging). */
  setLabelsHidden(hidden: boolean): void {
    for (const label of this.labels) label.visible = !hidden;
  }

  // ---- special-apple readability (showcase board refinements) ---------------

  /** Wild apples read as ★ (matches any value); others show their number. */
  private labelFor(value: number, tag: CellTag): string {
    if (value <= 0) return '';
    return tag === 'wild' ? '★' : String(value);
  }

  private badgeSpec(tag: CellTag): { text: string; color: number } | null {
    if (tag === 'golden') return { text: '×2', color: theme.color.goldenEdge };
    if (tag === 'gem') return { text: '+15', color: theme.color.gemEdge };
    return null;
  }

  // A small corner badge on score apples (×2 / +15). Skipped on dense boards
  // (tiny cells) where colour already distinguishes them and text would clutter.
  private makeBadge(tag: CellTag, cell: number): Text | null {
    if (cell < 30) return null;
    const spec = this.badgeSpec(tag);
    if (!spec) return null;
    const t = new Text({
      text: spec.text,
      style: {
        fontFamily: theme.font,
        fontSize: Math.max(8, Math.round(cell * 0.26)),
        fontWeight: '800',
        fill: 0xffffff,
        stroke: { color: spec.color, width: Math.max(2, cell * 0.05) },
      },
    });
    t.anchor.set(0.5);
    t.position.set(cell * 0.27, cell * 0.3);
    return t;
  }

  private reconcileBadge(i: number, tag: CellTag, cell: number): void {
    const want = cell >= 30 ? this.badgeSpec(tag) : null;
    const cur = this.badges[i];
    if (want) {
      if (cur) cur.text = want.text;
      else {
        const nb = this.makeBadge(tag, cell);
        if (nb) {
          this.cells[i]?.addChild(nb);
          this.badges[i] = nb;
        }
      }
    } else if (cur) {
      cur.destroy();
      this.badges[i] = null;
    }
  }

  // Plump apple silhouette from the design 시안 (viewBox 0..100), centered at
  // the origin and scaled to the cell. Subtle stem dimple at the top.
  private traceApple(g: Graphics, size: number): void {
    const m = (u: number, v: number): [number, number] => [
      ((u - 50) / 100) * size,
      ((v - 50) / 100) * size,
    ];
    const p0 = m(44, 15);
    g.moveTo(p0[0], p0[1]);
    const c = (
      x1: number, y1: number, x2: number, y2: number, x: number, y: number,
    ): void => {
      const a = m(x1, y1), b = m(x2, y2), e = m(x, y);
      g.bezierCurveTo(a[0], a[1], b[0], b[1], e[0], e[1]);
    };
    c(47, 18, 53, 18, 56, 15);
    c(67, 11, 90, 24, 90, 50);
    c(90, 73, 72, 89, 50, 89);
    c(28, 89, 10, 73, 10, 50);
    c(10, 24, 33, 11, 44, 15);
    g.closePath();
  }

  private drawApple(g: Graphics, cell: number, tag: CellTag): void {
    g.clear();
    const rad = cell * theme.ratio.appleRadius;
    const size = cell * 0.96; // silhouette box edge
    const palette: Record<CellTag, { base: number; edge: number; top: number }> = {
      normal: { base: theme.color.apple, edge: theme.color.appleEdge, top: theme.color.appleTop },
      golden: { base: theme.color.golden, edge: theme.color.goldenEdge, top: theme.color.goldenTop },
      gem: { base: theme.color.gem, edge: theme.color.gemEdge, top: theme.color.gemTop },
      bomb: { base: theme.color.bomb, edge: theme.color.bombEdge, top: theme.color.bombTop },
      wild: { base: theme.color.wild, edge: theme.color.wildEdge, top: theme.color.wildTop },
    };
    const { base, edge, top } = palette[tag] ?? palette.normal;
    // body
    this.traceApple(g, size);
    g.fill(base).stroke({ color: edge, width: Math.max(1, cell * 0.025), alpha: 0.45 });
    // bottom shading for satin depth
    g.ellipse(0, rad * 0.46, rad * 0.66, rad * 0.5).fill({ color: edge, alpha: 0.22 });
    // soft satin top highlight
    g.ellipse(-rad * 0.16, -rad * 0.4, rad * 0.52, rad * 0.44).fill({ color: top, alpha: 0.6 });
    // bright gloss
    g.ellipse(-rad * 0.2, -rad * 0.46, rad * 0.26, rad * 0.2).fill({ color: 0xfffaf2, alpha: 0.5 });

    // stem (tilted) — a short thick warm-brown line at the dimple
    g.moveTo(0, -rad * 0.9)
      .lineTo(rad * 0.13, -rad * 1.16)
      .stroke({ color: 0x7a4a2a, width: Math.max(1, cell * 0.06), cap: 'round' });

    // leaf — a rotated petal ellipse beside the stem
    const lcx = rad * 0.34;
    const lcy = -rad * 1.0;
    const lw = rad * 0.42;
    const lh = rad * 0.2;
    const rot = -0.52; // ≈ -30°
    const cos = Math.cos(rot), sin = Math.sin(rot);
    const pts: number[] = [];
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const ex = Math.cos(a) * lw;
      const ey = Math.sin(a) * lh;
      pts.push(lcx + ex * cos - ey * sin, lcy + ex * sin + ey * cos);
    }
    g.poly(pts).fill({ color: theme.color.leaf });
  }
}
