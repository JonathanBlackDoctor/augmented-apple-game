// OG card generator — recreates an actual late-game playthrough of 증강 사과게임
// (Augmented Apple Game) at dusk, with bomb / golden / gem / gambler augments all
// active mid-animation. Built from the game's own renderer constants
// (candyApple.ts, theme.ts, augmentFx*.ts, augmentEmblems.ts) and rasterized with
// resvg. Landscape 1200x630 desktop/tablet HUD layout.
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const HERE = import.meta.dirname;
const F = (p) => path.join(HERE, 'node_modules/@expo-google-fonts', p);
const FONTS = {
  qs600: F('quicksand/600SemiBold/Quicksand_600SemiBold.ttf'),
  qs700: F('quicksand/700Bold/Quicksand_700Bold.ttf'),
  kr700: F('noto-sans-kr/700Bold/NotoSansKR_700Bold.ttf'),
  kr800: F('noto-sans-kr/800ExtraBold/NotoSansKR_800ExtraBold.ttf'),
  kr900: F('noto-sans-kr/900Black/NotoSansKR_900Black.ttf'),
};

const W = 1200, H = 630;

// ── apple variant palettes (verbatim from board/candyApple.ts VARIANTS) ──
const VAR = {
  normal: { pal: ['#ED6138', '#E5512C', '#DC4824'], num: '#FFF4EC', leaf: ['#69B23A', '#4C9626'], stem: ['#7C4B2B', '#5C3620'] },
  golden: { pal: ['#f4c659', '#dca21f', '#ad7d13'], num: '#5a3c08', leaf: ['#cdd07a', '#9aa24e'], stem: ['#8a5630', '#5f3a1f'], specular: true },
  gem:    { pal: ['#6fe3e0', '#2bb6c8', '#1c7e96'], num: '#eafdff', leaf: ['#9ee0d8', '#4fb3ad'], stem: ['#3a7d70', '#1f5048'] },
  bomb:   { pal: ['#6a6f86', '#454a63', '#2a2e44'], num: '#f2f2f6', leaf: ['#9bbf7e', '#6f9a52'], stem: ['#5a5060', '#3a3340'], fuse: true },
};

let UID = 0;
const uid = (p) => `${p}${(UID++).toString(36)}`;

// Quadratic petal leaf path (drawStemLeaf, lw=lh=28, origin bottom-right at 52,2 rot -38)
function leafPath() {
  const lw = 28, lh = 28;
  return `M${-lw} ${-lh} Q0 ${-lh} 0 0 Q${-lw} 0 ${-lw} ${-lh} Z`;
}

