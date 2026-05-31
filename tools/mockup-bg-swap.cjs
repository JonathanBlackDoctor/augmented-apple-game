/* Reverse mockup: the repo's own "햇살 과수원" day-night background (DayNightSky
 * KF keyframes, daytime frame) with the FLAT orange apples from the attached
 * screenshot laid on top. A visual test of "my game's background + the image's
 * apples". Output PNG. */
const { createCanvas } = require('@napi-rs/canvas');
const fs = require('fs');

const OUT = '/home/user/augmented-apple-game/tools/mockup-bg-swap.png';
const W = 2340, H = 1080;

// grid geometry copied from the screenshot (18x9, 98px pitch @2x)
const COLS = [331,429,527,625,722,820,918,1016,1114,1212,1309,1407,1505,1603,1701,1799,1896,1994];
const ROWS = [188,286,385,483,581,679,777,876,974];
const PITCH = 98;

// DayNightSky KF — daytime/morning frame (p≈0.05, bright 아침/낮)
const SKY = { top: '#9CC2E8', mid: '#E9F1F2', hor: '#FBF1DA' };
const HILL = { gFar: '#A6C77E', gNear: '#6E9F52', tree: '#4d7a44' };
const SUN = '#FFF0C2';

const rnd = (s) => { const x = Math.sin(s) * 10000; return x - Math.floor(x); };
function radial(ctx, cx, cy, rx, ry, stops) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(rx, ry);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.fillStyle = g; ctx.fillRect(-2, -2, 4, 4); ctx.restore();
}

function drawBackground(ctx) {
  // sky: linear 180deg top 0% -> mid 46% -> hor 70% (hold to bottom)
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, SKY.top);
  sky.addColorStop(0.46, SKY.mid);
  sky.addColorStop(0.70, SKY.hor);
  sky.addColorStop(1, SKY.hor);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

  // sun (daytime): radial disc + soft glow, upper-left quadrant
  const sx = 0.225 * W, sy = 0.34 * H, sr = 150;
  radial(ctx, sx, sy, sr * 2.4, sr * 2.4, [[0, 'rgba(255,240,194,0.45)'], [0.5, 'rgba(255,240,194,0)']]);
  radial(ctx, sx, sy, sr, sr, [[0.08, '#fffdf2'], [0.42, SUN], [0.7, 'rgba(255,240,194,0)']]);

  // clouds — a few soft white drifts up high
  for (const [cx, cy, rw] of [[0.30, 0.14, 360], [0.62, 0.22, 460], [0.82, 0.10, 300]]) {
    radial(ctx, cx * W, cy * H, rw, rw * 0.32, [[0, 'rgba(255,255,255,0.80)'], [0.55, 'rgba(255,255,255,0.18)'], [0.78, 'rgba(255,255,255,0)']]);
  }

  // hills — three soft mounds (far light → near deep), radial like the CSS
  radial(ctx, 0.38 * W, 1.02 * H, 1.05 * W, 0.34 * H, [[0, HILL.gFar], [0.74, 'rgba(166,199,126,0)']]);
  const midCol = '#88b363';
  radial(ctx, 0.66 * W, 1.05 * H, 1.10 * W, 0.36 * H, [[0, midCol], [0.76, 'rgba(136,179,99,0)']]);
  radial(ctx, 0.34 * W, 1.12 * H, 1.05 * W, 0.40 * H, [[0, HILL.gNear], [0.80, 'rgba(110,159,82,0)']]);

  // little trees dotted along the hill line
  for (let i = 0; i < 22; i++) {
    const tx = (0.04 + rnd(i + 1) * 0.92) * W;
    const ty = (0.80 + rnd(i + 7) * 0.06) * H;
    const s = 10 + rnd(i + 3) * 10;
    radial(ctx, tx, ty, s, s * 1.3, [[0, HILL.tree], [0.7, 'rgba(77,122,68,0)']]);
  }

  // a few faint daylight motes
  for (let i = 0; i < 14; i++) {
    const mx = (0.08 + rnd(i + 11) * 0.84) * W;
    const my = (0.30 + rnd(i + 13) * 0.45) * H;
    const s = 6 + rnd(i + 17) * 12;
    radial(ctx, mx, my, s, s, [[0, 'rgba(255,247,222,0.55)'], [0.72, 'rgba(255,247,222,0)']]);
  }
}

// flat apple from the screenshot: solid coral circle + single upper-right leaf + white numeral
function drawFlatApple(ctx, cx, cy, size, value) {
  const r = size * 0.40;

  // soft ground shadow
  ctx.save();
  ctx.fillStyle = 'rgba(40,24,16,0.16)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 0.92, r * 0.85, r * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // leaf (behind body top), almond tilted -32deg, upper-right
  ctx.save();
  ctx.translate(cx + size * 0.11, cy - size * 0.40);
  ctx.rotate((-32 * Math.PI) / 180);
  const lg = ctx.createLinearGradient(-size * 0.16, 0, size * 0.16, 0);
  lg.addColorStop(0, '#8fc850');
  lg.addColorStop(1, '#4f8f1c');
  ctx.fillStyle = lg;
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.16, size * 0.075, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(28,60,24,0.28)';
  ctx.lineWidth = size * 0.012;
  ctx.beginPath();
  ctx.moveTo(-size * 0.13, 0);
  ctx.lineTo(size * 0.13, 0);
  ctx.stroke();
  ctx.restore();

  // body circle: coral vertical gradient
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const bg = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  bg.addColorStop(0, '#ef5c45');
  bg.addColorStop(0.55, '#d3402c');
  bg.addColorStop(1, '#b22f1d');
  ctx.fillStyle = bg;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  // top sheen highlight
  radial(ctx, cx - r * 0.18, cy - r * 0.40, r * 1.05, r * 0.95, [
    [0, 'rgba(255,170,135,0.55)'], [0.6, 'rgba(255,170,135,0)'],
  ]);
  ctx.restore();

  // numeral (white, bold)
  ctx.fillStyle = '#FFF4EC';
  ctx.font = `700 ${size * 0.46}px "DejaVu Sans", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(120,30,16,0.30)';
  ctx.shadowBlur = size * 0.04;
  ctx.shadowOffsetY = 1.5;
  ctx.fillText(String(value), cx, cy + size * 0.02);
  ctx.shadowColor = 'transparent';
}

const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');
drawBackground(ctx);

let seed = 1234567;
const r9 = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
for (const cy of ROWS) for (const cx of COLS) drawFlatApple(ctx, cx, cy, PITCH, 1 + Math.floor(r9() * 9));

fs.writeFileSync(OUT, canvas.toBuffer('image/png'));
console.log('wrote', OUT, W + 'x' + H);
