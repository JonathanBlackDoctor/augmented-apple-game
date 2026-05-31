// board/BoardFx.ts — DOM effect overlay sitting exactly over the Pixi board
// canvas. The pure core stays untouched: the conductor (Match/Versus/Online)
// calls these presentation-only helpers when augments activate or clears land.
//
// Ported from the design showcase ("증강 쇼케이스" in-game FX). All transient
// nodes self-remove on animationend AND on a hard timeout, so nothing leaks even
// when `prefers-reduced-motion` disables the animations (animationend wouldn't
// fire then). Kinetic effects are skipped under reduced-motion.

export interface FxTag {
  t: string;
  c: string;
}

type VigName = 'red' | 'prism' | 'green' | 'warm';

export class BoardFx {
  private canvas: HTMLElement | null = null;
  private overlay: HTMLDivElement | null = null;
  private vigs: Partial<Record<VigName, HTMLDivElement>> = {};
  private sumEl: HTMLDivElement | null = null;
  private reduce = false;
  private syncRaf = 0;
  private cellPx = 0;

  mount(host: HTMLElement, canvas: HTMLElement): void {
    this.canvas = canvas;
    const o = document.createElement('div');
    o.className = 'board-fx';
    for (const name of ['red', 'prism', 'green', 'warm'] as VigName[]) {
      const v = document.createElement('div');
      v.className = `bfx-vig ${name}`;
      o.appendChild(v);
      this.vigs[name] = v;
    }
    host.appendChild(o);
    this.overlay = o;
    if (this.cellPx > 0) o.style.setProperty('--bfx-cell', `${this.cellPx}px`);
    try {
      this.reduce =
        typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      this.reduce = false;
    }
    this.sync();
  }

  /** Match the overlay box to the (centered) canvas after mount/layout/resize. */
  sync(): void {
    cancelAnimationFrame(this.syncRaf);
    this.syncRaf = requestAnimationFrame(() => {
      const o = this.overlay;
      const c = this.canvas as HTMLElement | null;
      if (!o || !c) return;
      o.style.left = `${c.offsetLeft}px`;
      o.style.top = `${c.offsetTop}px`;
      o.style.width = `${c.offsetWidth}px`;
      o.style.height = `${c.offsetHeight}px`;
    });
  }

  /** Publish the current board cell size (px) so FX dimensions can scale to it
   *  via the `--bfx-cell` custom property — keeps the dice/ring/headline
   *  proportional from small phones to wide desktops. */
  setCell(px: number): void {
    this.cellPx = px;
    if (px > 0) this.overlay?.style.setProperty('--bfx-cell', `${px}px`);
  }

  /** Clear all transient FX + state classes (between rounds / on reset). */
  reset(): void {
    if (!this.overlay) return;
    for (const child of Array.from(this.overlay.children)) {
      if (!child.classList.contains('bfx-vig')) child.remove();
    }
    (Object.keys(this.vigs) as VigName[]).forEach((n) => this.vignette(n, false));
    this.sumEl = null;
    this.canvas?.classList.remove('bfx-shake', 'bfx-tilt', 'bfx-desat');
  }

  destroy(): void {
    cancelAnimationFrame(this.syncRaf);
    this.overlay?.remove();
    this.overlay = null;
    this.vigs = {};
    this.sumEl = null;
  }

  // ---- primitives -----------------------------------------------------------

  private node(cls: string, style: string, html?: string, life = 1600): HTMLDivElement | null {
    if (!this.overlay) return null;
    const d = document.createElement('div');
    d.className = cls;
    if (style) d.setAttribute('style', style);
    if (html != null) d.innerHTML = html;
    this.overlay.appendChild(d);
    let timer = 0;
    const kill = (): void => {
      clearTimeout(timer);
      d.removeEventListener('animationend', kill);
      d.remove();
    };
    d.addEventListener('animationend', kill);
    timer = window.setTimeout(kill, life);
    return d;
  }

