// input/InputController.ts — pointer/touch drag -> grid Rect (plan §4 #6).
// Framework-free; maps canvas-local pixels to a grid rect via board/layout.
import type { Rect } from '../contracts';
import type { BoardLayout } from '../board/layout';
import { pointerToRect } from '../board/layout';

export interface DragHandlers {
  onStart(): void;
  onMove(rect: Rect | null): void;
  onEnd(rect: Rect | null): void;
}

export class InputController {
  private down = false;
  private ax = 0;
  private ay = 0;
  private pointerId = -1;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly getLayout: () => BoardLayout | null,
    private readonly handlers: DragHandlers,
  ) {}

  attach(): void {
    this.canvas.style.touchAction = 'none';
    this.canvas.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onUp);
  }

  detach(): void {
    this.canvas.removeEventListener('pointerdown', this.onDown);
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onUp);
    this.down = false;
  }

  private toLocal(clientX: number, clientY: number): { x: number; y: number } {
    const l = this.getLayout();
    const r = this.canvas.getBoundingClientRect();
    const sx = l && r.width ? l.width / r.width : 1;
    const sy = l && r.height ? l.height / r.height : 1;
    return { x: (clientX - r.left) * sx, y: (clientY - r.top) * sy };
  }

  private rect(curX: number, curY: number): Rect | null {
    const l = this.getLayout();
    if (!l) return null;
    const p = this.toLocal(curX, curY);
    return pointerToRect(l, this.ax, this.ay, p.x, p.y);
  }

  private onDown = (e: PointerEvent): void => {
    if (this.down) return;
    this.down = true;
    this.pointerId = e.pointerId;
    const p = this.toLocal(e.clientX, e.clientY);
    this.ax = p.x;
    this.ay = p.y;
    this.handlers.onStart();
    this.handlers.onMove(this.rect(e.clientX, e.clientY));
    e.preventDefault();
  };

  private onMove = (e: PointerEvent): void => {
    if (!this.down || e.pointerId !== this.pointerId) return;
    this.handlers.onMove(this.rect(e.clientX, e.clientY));
  };

  private onUp = (e: PointerEvent): void => {
    if (!this.down || e.pointerId !== this.pointerId) return;
    this.down = false;
    this.pointerId = -1;
    this.handlers.onEnd(this.rect(e.clientX, e.clientY));
  };
}