// One apple in 0..100 local units, scaled into its cell. Returns {defs, body}.
function apple(variant, value, x0, y0, cell, opt = {}) {
  const v = VAR[variant];
  const body = cell * 0.88;
  const s = body / 100;
  const tx = x0 + (cell - body) / 2;
  const ty = y0 + (cell - body) / 2;
  const gid = uid('ag'), sid = uid('as'), lid = uid('al');
  const defs = [];
  // elliptical radial 72% 60% at 50% 30%
  defs.push(`<radialGradient id="${gid}" gradientUnits="userSpaceOnUse" cx="50" cy="30" r="72" gradientTransform="translate(50 30) scale(1 0.8333) translate(-50 -30)">`
    + `<stop offset="0" stop-color="${v.pal[0]}"/><stop offset="0.56" stop-color="${v.pal[1]}"/><stop offset="1" stop-color="${v.pal[2]}"/></radialGradient>`);
  defs.push(`<linearGradient id="${sid}" x1="0" y1="-24" x2="0" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${v.stem[0]}"/><stop offset="1" stop-color="${v.stem[1]}"/></linearGradient>`);
  defs.push(`<linearGradient id="${lid}" x1="0" y1="-28" x2="-28" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${v.leaf[0]}"/><stop offset="1" stop-color="${v.leaf[1]}"/></linearGradient>`);

  let deco;
  if (v.fuse) {
    // fuse + flame (drawFuse), lit ember
    deco = `<path d="M50 14 Q54 6 62 8" fill="none" stroke="#8a6a40" stroke-width="3.4" stroke-linecap="round"/>`
      + `<circle cx="62" cy="8" r="7" fill="url(#fuseglow)"/>`
      + `<path d="M62 2 L63.8 8 L62 14 L60.2 8 Z M56 8 L62 6.2 L68 8 L62 9.8 Z" fill="#fff3c4"/>`
      + `<circle cx="62" cy="8" r="1.8" fill="#fff"/>`;
  } else {
    deco = `<rect x="-3.75" y="-24" width="7.5" height="24" rx="3" fill="url(#${sid})" transform="translate(51.25 14) rotate(11)"/>`
      + `<path d="${leafPath()}" fill="url(#${lid})" transform="translate(52 2) rotate(-38)"/>`;
  }
  const spec = v.specular
    ? `<ellipse cx="36" cy="30" rx="15" ry="10" fill="#ffffff" opacity="0.5"/>` : '';
  const sky = (variant === 'gem' || variant === 'bomb')
    ? `<ellipse cx="38" cy="30" rx="16" ry="10" fill="#ffffff" opacity="0.16"/>` : '';

  const num = value != null
    ? `<text x="50" y="67" text-anchor="middle" font-family="Quicksand" font-weight="600" font-size="46" fill="${v.num}" style="paint-order:stroke">${value}</text>`
    : '';

  const body_ = `<g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${s.toFixed(4)})">`
    + `<g filter="url(#appleshadow)"><circle cx="50" cy="50" r="50" fill="url(#${gid})"/></g>`
    + sky + spec + deco + num + `</g>`;
  return { defs: defs.join(''), body: body_ };
}

// 4-point sparkle star (board FX 'spark')
function spark(cx, cy, r, color, rot = 30, op = 1) {
  const p = `M0 ${-r} L${r * 0.32} 0 L0 ${r} L${-r * 0.32} 0 Z M${-r} 0 L0 ${-r * 0.32} L${r} 0 L0 ${r * 0.32} Z`;
  return `<g transform="translate(${cx} ${cy}) rotate(${rot})" opacity="${op}"><path d="${p}" fill="${color}"/><circle r="${r * 0.22}" fill="#fff"/></g>`;
}

// expanding clear ring (mid-animation: scaled out, fading)
function ring(cx, cy, r, color, op) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="3.5" opacity="${op}"/>`;
}

// flung particle (radial white->color), placed mid-travel
function particle(cx, cy, r, gradId) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${gradId})"/>`;
}

const seed = (() => { let s = 1337; return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; })();

