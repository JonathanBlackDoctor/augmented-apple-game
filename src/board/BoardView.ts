// board/BoardView.ts — PixiJS v8 renderer for the apple grid (plan §4 #5).
// Owns no game logic: it renders a Board, a selection box, and clear particles.
import { Application, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import type { Board, Rect, CellTag } from '../contracts';
import { useGameStore } from '../app/store';
import { theme } from './theme';
import type { BoardLayout } from './layout';
import { cellRect, cellCenter } from './layout';
import { APPLE_TEX_PAD, type AppleLook, lookAt, numberColor, renderAppleCanvas } from './candyApple';
import { BoardFx } from './BoardFx';

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
  // Fraction of each cell left as empty margin around the apple body, so the
  // stem/leaf of one apple never overlaps the apple in the cell above. Subtle:
  // the apple still fills most of its cell, only a thin gap shows between them.
  private static readonly CELL_GAP = 0.12;

  readonly app: Application;
  private gridLayer = new Container();
  private selLayer = new Graphics();
  private fxLayer = new Container();

  private cells: Container[] = [];
  private bodies: Sprite[] = [];
  private cellTags: CellTag[] = [];
  private labels: Text[] = [];
  private badges: (Text | null)[] = [];
  private particles: Particle[] = [];
  private popups: Popup[] = [];

  // Shared candy-gloss apple textures, one per tag, regenerated when the
  // day-night look (or the cell size) changes. All cells of a tag share one.
  private texCache = new Map<CellTag, Texture>();
  private look: AppleLook = lookAt(0.16);
  private lookKey = -1;
  private texCell = 0;

  private layout: BoardLayout | null = null;
  private board: Board | null = null;
  private mounted = false;
  // Set once the Quicksand webfont is confirmed loaded (or unavailable), after
  // which all numerals rasterize in the same font. See syncWebFont().
  private fontSynced = false;

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
      this.fx.setCell(layout.cell);
    }
    this.syncWebFont();
    if (this.board) this.rebuild();
  }

  // PixiJS Text bakes its glyphs into a texture the moment it is created, using
  // whatever font is resolvable *then*. If the board is built before the
  // Quicksand webfont finishes downloading, those labels bake the fallback font
  // and Pixi never re-rasterizes them on its own — so a single board can show a
  // mix of fonts (only labels whose text later changes pick Quicksand up). We
  // wait for Quicksand (weight 600 — the weight index.html actually loads) and
  // rebuild once it is ready so every numeral re-renders in the same font.
  private syncWebFont(): void {
    if (this.fontSynced) return;
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
    if (!fonts || fonts.check('600 16px Quicksand')) {
      this.fontSynced = true;
      return;
    }
    void fonts
      .load('600 16px Quicksand')
      .catch(() => undefined)
      .then(() => {
        this.fontSynced = true;
        if (this.mounted && this.board && this.layout) this.rebuild();
      });
  }

  setLayout(layout: BoardLayout): void {
    this.layout = layout;
    if (!this.mounted) return;
    this.app.renderer.resize(layout.width, layout.height);
    this.rebuild();
    this.fx?.sync();
    this.fx?.setCell(layout.cell);
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
    for (const tex of this.texCache.values()) {
      try {
        tex.destroy(true);
      } catch {
        /* already gone */
      }
    }
    this.texCache.clear();
  }

  // ---- internals ------------------------------------------------------------

  private onTick = (): void => {
    this.updateLook();
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
    this.cellTags = [];
    this.labels = [];
    this.badges = [];
    if (!this.board || !this.layout) return;
    const l = this.layout;
    const b = this.board;
    this.ensureTextures(l.cell, true);
    for (let i = 0; i < b.cells.length; i++) {
      const col = i % b.cols;
      const row = Math.floor(i / b.cols);
      const { cx, cy } = cellCenter(l, col, row);
      const cont = new Container();
      cont.position.set(cx, cy);

      const tag = b.tags?.[i] ?? 'normal';
      const body = new Sprite(this.texCache.get(tag));
      this.sizeBody(body, l.cell);

      const label = this.makeLabel(this.labelFor(b.cells[i], tag), l.cell, tag);

      cont.addChild(body, label);
      const badge = this.makeBadge(tag, l.cell);
      if (badge) cont.addChild(badge);
      cont.visible = b.cells[i] > 0;
      this.gridLayer.addChild(cont);
      this.cells.push(cont);
      this.bodies.push(body);
      this.cellTags.push(tag);
      this.labels.push(label);
      this.badges.push(badge);
    }
  }

  // Size + anchor an apple body sprite. The texture is taller than the cell
  // (APPLE_TEX_PAD) so the stem/leaf can poke above the body without being
  // clipped; we scale it uniformly to the cell and anchor it so the circular
  // BODY (not the padded texture) is centred on the cell. The extra height
  // overflows upward, exactly like the CSS apple's negative-top decorations.
  //
  // We draw the body a hair smaller than the cell (CELL_GAP) so a thin margin
  // sits on every side. Without it, apples are packed edge-to-edge and a lower
  // apple's stem/leaf — which overflows upward — collides with the body of the
  // apple directly above. The margin lets those decorations breathe instead.
  private sizeBody(body: Sprite, cell: number): void {
    const ratio = 1 + APPLE_TEX_PAD.top + APPLE_TEX_PAD.bottom;
    const draw = cell * (1 - BoardView.CELL_GAP);
    body.anchor.set(0.5, (APPLE_TEX_PAD.top + 0.5) / ratio);
    body.width = draw;
    body.height = draw * ratio;
  }

  // Quicksand cream numeral, coloured per the candy-gloss variant (apple-spec
  // > typography). Kept as a crisp Pixi Text so it never re-renders with the look.
  private makeLabel(text: string, cell: number, tag: CellTag): Text {
    const label = new Text({
      text,
      style: {
        fontFamily: `Quicksand, ${theme.font}`,
        fontSize: Math.round(cell * 0.47),
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
    label.position.set(0, cell * 0.02);
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
        label.text = this.labelFor(v, tag);
        if (tag !== this.cellTags[i]) label.style.fill = numberColor(tag);
      }
      const body = this.bodies[i];
      if (body && tag !== this.cellTags[i]) body.texture = this.texCache.get(tag) ?? body.texture;
      this.reconcileBadge(i, tag, cell);
      this.cellTags[i] = tag;
    }
  }

  // ---- special-apple readability + FX geometry ------------------------------

  /** Wild apples read as ★ (matches any value); others show their number. */
  private labelFor(value: number, tag: CellTag): string {
    if (value <= 0) return '';
    return tag === 'wild' ? '★' : String(value);
  }

  private badgeSpec(tag: CellTag): { text: string; color: number } | null {
    if (tag === 'golden') return { text: '×2', color: theme.color.goldenEdge };
    if (tag === 'gem') return { text: '+20', color: theme.color.gemEdge };
    return null;
  }

  // A small corner badge on score apples (×2 / +20). Skipped on dense boards
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

  /** Pixel center of a cell within the canvas/overlay box (for the FX overlay). */
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
      if (sizeChanged) this.sizeBody(body, cell);
    }
  }
}
