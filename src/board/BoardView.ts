// board/BoardView.ts — PixiJS v8 renderer for the apple grid (plan §4 #5).
// Owns no game logic: it renders a Board, a selection box, and clear particles.
import { Application, Container, Graphics, Text } from 'pixi.js';
import type { Board, Rect, CellTag } from '../contracts';
import { theme } from './theme';
import type { BoardLayout } from './layout';
import { cellRect, cellCenter } from './layout';

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
  private particles: Particle[] = [];
  private popups: Popup[] = [];

  private layout: BoardLayout | null = null;
  private board: Board | null = null;
  private mounted = false;

  constructor() {
    this.app = new Application();
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
    if (this.board) this.rebuild();
  }

  setLayout(layout: BoardLayout): void {
    this.layout = layout;
    if (!this.mounted) return;
    this.app.renderer.resize(layout.width, layout.height);
    this.rebuild();
  }

  setBoard(board: Board): void {
    const sizeChanged =
      !this.board || this.board.cols !== board.cols || this.board.rows !== board.rows;
    this.board = board;
    if (!this.mounted) return;
    if (sizeChanged || this.cells.length !== board.cells.length) this.rebuild();
    else this.refresh();
  }

  /** Draw the in-progress / valid selection box over the grid. */
  showSelection(rect: Rect | null, valid: boolean): void {
    const g = this.selLayer;
    g.clear();
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
    try {
      this.app.ticker.remove(this.onTick);
      this.app.destroy(true, { children: true });
    } catch {
      /* already torn down */
    }
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
    if (!this.board || !this.layout) return;
    const l = this.layout;
    const b = this.board;
    for (let i = 0; i < b.cells.length; i++) {
      const col = i % b.cols;
      const row = Math.floor(i / b.cols);
      const { cx, cy } = cellCenter(l, col, row);
      const cont = new Container();
      cont.position.set(cx, cy);

      const body = new Graphics();
      const label = new Text({
        text: String(b.cells[i] || ''),
        style: {
          fontFamily: theme.font,
          fontSize: Math.round(l.cell * theme.ratio.fontSize),
          fontWeight: '800',
          fill: theme.color.text,
          dropShadow: {
            color: theme.color.numShadow,
            alpha: 0.32,
            blur: 0,
            distance: 1,
            angle: Math.PI / 2,
          },
        },
      });
      label.anchor.set(0.5);
      label.position.set(0, l.cell * 0.02);
      this.drawApple(body, l.cell, b.tags?.[i] ?? 'normal');

      cont.addChild(body, label);
      cont.visible = b.cells[i] > 0;
      this.gridLayer.addChild(cont);
      this.cells.push(cont);
      this.bodies.push(body);
      this.labels.push(label);
    }
  }

  private refresh(): void {
    if (!this.board) return;
    for (let i = 0; i < this.cells.length; i++) {
      const v = this.board.cells[i];
      const c = this.cells[i];
      if (!c) continue;
      if (v <= 0) c.visible = false;
    }
  }

  /** Hide/show the numeric labels (time.lord: numbers vanish while dragging). */
  setLabelsHidden(hidden: boolean): void {
    for (const label of this.labels) label.visible = !hidden;
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