function build() {
  const defs = [];
  const layers = { sky: [], hills: [], glow: [], panel: [], apples: [], fx: [], hud: [], rail: [] };

  // shared defs ---------------------------------------------------------------
  defs.push(`<filter id="appleshadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="1.1" stdDev="1.5" flood-color="#28120c" flood-opacity="0.30"/></filter>`);
  defs.push(`<radialGradient id="fuseglow" gradientUnits="userSpaceOnUse" cx="62" cy="8" r="7"><stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/><stop offset="0.5" stop-color="#ffb53a" stop-opacity="0.7"/><stop offset="1" stop-color="#ffb53a" stop-opacity="0"/></radialGradient>`);
  for (const [id, c] of [['pgSilver', '#aab6c6'], ['pgGold', '#E3A12A'], ['pgRed', '#ff7c61'], ['pgDark', '#5d6b7d'], ['pgBlue', '#2f8fc4']]) {
    defs.push(`<radialGradient id="${id}"><stop offset="0" stop-color="#ffffff"/><stop offset="0.7" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity="0.85"/></radialGradient>`);
  }

  // sky (해질녘/황혼 — sampled from DayNightSky KF p≈0.46) ----------------------
  defs.push(`<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6E5F9E"/><stop offset="0.46" stop-color="#FF9070"/><stop offset="0.72" stop-color="#FBB35F"/><stop offset="1" stop-color="#F0A877"/></linearGradient>`);
  layers.sky.push(`<rect width="${W}" height="${H}" fill="url(#sky)"/>`);
  // a few early stars upper-left
  for (let i = 0; i < 16; i++) {
    const x = seed() * W, y = seed() * 150, r = 0.7 + seed() * 1.3, o = 0.25 + seed() * 0.5;
    layers.sky.push(`<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(1)}" fill="#fff" opacity="${o.toFixed(2)}"/>`);
  }
  // setting sun low on the west (right), glowing through behind the board
  defs.push(`<radialGradient id="sun"><stop offset="0.05" stop-color="#fffdf2"/><stop offset="0.4" stop-color="#FF7E4E"/><stop offset="0.72" stop-color="#FF7E4E" stop-opacity="0"/></radialGradient>`);
  layers.glow.push(`<circle cx="930" cy="300" r="190" fill="url(#sun)" opacity="0.9"/>`);
  layers.glow.push(`<circle cx="930" cy="300" r="46" fill="#fff6e2" opacity="0.95"/>`);

  // dusk hill silhouettes near the bottom
  layers.hills.push(`<path d="M0 560 Q300 500 620 552 T1200 540 L1200 630 L0 630 Z" fill="#3e5436" opacity="0.92"/>`);
  layers.hills.push(`<path d="M0 600 Q360 556 760 596 T1200 588 L1200 630 L0 630 Z" fill="#2a363f" opacity="0.95"/>`);

  // ── board panel (subtle translucent panel under the grid; sky shows through) ─
  const PX = 36, PY = 92, PW = 968, PH = 512;
  defs.push(`<linearGradient id="panel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffdf7" stop-opacity="0.5"/><stop offset="1" stop-color="#fbf1e0" stop-opacity="0.42"/></linearGradient>`);
  layers.panel.push(`<rect x="${PX}" y="${PY}" width="${PW}" height="${PH}" rx="26" fill="url(#panel)" stroke="#ffffff" stroke-opacity="0.45" stroke-width="1.5"/>`);

  // grid geometry
  const COLS = 14, ROWS = 8, pad = 22;
  const cell = Math.min((PW - 2 * pad) / COLS, (PH - 2 * pad) / ROWS);
  const gridW = cell * COLS, gridH = cell * ROWS;
  const ox = PX + (PW - gridW) / 2, oy = PY + (PH - gridH) / 2;
  const cx0 = (c) => ox + c * cell, cy0 = (r) => oy + r * cell;
  const center = (c, r) => ({ x: ox + (c + 0.5) * cell, y: oy + (r + 0.5) * cell });

  // board contents: late game → ~38% cleared. specials placed deliberately.
  // selection cluster (sum 10): golden 3 + gem 7 at row 3, cols 6-7.
  const specials = {
    '3,6': { v: 'golden', n: 3 }, '3,7': { v: 'gem', n: 7 },
    '5,10': { v: 'bomb', n: 4 },
  };
  const empties = new Set();
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const k = `${r},${c}`;
    if (specials[k]) continue;
    // clustered emptiness around already-cleared zones for a believable late board
    const d = Math.hypot(c - 3, r - 1) + Math.hypot(c - 11, r - 6) * 0.8;
    if (seed() < 0.34 + (d < 4 ? 0.22 : 0)) empties.add(k);
  }
  // keep selection neighbours filled-ish; ensure bomb's orthogonal neighbours exist
  for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) empties.delete(`${5 + dr},${10 + dc}`);

  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const k = `${r},${c}`;
    if (empties.has(k)) continue;
    const sp = specials[k];
    const variant = sp ? sp.v : 'normal';
    const n = sp ? sp.n : 1 + Math.floor(seed() * 9);
    const a = apple(variant, n, cx0(c), cy0(r), cell);
    defs.push(a.defs);
    layers.apples.push(a.body);
  }

  // ── FX: everything firing at once, frozen mid-animation ─────────────────────
  const selA = center(6, 3), selB = center(7, 3);
  const selCx = (selA.x + selB.x) / 2, selCy = selA.y;
  // valid selection marquee around golden+gem
  const selX = cx0(6) + 4, selY = cy0(3) + 4, selW = cell * 2 - 8, selH = cell - 8;
  layers.fx.push(`<rect x="${selX}" y="${selY}" width="${selW}" height="${selH}" rx="${cell * 0.16}" fill="#3e9f63" fill-opacity="0.16" stroke="#3e9f63" stroke-width="3.5"/>`);
  // running-sum bubble (valid → green)
  layers.fx.push(`<g transform="translate(${selCx} ${selY - 16})"><rect x="-22" y="-15" width="44" height="26" rx="13" fill="#3e9f63"/><text x="0" y="4" text-anchor="middle" font-family="Quicksand" font-weight="700" font-size="16" fill="#fff">10</text></g>`);
  // sparkles on the two special apples
  layers.fx.push(spark(selA.x, selA.y, 15, '#E3A12A', 38));
  layers.fx.push(spark(selB.x, selB.y, 15, '#2f8fc4', 22));

  // bomb explosion (flash + spark + rings + flung silver particles)
  const bomb = center(10, 5);
  defs.push(`<radialGradient id="boomflash"><stop offset="0" stop-color="#fff6df" stop-opacity="0.9"/><stop offset="0.5" stop-color="#ffd08a" stop-opacity="0.45"/><stop offset="1" stop-color="#ffd08a" stop-opacity="0"/></radialGradient>`);
  layers.fx.push(`<circle cx="${bomb.x}" cy="${bomb.y}" r="${cell * 1.4}" fill="url(#boomflash)"/>`);
  layers.fx.push(`<circle cx="${bomb.x}" cy="${bomb.y}" r="${cell * 1.02}" fill="none" stroke="#ffffff" stroke-width="6" opacity="0.85"/>`);
  layers.fx.push(ring(bomb.x, bomb.y, cell * 1.04, '#3a4250', 0.85));
  layers.fx.push(ring(bomb.x, bomb.y, cell * 1.7, '#5d6b7d', 0.5));
  layers.fx.push(spark(bomb.x, bomb.y, 26, '#ffce6a', 14));
  for (let i = 0; i < 18; i++) {
    const ang = (Math.PI * 2 / 18) * i + seed() * 0.3, dist = cell * (0.78 + seed() * 0.75);
    layers.fx.push(particle(bomb.x + Math.cos(ang) * dist, bomb.y + Math.sin(ang) * dist, 6 + seed() * 3, i % 4 === 0 ? 'pgDark' : 'pgSilver'));
  }
  // small clear burst (apple-red) lower-left
  const burst = center(4, 6);
  for (let i = 0; i < 9; i++) {
    const ang = (Math.PI * 2 / 9) * i, dist = cell * (0.55 + seed() * 0.45);
    layers.fx.push(particle(burst.x + Math.cos(ang) * dist, burst.y + Math.sin(ang) * dist, 4 + seed() * 2, 'pgRed'));
  }

  // gambler dice (mid-tumble) just below-right of the selection centroid
  const dx = selCx + cell * 1.05, dy = selCy + cell * 0.75, dd = cell * 0.86;
  defs.push(`<linearGradient id="dice" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#e6e0ff"/></linearGradient>`);
  const pip = (px, py) => `<circle cx="${px}" cy="${py}" r="${dd * 0.075}" fill="#6f63c8"/>`;
  const dq = dd / 2;
  layers.fx.push(`<g transform="translate(${dx} ${dy}) rotate(218)">`
    + `<rect x="${-dq}" y="${-dq}" width="${dd}" height="${dd}" rx="${dd * 0.21}" fill="url(#dice)" stroke="#cfc6ff" stroke-width="2"/>`
    + pip(-dd * 0.26, -dd * 0.26) + pip(dd * 0.26, -dd * 0.26) + pip(0, 0) + pip(-dd * 0.26, dd * 0.26) + pip(dd * 0.26, dd * 0.26)
    + `</g>`);
  // gambler win popup (green 2×)
  layers.fx.push(`<text x="${dx}" y="${dy - dd * 0.75}" text-anchor="middle" font-family="Quicksand" font-weight="700" font-size="22" fill="#2f7a52">2×</text>`);

  // headline score popup above the cleared centroid (gold-tinted) + ring
  layers.fx.push(ring(selCx, selCy - cell * 0.3, cell * 0.9, '#B97F12', 0.4));
  layers.fx.push(
    `<g transform="translate(${selCx} ${selCy - cell * 1.55})" text-anchor="middle">`
    + `<text x="0" y="0" font-family="Quicksand" font-weight="700" font-size="34" fill="#B97F12" style="paint-order:stroke;stroke:#fff8e8;stroke-width:5">+1,840</text>`
    + `<text x="0" y="22" font-family="Noto Sans KR" font-weight="800" font-size="15">`
    + `<tspan fill="#B97F12">황금 ×2</tspan><tspan fill="#5d6b7d"> · </tspan>`
    + `<tspan fill="#1f6699">보석 +20</tspan><tspan fill="#5d6b7d"> · </tspan>`
    + `<tspan fill="#B97F12">연쇄 ×2</tspan></text></g>`);

  // ── HUD (top, full width, dusk adaptive warm-cream ink) ─────────────────────
  const inkSh = `style="paint-order:stroke;stroke:#2a1c14;stroke-width:0.6"`;
  // left: round chip + score
  layers.hud.push(`<g transform="translate(40 30)"><rect x="0" y="-15" width="62" height="30" rx="15" fill="#1e1a38" fill-opacity="0.55" stroke="#ffffff" stroke-opacity="0.4"/><text x="31" y="6" text-anchor="middle" font-family="Noto Sans KR" font-weight="800" font-size="15" fill="#e7d8c4">R5<tspan fill="#bda88f" font-size="12">/5</tspan></text></g>`);
  layers.hud.push(`<text x="118" y="48" font-family="Quicksand" font-weight="700" font-size="34" fill="#ff8a5c" ${inkSh}>12,480</text>`);
  layers.hud.push(`<text x="248" y="48" font-family="Noto Sans KR" font-weight="700" font-size="16" fill="#d9c8b4">점</text>`);

  // center: timer bar (late game → warn orange, low) + seconds
  const barX = 372, barW = 456, barY = 30;
  layers.hud.push(`<rect x="${barX}" y="${barY - 8}" width="${barW}" height="16" rx="8" fill="#241f3e" fill-opacity="0.5" stroke="#ffffff" stroke-opacity="0.35"/>`);
  defs.push(`<linearGradient id="tfill" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e0762a"/><stop offset="1" stop-color="#f0a23a"/></linearGradient>`);
  layers.hud.push(`<rect x="${barX + 1.5}" y="${barY - 6.5}" width="${(barW - 3) * 0.23}" height="13" rx="6.5" fill="url(#tfill)"/>`);
  layers.hud.push(`<text x="${barX + barW + 22}" y="${barY + 7}" font-family="Quicksand" font-weight="700" font-size="22" fill="#ffd9c2" ${inkSh}>8</text>`);

  // right: combo chip + pause
  layers.hud.push(`<g transform="translate(1020 30)"><rect x="-66" y="-15" width="86" height="30" rx="15" fill="#E3A12A"/><text x="-23" y="6" text-anchor="middle" font-family="Noto Sans KR" font-weight="800" font-size="15" fill="#fff">7 콤보</text></g>`);
  layers.hud.push(`<g transform="translate(1052 30)" fill="#efe4d4"><rect x="-2" y="-9" width="5" height="18" rx="2"/><rect x="7" y="-9" width="5" height="18" rx="2"/></g>`);

  // ── right rail: owned augment crest cards (the 4 active augments) ───────────
  const railX = 1024, cardW = 152, cardH = 122, gap = 8, railY = 100;
  const cards = [
    { name: '폭탄 사과', tier: 'silver', svg: EMBLEM.bomb },
    { name: '황금 사과', tier: 'gold', svg: EMBLEM.golden },
    { name: '보석 사과', tier: 'gold', svg: EMBLEM.gem },
    { name: '도박사', tier: 'prism', svg: EMBLEM.gambler },
  ];
  const tierStroke = { silver: '#bcc7d4', gold: '#E3A12A', prism: '#8a7dff' };
  defs.push(`<linearGradient id="railprism" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8a7dff"/><stop offset="0.5" stop-color="#6ad7d0"/><stop offset="1" stop-color="#E3A12A"/></linearGradient>`);
  cards.forEach((cd, i) => {
    const y = railY + i * (cardH + gap);
    const stroke = cd.tier === 'prism' ? 'url(#railprism)' : tierStroke[cd.tier];
    layers.rail.push(`<g transform="translate(${railX} ${y})">`
      + `<rect x="0" y="0" width="${cardW}" height="${cardH}" rx="14" fill="#fffdf7" fill-opacity="0.96" stroke="${stroke}" stroke-width="2.5"/>`
      + `<g transform="translate(${(cardW - 84) / 2} 8) scale(0.84)">${cd.svg}</g>`
      + `<text x="${cardW / 2}" y="110" text-anchor="middle" font-family="Noto Sans KR" font-weight="800" font-size="15" fill="#3a2a1e">${cd.name}</text>`
      + `</g>`);
  });

  // title watermark (bottom-left, subtle)
  layers.hud.push(`<text x="44" y="612" font-family="Noto Sans KR" font-weight="900" font-size="20" fill="#fffaf0" fill-opacity="0.9" style="paint-order:stroke;stroke:#3a2418;stroke-width:3">증강 사과게임</text>`);
  layers.hud.push(`<text x="210" y="612" font-family="Noto Sans KR" font-weight="700" font-size="13" fill="#fff3e2" fill-opacity="0.75" style="paint-order:stroke;stroke:#3a2418;stroke-width:2.5">합이 10이 되는 사과를 담고, 증강을 쌓아 겨루는 실시간 웹게임</text>`);

  const order = ['sky', 'glow', 'hills', 'panel', 'apples', 'fx', 'rail', 'hud'];
  const content = order.map((k) => layers[k].join('\n')).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defs.join('')}</defs>${content}</svg>`;
}

// emblem crests pulled verbatim from ui/components/augmentEmblems.ts (var(--font)
// → Quicksand for the static raster; outer <svg> stripped, inner markup kept).
const EMBLEM = {};
import('./emblems.mjs').then(async ({ EMBLEM_INNER }) => {
  Object.assign(EMBLEM, EMBLEM_INNER);
  const svg = build();
  // Render at 2× then downscale (lanczos3) for crisp anti-aliased text and edges.
  const r = new Resvg(svg, {
    font: { loadSystemFonts: false, fontFiles: Object.values(FONTS), defaultFontFamily: 'Noto Sans KR' },
    fitTo: { mode: 'width', value: W * 2 },
  });
  const dest = process.argv[2] || path.join(HERE, '../../public/og.png');
  await sharp(r.render().asPng())
    .resize(W, H, { kernel: 'lanczos3' })
    .png({ compressionLevel: 9 })
    .toFile(dest);
  console.log('wrote', dest, fs.statSync(dest).size, 'bytes');
});
