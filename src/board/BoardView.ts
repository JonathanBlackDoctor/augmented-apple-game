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

export class BoardView {
  readonly app: Application;
  private gridLayer = new Container();
  private selLayer = new Graphics();
  private fxLayer = new Container();

  private cells: Container[] = [];
  private bodies: Graphics[] = [];
  private labels: Text[] = [];
  private particles: Particle[] = [];

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
      background: theme.color.bg,
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
    g.roundRect(a.x, a.y, w, h, radius)
      .fill({ color: valid ? theme.color.selFill : theme.color.selNeutralStroke, alpha: valid ? 0.28 : 0.1 })
      .stroke({ color: valid ? theme.color.selStroke : theme.color.selNeutralStroke, width: valid ? 3 : 2, alpha: valid ? 0.95 : 0.55 });
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
    if (this.particles.length === 0) return;
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
          fontWeight: '700',
          fill: theme.color.text,
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

  private drawApple(g: Graphics, cell: number, tag: CellTag): void {
    g.clear();
    const rad = cell * theme.ratio.appleRadius;
    const palette: Record<CellTag, { base: number; edge: number; top: number }> = {
      normal: { base: theme.color.apple, edge: theme.color.appleEdge, top: theme.color.appleTop },
      golden: { base: theme.color.golden, edge: theme.color.goldenEdge, top: theme.color.goldenTop },
      gem: { base: theme.color.gem, edge: theme.color.gemEdge, top: theme.color.gemTop },
      bomb: { base: theme.color.bomb, edge: theme.color.bombEdge, top: theme.color.bombTop },
      wild: { base: theme.color.wild, edge: theme.color.wildEdge, top: theme.color.wildTop },
    };
    const { base, edge, top } = palette[tag] ?? palette.normal;
    // body
    g.circle(0, 0, rad).fill(base).stroke({ color: edge, width: Math.max(1, cell * 0.03), alpha: 0.6 });
    // soft top highlight
    g.circle(-rad * 0.3, -rad * 0.34, cell * theme.ratio.highlightRadius)
      .fill({ color: top, alpha: 0.55 });
    // tiny leaf stem
    g.ellipse(rad * 0.18, -rad * 0.92, rad * 0.22, rad * 0.12).fill({ color: theme.color.leaf, alpha: 0.9 });
  }
}