  ring(x: number, y: number, c: string): void {
    if (this.reduce) return;
    this.node('bfx-ring', `left:${x}px;top:${y}px;--c:${c}`, undefined, 900);
  }

  popup(x: number, y: number, big: string, tags: FxTag[] | null, color: string): void {
    const t =
      tags && tags.length
        ? `<span class="bfx-tags">${tags
            .map((g) => `<span style="color:${g.c}">${g.t}</span>`)
            .join(' · ')}</span>`
        : '';
    this.node(
      'bfx-pop',
      `left:${x}px;top:${y}px;color:${color}`,
      `<span class="bfx-big">${big}</span>${t}`,
      1500,
    );
  }

  spark(x: number, y: number, c: string): void {
    this.node('bfx-spark', `left:${x}px;top:${y}px;--c:${c}`, '✦', 800);
  }

  particles(x: number, y: number, c: string, n = 14): void {
    if (this.reduce) return;
    for (let i = 0; i < n; i++) {
      const a = (360 / n) * i;
      const d = 46 + Math.random() * 42;
      this.node(
        'bfx-particle',
        `left:${x}px;top:${y}px;--c:${c};--dx:${(Math.cos((a * Math.PI) / 180) * d).toFixed(1)}px;` +
          `--dy:${(Math.sin((a * Math.PI) / 180) * d).toFixed(1)}px;animation-delay:${(Math.random() * 0.08).toFixed(3)}s`,
        undefined,
        900,
      );
    }
  }

  flash(): void {
    if (this.reduce) return;
    this.node('bfx-flash', '', undefined, 600);
  }

  stamp(x: number, y: number, text: string, bd: string, fg: string): void {
    this.node(
      'bfx-stamp',
      `left:${x}px;top:${y - 18}px;--bd:${bd};--fg:${fg}`,
      `${text} <span class="bfx-check">✓</span>`,
      1400,
    );
  }

  dice(x: number, y: number, text: string, color: string): void {
    if (this.reduce) {
      this.popup(x, y - 20, text, null, color);
      return;
    }
    const d = this.node('bfx-dice', `left:${x}px;top:${y}px`, '<span class="bfx-pip"></span>'.repeat(5), 1900);
    if (!d) return;
    window.setTimeout(() => {
      d.classList.add('settled');
      this.popup(x, y - 30, text, null, color);
    }, 1000);
  }

  timeFloat(text: string, color = '#3f7a32'): void {
    this.node('bfx-timefloat', `right:10px;top:6px;color:${color}`, text, 1500);
  }

  /** Persistent running-sum bubble above the live selection (re-used per drag).
   *  `ok` (green) means the selection is currently a valid clear; otherwise it
   *  stays neutral honey so an in-progress sum never reads as a hard error. */
  sumBubble(x: number, y: number, text: string, ok: boolean): void {
    if (!this.overlay) return;
    if (!this.sumEl || !this.sumEl.isConnected) {
      this.sumEl = document.createElement('div');
      this.overlay.appendChild(this.sumEl);
    }
    this.sumEl.className = `bfx-sum${ok ? ' ok' : ''}`;
    this.sumEl.style.cssText = `left:${x}px;top:${y}px`;
    this.sumEl.textContent = text;
  }

  hideSum(): void {
    this.sumEl?.remove();
    this.sumEl = null;
  }

  vignette(name: VigName, on: boolean): void {
    this.vigs[name]?.classList.toggle('on', on);
  }

  shake(): void {
    const c = this.canvas;
    if (!c || this.reduce) return;
    c.classList.remove('bfx-shake');
    void (c as HTMLElement).offsetWidth; // reflow to restart the animation
    c.classList.add('bfx-shake');
    window.setTimeout(() => c.classList.remove('bfx-shake'), 520);
  }

  tilt(): void {
    const c = this.canvas;
    if (!c || this.reduce) return;
    c.classList.add('bfx-tilt');
    window.setTimeout(() => c.classList.remove('bfx-tilt'), 650);
  }

  desat(on: boolean): void {
    this.canvas?.classList.toggle('bfx-desat', on);
  }
}
