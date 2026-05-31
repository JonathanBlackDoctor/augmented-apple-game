// board/BoardView.ts — PixiJS v8 renderer for the apple grid (plan §4 #5).
// Owns no game logic: it renders a Board, a selection box, and clear particles.
import { Application, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import type { Board, Rect, CellTag } from '../contracts';
import { useGameStore } from '../app/store';
import { theme } from './theme';
import type { BoardLayout } from './layout';
import { cellRect, cellCenter } from './layout';
import {
  type AppleLook,
  LEAF_ANCHOR,
  lookAt,
  numberColor,
  renderAppleCanvas,
  renderLeafCanvas,
} from './candyApple';

const APPLE_TAGS: CellTag[] = ['normal', 'golden', 'gem', 'bomb', 'wild'];

// Round the day-night progress into ~48 steps so the shared candy-gloss look is
// only re-rendered when it visibly changes (textures are shared across cells).
const LOOK_STEPS = 48;

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
  private bodies: Sprite[] = [];
  private leaves: (Sprite | undefined)[] = [];
  private cellTags: CellTag[] = [];
  private labels: Text[] = [];
  private particles: Particle[] = [];
  private popups: Popup[] = [];

  // Shared candy-gloss apple textures, one per tag, regenerated when the
  // day-night look (or the cell size) changes. All cells of a tag share one.
  private texCache = new Map<CellTag, Texture>();
  // Leaf textures are split out of the body so each leaf can sway on its own.
  // They depend only on cell size (not the day-night look), so they are rebuilt
  // far less often than the bodies.
  private leafTexCache = new Map<CellTag, Texture>();
  // Per-cell wind phase/speed so every leaf flutters individually, plus a clock.
  private leafPhase: number[] = [];
  private leafSpeed: number[] = [];
  private windMs = 0;
  private look: AppleLook = lookAt(0.16);
  private lookKey = -1;
  private texCell = 0;

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
    for (const tex of this.texCache.values()) {
      try {
        tex.destroy(true);
      } catch {
        /* already gone */
      }
    }
    this.texCache.clear();
    for (const tex of this.leafTexCache.values()) {
      try {
        tex.destroy(true);
      } catch {
        /* already gone */
      }
    }
    this.leafTexCache.clear();
  }

  // ---- internals ------------------------------------------------------------

  private onTick = (): void => {
    this.updateLook();
    const dt = this.app.ticker.deltaMS;
    this.animateLeaves(dt);
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

  // Gentle individual leaf sway. Each leaf pivots at its base with its own phase
  // and a small speed offset; a slow shared "gust" swells the amplitude so the
  // whole orchard breathes together without ever moving in lockstep.
  private animateLeaves(dt: number): void {
    if (this.leaves.length === 0) return;
    this.windMs += dt;
    const w = this.windMs / 1000;
    const gust = 0.72 + 0.4 * Math.sin(w * 0.45); // slow wind swell
    const amp = 0.12 * gust; // ~7° base, breathing a little above/below
    for (let i = 0; i < this.leaves.length; i++) {
      const leaf = this.leaves[i];
      if (!leaf) continue;
      const sp = this.leafSpeed[i];
      const ph = this.leafPhase[i];
      // primary sway + a small faster harmonic for a livelier, organic flutter
      leaf.rotation = amp * Math.sin(w * 1.7 * sp + ph) + amp * 0.32 * Math.sin(w * 3.3 * sp + ph * 1.7);
    }
  }

  private rebuild(): void {
    this.gridLayer.removeChildren();
    this.cells = [];
    this.bodies = [];
    this.leaves = [];
    this.leafPhase = [];
    this.leafSpeed = [];
    this.cellTags = [];
    this.labels = [];
    if (!this.board || !this.layout) return;
    const l = this.layout;
    const b = this.board;
    this.ensureTextures(l.cell, true);
    const showLeaf = l.cell > 24; // matches apple-spec LOD (hide deco on tiny cells)
    for (let i = 0; i < b.cells.length; i++) {
      const col = i % b.cols;
      const row = Math.floor(i / b.cols);
      const { cx, cy } = cellCenter(l, col, row);
      const cont = new Container();
      cont.position.set(cx, cy);

      const tag = b.tags?.[i] ?? 'normal';
      const body = new Sprite(this.texCache.get(tag));
      body.anchor.set(0.5);
      body.setSize(l.cell);

      // Leaf is its own sprite (behind the body, so its base stays tucked under
      // the apple) pivoting at LEAF_ANCHOR so the tip can sway in the wind.
      let leaf: Sprite | undefined;
      if (showLeaf) {
        leaf = new Sprite(this.leafTexCache.get(tag));
        leaf.anchor.set(LEAF_ANCHOR.x, LEAF_ANCHOR.y);
        leaf.setSize(l.cell);
        leaf.position.set((LEAF_ANCHOR.x - 0.5) * l.cell, (LEAF_ANCHOR.y - 0.5) * l.cell);
      }

      const label = this.makeLabel(String(b.cells[i] || ''), l.cell, tag);

      if (leaf) cont.addChild(leaf, body, label);
      else cont.addChild(body, label);
      cont.visible = b.cells[i] > 0;
      this.gridLayer.addChild(cont);
      this.cells.push(cont);
      this.bodies.push(body);
      this.leaves.push(leaf);
      // Random phase + slight speed variance → no two leaves move in lockstep.
      this.leafPhase.push(Math.random() * Math.PI * 2);
      this.leafSpeed.push(0.82 + Math.random() * 0.36);
      this.cellTags.push(tag);
      this.labels.push(label);
    }
  }

  // Quicksand cream numeral, coloured per the candy-gloss variant (apple-spec
  // > typography). Kept as a crisp Pixi Text so it never re-renders with the look.
  // Smaller (0.40) and nudged up to the apple's *optical* centre — the rounded
  // top reads heavier, so the geometric centre looks a touch low.
  private makeLabel(text: string, cell: number, tag: CellTag): Text {
    const ratio = cell > 24 ? 0.4 : 0.46;
    const label = new Text({
      text,
      style: {
        fontFamily: `Quicksand, ${theme.font}`,
        fontSize: Math.round(cell * ratio),
        fontWeight: '600',
        fill: numberColor(tag),
        dropShadow: {
          color: 0x781c0e, // rgba(120,28,14)
          alpha: 0.34,
          blur: 2,
          distance: 2,
          angle: Math.PI / 2,
        },
      },
    });
    label.anchor.set(0.5);
    label.position.set(0, -cell * 0.04);
    return label;
  }

  // Reconcile every cell to the current board: visibility, number and apple
  // style. Works for both in-round clears (cells -> empty) and a brand-new
  // board of the same size (e.g. the next round, or the AI's mirrored board),
  // where cells must be re-shown and their numbers refreshed.
  private refresh(): void {
    if (!this.board || !this.layout) return;
    const b = this.board;
    const cell = this.layout.cell;
    this.ensureTextures(cell);
    for (let i = 0; i < this.cells.length; i++) {
      const c = this.cells[i];
      if (!c) continue;
      const v = b.cells[i];
      c.visible = v > 0;
      if (v <= 0) continue;
      const tag = b.tags?.[i] ?? 'normal';
      const label = this.labels[i];
      if (label) {
        label.text = String(v);
        if (tag !== this.cellTags[i]) label.style.fill = numberColor(tag);
      }
      const body = this.bodies[i];
      if (body && tag !== this.cellTags[i]) body.texture = this.texCache.get(tag) ?? body.texture;
      const leaf = this.leaves[i];
      if (leaf && tag !== this.cellTags[i]) leaf.texture = this.leafTexCache.get(tag) ?? leaf.texture;
      this.cellTags[i] = tag;
    }
  }

  /** Hide/show the numeric labels (time.lord: numbers vanish while dragging). */
  setLabelsHidden(hidden: boolean): void {
    for (const label of this.labels) label.visible = !hidden;
  }

  // ---- day-night candy-gloss look -------------------------------------------

  /** Set the shared candy-gloss look directly from a progress t∈[0,1]. */
  setLook(t: number): void {
    const key = Math.round((Math.max(0, Math.min(1, t)) || 0) * LOOK_STEPS);
    if (key === this.lookKey) return;
    this.lookKey = key;
    this.look = lookAt(key / LOOK_STEPS);
    if (this.texCell > 0) this.ensureTextures(this.texCell, true);
  }

  // Derive the day-night progress from the live round clock (so apples darken
  // toward night across a match, matching the orchard sky), then refresh the
  // shared look. Mirrors the per-frame phase that DayNightSky reads.
  private updateLook(): void {
    const st = useGameStore.getState();
    let t = 0.16; // gentle late-morning default (home / non-round screens)
    if (st.phase === 'round' || st.phase === 'augment') {
      const n = Math.max(1, st.totalRounds);
      const elapsed = st.durationMs > 0 ? 1 - st.remainingMs / st.durationMs : 0;
      t = (st.roundIndex + Math.max(0, Math.min(1, elapsed))) / n; // 0 → 1 over the match
    }
    this.setLook(t);
  }

  // (Re)build the shared per-tag textures at the current look + cell size, and
  // hand the fresh texture to every live sprite so they all update at once.
  private ensureTextures(cell: number, force = false): void {
    if (cell <= 0) return;
    if (!force && cell === this.texCell) return;
    const sizeChanged = cell !== this.texCell;
    this.texCell = cell;
    for (const tag of APPLE_TAGS) {
      const canvas = renderAppleCanvas({ size: cell, look: this.look, variant: tag });
      const tex = Texture.from(canvas);
      const old = this.texCache.get(tag);
      this.texCache.set(tag, tex);
      old?.destroy(true);
    }
    for (let i = 0; i < this.bodies.length; i++) {
      const body = this.bodies[i];
      if (!body) continue;
      body.texture = this.texCache.get(this.cellTags[i]) ?? body.texture;
      if (sizeChanged) body.setSize(cell);
    }

    // Leaf textures don't depend on the day-night look — only rebuild them when
    // the cell size changes (or on first run), then re-fit/re-point every leaf.
    if (sizeChanged || this.leafTexCache.size === 0) {
      for (const tag of APPLE_TAGS) {
        const canvas = renderLeafCanvas({ size: cell, variant: tag });
        const tex = Texture.from(canvas);
        const old = this.leafTexCache.get(tag);
        this.leafTexCache.set(tag, tex);
        old?.destroy(true);
      }
      for (let i = 0; i < this.leaves.length; i++) {
        const leaf = this.leaves[i];
        if (!leaf) continue;
        leaf.texture = this.leafTexCache.get(this.cellTags[i]) ?? leaf.texture;
        leaf.setSize(cell);
        leaf.position.set((LEAF_ANCHOR.x - 0.5) * cell, (LEAF_ANCHOR.y - 0.5) * cell);
      }
    }
  }
}
