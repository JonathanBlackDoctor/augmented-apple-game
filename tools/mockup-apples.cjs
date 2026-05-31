/* Mockup: keep the screenshot's green background + header, but repaint every
 * apple cell with the repo's confirmed "candy-gloss apple" design
 * (src/board/candyApple.ts, normal variant). Output a PNG to compare. */
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');

const SRC = '/root/.claude/uploads/35ea1937-f21f-4abc-8f84-adc7cae64288/cc33a4e1-31818.jpg';
const OUT = '/home/user/augmented-apple-game/tools/mockup-candy-apples.png';

// ── grid geometry measured from the screenshot (2x retina, 2340x1080) ──
const COLS = [331,429,527,625,722,820,918,1016,1114,1212,1309,1407,1505,1603,1701,1799,1896,1994];
const ROWS = [188,286,385,483,581,679,777,876,974];
const PITCH = 98;
const BG = '#d5dfc4'; // sampled background

// ── candyApple.ts port (normal variant, daytime look) ──
const APPLE = 'M45 14C48 17 52 17 55 14C68 9 91 23 91 51C91 74 73 90 50 90C27 90 9 74 9 51C9 23 32 9 45 14Z';
const clamp01 = (x) => Math.max(0, Math.min(1, x));

// soft-coral normal tone + a late-morning shared light look (lookAt(~0.16)).
const PAL = ['#e8705a', '#d4513a', '#9c3a2a'];
const AMB = [70, 16, 8];
const look = {
  hl: '#dbe4ea',      // mix(white, sky1, 0.6*0.72) at late morning
  amb: 0.22 + 0.35 * 0.5,        // depth term, star=0  => 0.395
  rim: { r: 255, g: 245, b: 220 },
  rim_a: clamp01(0.55 * (0.34 + 0.66 * 0.22)),
  shadow_a: 0.6 + 0.35 * 0.6,
};

function radialFill(ctx, cx, cy, rx, ry, stops) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(rx, ry);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.fillStyle = g;
  ctx.fillRect(-300, -300, 600, 600);
  ctx.restore();
}

function drawStemLeaf(ctx, s) {
  ctx.save();
  ctx.scale(s, s);
  // leaf
  ctx.save();
  ctx.translate(63, 10);
  ctx.rotate((-30 * Math.PI) / 180);
  const lg = ctx.createLinearGradient(-13, -8, 13, 8);
  lg.addColorStop(0, '#8fc873');
  lg.addColorStop(1, '#5E9A4E');
  ctx.fillStyle = lg;
  ctx.beginPath();
  ctx.ellipse(0, 0, 13, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(28,60,24,0.32)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-11, 0);
  ctx.lineTo(11, 0);
  ctx.stroke();
  ctx.restore();
  // stem
  ctx.save();
  ctx.translate(50, 15);
  ctx.rotate((13 * Math.PI) / 180);
  const sg = ctx.createLinearGradient(0, -13, 0, 2);
  sg.addColorStop(0, '#8a5630');
  sg.addColorStop(1, '#5f3a1f');
  ctx.strokeStyle = sg;
  ctx.lineWidth = 3.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.lineTo(0, -13);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

function drawApple(ctx, size, value) {
  const s = size / 100;
  // ground shadow
  ctx.save();
  ctx.globalAlpha = clamp01(0.3 * look.shadow_a);
  ctx.fillStyle = 'rgb(40,16,10)';
  ctx.beginPath();
  ctx.ellipse(size * 0.5, size * 0.95, size * 0.4, size * 0.085, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawStemLeaf(ctx, s);

  ctx.save();
  ctx.scale(s, s);
  ctx.clip(new (require('@napi-rs/canvas').Path2D)(APPLE));
  // base linear 176deg
  const rad = (176 * Math.PI) / 180;
  const dx = Math.cos(rad), dy = Math.sin(rad);
  const g1 = ctx.createLinearGradient(50 - dx * 50, 50 - dy * 50, 50 + dx * 50, 50 + dy * 50);
  g1.addColorStop(0.04, PAL[0]);
  g1.addColorStop(0.54, PAL[1]);
  g1.addColorStop(1, PAL[2]);
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, 100, 100);
  // sheen
  radialFill(ctx, 50, 2, 86, 78, [[0, look.hl], [0.6, 'rgba(255,255,255,0)']]);
  // ambient core shade
  const [ar, ag, ab] = AMB;
  radialFill(ctx, 50, 100, 54, 36, [
    [0, `rgba(${ar},${ag},${ab},${clamp01(look.amb)})`],
    [0.68, `rgba(${ar},${ag},${ab},0)`],
  ]);
  // rim light (screen)
  ctx.globalCompositeOperation = 'screen';
  const { r, g, b } = look.rim;
  const ra = clamp01(look.rim_a);
  radialFill(ctx, 82, 80, 120, 95, [[0, `rgba(${r},${g},${b},${ra})`], [0.4, `rgba(${r},${g},${b},0)`]]);
  radialFill(ctx, 50, 2, 90, 30, [[0, `rgba(${r},${g},${b},${ra})`], [0.6, `rgba(${r},${g},${b},0)`]]);
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();

  // number (Quicksand -> DejaVu Sans fallback in this env)
  if (value != null) {
    ctx.fillStyle = '#FFF4EC';
    ctx.font = `600 ${size * 0.47}px "DejaVu Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(120,28,14,0.34)';
    ctx.shadowBlur = size * 0.05;
    ctx.shadowOffsetY = 2;
    ctx.fillText(String(value), size * 0.5, size * 0.52);
  }
}

(async () => {
  const base = await loadImage(SRC);
  const W = base.width, H = base.height;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(base, 0, 0);

  // clear the apple-grid rectangle to the flat green, keep header/footer intact
  const x0 = COLS[0] - PITCH / 2 - 6, x1 = COLS[COLS.length - 1] + PITCH / 2 + 6;
  const y0 = ROWS[0] - PITCH / 2 - 6, y1 = ROWS[ROWS.length - 1] + PITCH / 2 + 6;
  ctx.fillStyle = BG;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);

  // deterministic digits 1..9 so the board reads naturally
  let seed = 1234567;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

  const size = PITCH; // ~98px cell (matches original spacing)
  for (const cy of ROWS) {
    for (const cx of COLS) {
      const v = 1 + Math.floor(rnd() * 9);
      ctx.save();
      ctx.translate(cx - size / 2, cy - size / 2);
      drawApple(ctx, size, v);
      ctx.restore();
    }
  }

  fs.writeFileSync(OUT, canvas.toBuffer('image/png'));
  console.log('wrote', OUT, W + 'x' + H);
})();
