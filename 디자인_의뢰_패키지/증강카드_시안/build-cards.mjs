/* build-cards.mjs — 증강 카드 아트 (채색형 · refined)
 * dir-a "햇살 과수원" 팔레트와 .aug-card 디자인 언어를 따르되,
 * 다층 그라데이션 · 스페큘러 하이라이트 · 소프트 그림자/글로우로
 * 정교하게 마감한 일러스트 엠블럼.
 *
 *   node 디자인_의뢰_패키지/증강카드_시안/build-cards.mjs
 */
import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const out = (name) => fileURLToPath(new URL('./' + name, import.meta.url));

// ── dir-a "햇살 과수원" 토큰 ──────────────────────────────────────
const T = {
  paper: '#FBF5E9', paper2: '#FFFDF7', ink: '#3A2A1E', ink2: '#836A54', line: '#EADCC4',
  chip: '#FFFDF7', apple: '#E04A36', apple2: '#B8311E', appleHi: '#FF9A77', leaf: '#5E9A4E',
  gold: '#E3A12A', gold2: '#B97F12', goldBg: '#FBEFD2',
};
const TIER_ART = { silver: ['#f6f9fc', '#d7dfe9'], gold: ['#fef3d4', '#f0cd76'], prism: ['#f3eeff', '#dbf4fb'] };
const APPLE = 'M44 15C47 18 53 18 56 15C67 11 90 24 90 50C90 73 72 89 50 89C28 89 10 73 10 50C10 24 33 11 44 15Z';

let U = 0; const uid = () => 'g' + (U++);

// 공용 잎사귀 (각도/색 조정 가능)
function leaf(id, x, y, rot, c0 = '#7ac06a', c1 = '#3f7a33') {
  return `
    <g transform="translate(${x} ${y}) rotate(${rot})">
      <defs><linearGradient id="${id}-lf" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${c0}"/><stop offset="100%" stop-color="${c1}"/></linearGradient></defs>
      <path d="M0 0 C14 -10 26 -6 24 6 C10 12 -2 8 0 0Z" fill="url(#${id}-lf)" stroke="#fff" stroke-width=".6" stroke-opacity=".5"/>
      <path d="M3 1 C10 -3 17 -3 21 0" stroke="#2f5c26" stroke-width="1" fill="none" stroke-linecap="round" opacity=".7"/>
      <path d="M5 3 C9 5 14 5 18 4" stroke="#2f5c26" stroke-width=".7" fill="none" stroke-linecap="round" opacity=".4"/>
    </g>`;
}
// 광택 사과 1개 (반지름 비례, 숫자/색 옵션)
function appleGlyph(id, { fill0, fill1, fill2, num, scale = 1, tx = 0, ty = 0, leafRot = -18 }) {
  return `
  <g transform="translate(${tx} ${ty}) scale(${scale})">
    <defs>
      <linearGradient id="${id}-bd" x1="0.2" y1="0" x2="0.7" y2="1">
        <stop offset="0%" stop-color="${fill0}"/><stop offset="46%" stop-color="${fill1}"/><stop offset="100%" stop-color="${fill2}"/></linearGradient>
      <radialGradient id="${id}-sheen" cx="36%" cy="24%" r="44%"><stop offset="0%" stop-color="#fff" stop-opacity=".85"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></radialGradient>
    </defs>
    <ellipse cx="50" cy="86" rx="27" ry="5.5" fill="#000" opacity=".13" filter="url(#blurM)"/>
    <line x1="50" y1="20" x2="55" y2="9" stroke="#7a4a24" stroke-width="3.2" stroke-linecap="round"/>
    ${leaf(id, 55, 9, leafRot)}
    <path d="${APPLE}" fill="url(#${id}-bd)"/>
    <path d="${APPLE}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.4"/>
    <path d="M86 44 C90 56 84 70 72 80" stroke="${fill2}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".4"/>
    <ellipse cx="40" cy="34" rx="17" ry="12" fill="url(#${id}-sheen)" filter="url(#blurS)"/>
    <ellipse cx="35" cy="30" rx="5" ry="7" fill="#fff" opacity=".9" transform="rotate(-22 35 30)"/>
    ${num != null ? `<text x="50" y="62" font-family="NanumSquare" font-weight="800" font-size="26" text-anchor="middle" fill="#fff" stroke="${fill2}" stroke-width="3" paint-order="stroke" opacity=".95">${num}</text>` : ''}
  </g>`;
}
// 메달 배지 (×2, ×3, 10 …)
function medal(id, cx, cy, r, label, ramp) {
  return `
  <g>
    <defs><linearGradient id="${id}-md" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${ramp[0]}"/><stop offset="100%" stop-color="${ramp[1]}"/></linearGradient></defs>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#000" opacity=".16" filter="url(#blurS)" transform="translate(0 1.5)"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id}-md)" stroke="#fff" stroke-width="1.6"/>
    <path d="M${cx - r * 0.55} ${cy - r * 0.5} A${r * 0.8} ${r * 0.8} 0 0 1 ${cx + r * 0.55} ${cy - r * 0.5}" stroke="#fff" stroke-width="1.4" fill="none" opacity=".55"/>
    <text x="${cx}" y="${cy + r * 0.36}" font-family="NanumSquare" font-weight="800" font-size="${r * 1.05}" text-anchor="middle" fill="#fff">${label}</text>
  </g>`;
}
function sparkle(x, y, s, c = '#fffaf0') {
  return `<g fill="${c}" filter="url(#glowS)"><path d="M${x} ${y - s} C${x + s * 0.2} ${y - s * 0.2} ${x + s * 0.2} ${y - s * 0.2} ${x + s} ${y} C${x + s * 0.2} ${y + s * 0.2} ${x + s * 0.2} ${y + s * 0.2} ${x} ${y + s} C${x - s * 0.2} ${y + s * 0.2} ${x - s * 0.2} ${y + s * 0.2} ${x - s} ${y} C${x - s * 0.2} ${y - s * 0.2} ${x - s * 0.2} ${y - s * 0.2} ${x} ${y - s}Z"/></g>`;
}

// ── 정교한 채색형 엠블럼 4종 ─────────────────────────────────────
const ART = {
  // 황금 사과 — 보드 · Gold
  golden() {
    const g = uid();
    return `
    <defs><radialGradient id="${g}-halo" cx="50%" cy="44%" r="55%"><stop offset="0%" stop-color="#fff3c4"/><stop offset="100%" stop-color="#fff3c4" stop-opacity="0"/></radialGradient></defs>
    <circle cx="50" cy="50" r="46" fill="url(#${g}-halo)"/>
    ${appleGlyph(g + 'a', { fill0: '#fff1b8', fill1: '#f3c33d', fill2: '#c2820c', scale: 1 })}
    ${sparkle(74, 28, 6.5, '#fffbe6')}${sparkle(26, 60, 4, '#fffbe6')}${sparkle(78, 62, 3, '#ffe9a8')}
    ${medal(g + 'm', 73, 72, 13, '×2', ['#ffd96a', '#d8970f'])}`;
  },
  // 유리대포 — 하이리스크 · Prismatic
  glasscannon() {
    const g = uid();
    const rays = ['#ff5a6e', '#ff9f43', '#ffd23f', '#4fd17a', '#3aa6ff', '#9a6bff'];
    return `
    <defs>
      <radialGradient id="${g}-halo" cx="46%" cy="50%" r="58%"><stop offset="0%" stop-color="#eceaff"/><stop offset="100%" stop-color="#eceaff" stop-opacity="0"/></radialGradient>
      <linearGradient id="${g}-bar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fbfaff"/><stop offset="40%" stop-color="#cfc2ff"/><stop offset="100%" stop-color="#8f7be8"/></linearGradient>
      <radialGradient id="${g}-flash" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#fff" stop-opacity=".95"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></radialGradient>
    </defs>
    <circle cx="50" cy="50" r="46" fill="url(#${g}-halo)"/>
    <g filter="url(#glowS)">${rays.map((c, i) => `<line x1="64" y1="38" x2="98" y2="${18 + i * 6.8}" stroke="${c}" stroke-width="${i % 2 ? 2.4 : 3.4}" stroke-linecap="round" opacity="${i % 2 ? .75 : 1}"/>`).join('')}</g>
    <path d="M70 30 l3 -7 2 7 7 2 -7 2 -2 7 -3 -7 -7 -2Z" fill="#fff" opacity=".9" filter="url(#glowS)"/>
    <circle cx="66" cy="38" r="9" fill="url(#${g}-flash)"/>
    <g transform="rotate(-25 42 56)">
      <ellipse cx="36" cy="70" rx="27" ry="5" fill="#000" opacity=".13" filter="url(#blurM)"/>
      <rect x="8" y="50" width="9" height="13" rx="3" fill="url(#${g}-bar)" stroke="#fff" stroke-width="1"/>
      <path d="M15 50 L55 43 L55 69 L15 62 Z" fill="url(#${g}-bar)" stroke="#fff" stroke-width="1.2"/>
      <path d="M15 50 L55 43 L55 47 L16 53 Z" fill="#fff" opacity=".5"/>
      <path d="M16 60 L55 65 L55 69 L15 62 Z" fill="#5a4bb0" opacity=".32"/>
      <rect x="44" y="42" width="5" height="28" rx="2.5" fill="#fff" opacity=".4"/>
      <ellipse cx="55" cy="56" rx="3.6" ry="14" fill="#e7e0ff" stroke="#fff" stroke-width="1.2"/>
      <ellipse cx="55.5" cy="56" rx="2.1" ry="10.5" fill="#6a5fd6" opacity=".7"/>
      <circle cx="22" cy="55" r="3.8" fill="#fff" opacity=".5"/>
    </g>
    <path d="M28 70 l6 -7 -3.5 -2 5 -8" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round" filter="url(#glowS)"/>
    ${medal(g + 'm', 30, 36, 12.5, '×3', ['#a99bff', '#6a5fd6'])}`;
  },
  // 잔상 — 시간 · Gold (드래그 중 시간 감속)
  afterimage() {
    const g = uid();
    return `
    <defs><radialGradient id="${g}-halo" cx="56%" cy="48%" r="56%"><stop offset="0%" stop-color="#fff0cf"/><stop offset="100%" stop-color="#fff0cf" stop-opacity="0"/></radialGradient></defs>
    <circle cx="52" cy="50" r="46" fill="url(#${g}-halo)"/>
    <g filter="url(#blurM)" opacity=".22">${appleGlyph(g + 'e1', { fill0: T.appleHi, fill1: T.apple, fill2: T.apple2, scale: .82, tx: -26, ty: 8 })}</g>
    <g filter="url(#blurS)" opacity=".42">${appleGlyph(g + 'e2', { fill0: T.appleHi, fill1: T.apple, fill2: T.apple2, scale: .9, tx: -13, ty: 4 })}</g>
    <g stroke="${T.gold}" stroke-linecap="round" opacity=".85" filter="url(#glowS)">
      <line x1="2" y1="40" x2="18" y2="40" stroke-width="3"/><line x1="0" y1="53" x2="13" y2="53" stroke-width="2.4"/><line x1="5" y1="66" x2="17" y2="66" stroke-width="2"/>
    </g>
    ${appleGlyph(g + 'm', { fill0: T.appleHi, fill1: T.apple, fill2: T.apple2, scale: 1, tx: 7, ty: 0 })}
    ${sparkle(86, 30, 4, '#ffe9a8')}`;
  },
  // 재배치 — 보드 · Silver (합 10 짝 생성)
  rearrange() {
    const g = uid();
    return `
    <defs>
      <radialGradient id="${g}-halo" cx="50%" cy="48%" r="56%"><stop offset="0%" stop-color="#fbfdff"/><stop offset="100%" stop-color="#fbfdff" stop-opacity="0"/></radialGradient>
      <linearGradient id="${g}-arr" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#cdd6e0"/><stop offset="100%" stop-color="#8593a2"/></linearGradient>
    </defs>
    <circle cx="50" cy="50" r="46" fill="url(#${g}-halo)"/>
    <g stroke="url(#${g}-arr)" stroke-width="3.4" fill="none" stroke-linecap="round" filter="url(#glowS)">
      <path d="M24 33 A30 30 0 0 1 73 27"/><path d="M76 67 A30 30 0 0 1 27 73"/>
    </g>
    <path d="M73 27 l-2 -10 11 5Z" fill="#8593a2"/>
    <path d="M27 73 l2 10 -11 -5Z" fill="#8593a2"/>
    ${appleGlyph(g + 'l', { fill0: T.appleHi, fill1: T.apple, fill2: T.apple2, num: 7, scale: .5, tx: 6, ty: 30 })}
    ${appleGlyph(g + 'r', { fill0: '#ffd98c', fill1: T.gold, fill2: T.gold2, num: 3, scale: .5, tx: 56, ty: 30 })}
    ${medal(g + 'm', 50, 50, 13, '10', ['#eef2f6', '#9aa6b2'])}`;
  },
};

// ── 카드 빌더 ─────────────────────────────────────────────────────
const CW = 244, CH = 338, PAD = 17, ART_H = 172;
function tierStroke(tier, g) {
  if (tier === 'gold') return `stroke="${T.gold}" stroke-width="2"`;
  if (tier === 'prism') return `stroke="url(#${g}-pb)" stroke-width="2.6"`;
  return `stroke="#d3dbe5" stroke-width="1.6"`;
}
function card(x, y, { tier, fam, name, effect }, emblem) {
  const g = uid();
  const [c0, c1] = TIER_ART[tier];
  const famW = fam.length * 11.5 + 24;
  return `
  <g transform="translate(${x} ${y})">
    <defs>
      <radialGradient id="${g}-art" cx="50%" cy="-8%" r="125%"><stop offset="0%" stop-color="${c0}"/><stop offset="100%" stop-color="${c1}"/></radialGradient>
      <linearGradient id="${g}-pb" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#8a7dff"/><stop offset="50%" stop-color="#6ad7d0"/><stop offset="100%" stop-color="#ffd97a"/></linearGradient>
      <linearGradient id="${g}-sheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fff" stop-opacity=".55"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></linearGradient>
    </defs>
    <rect x="0" y="0" width="${CW}" height="${CH}" rx="20" fill="${T.paper2}" filter="url(#cardShadow)"/>
    <rect x="0.9" y="0.9" width="${CW - 1.8}" height="${CH - 1.8}" rx="19" fill="none" ${tierStroke(tier, g)}/>
    <g>
      <rect x="${PAD}" y="${PAD}" width="${CW - PAD * 2}" height="${ART_H}" rx="15" fill="url(#${g}-art)"/>
      <rect x="${PAD}" y="${PAD}" width="${CW - PAD * 2}" height="${ART_H * 0.55}" rx="15" fill="url(#${g}-sheen)"/>
      <rect x="${PAD + 0.75}" y="${PAD + 0.75}" width="${CW - PAD * 2 - 1.5}" height="${ART_H - 1.5}" rx="14" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1"/>
    </g>
    <g transform="translate(${CW / 2 - 74} ${PAD + ART_H / 2 - 74}) scale(1.48)">
      <svg width="100" height="100" viewBox="0 0 100 100">${emblem}</svg>
    </g>
    <g transform="translate(${PAD + 1} ${PAD + ART_H + 24})">
      <rect x="0" y="-13.5" width="${famW}" height="21" rx="10.5" fill="${T.chip}" stroke="${T.line}" stroke-width="1"/>
      <text x="${famW / 2}" y="1" font-family="NanumGothic" font-weight="800" font-size="11" letter-spacing="1" text-anchor="middle" fill="${T.ink2}">${fam}</text>
      <text x="0" y="35" font-family="NanumSquare" font-weight="800" font-size="21" fill="${T.ink}">${name}</text>
      ${effect.map((l, i) => `<text x="0" y="${60 + i * 19.5}" font-family="NanumGothic" font-size="12.5" fill="${T.ink2}">${l}</text>`).join('')}
    </g>
  </g>`;
}

const CARDS = [
  { key: 'golden',      tier: 'gold',   fam: '보드',      name: '황금 사과', effect: ['라운드당 황금 사과 2개.', '담으면 점수 2배.'] },
  { key: 'glasscannon', tier: 'prism',  fam: '하이리스크', name: '유리대포', effect: ['점수 3배. 그러나', '타이머가 2배 속도로 흐른다.'] },
  { key: 'afterimage',  tier: 'gold',   fam: '시간',      name: '잔상',     effect: ['드래그하는 동안', '시간이 60% 느려진다.'] },
  { key: 'rearrange',   tier: 'silver', fam: '보드',      name: '재배치',   effect: ['시작 시 합 10 짝을', '여러 개 만들어 준다.'] },
];

const DEFS = `
  <filter id="cardShadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="7" stdDeviation="11" flood-color="#6e4a22" flood-opacity="0.16"/></filter>
  <filter id="blurS" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.6"/></filter>
  <filter id="blurM" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3.2"/></filter>
  <filter id="glowS" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="1.1"/></filter>`;

const COLW = CW + 40, ROWH = CH + 44;
function sheet() {
  const cols = 2, rows = 2;
  const M = 64;
  const W = M * 2 + cols * COLW - 40;
  const H = 156 + rows * ROWH;
  let body = '';
  CARDS.forEach((c, i) => {
    body += card(M + (i % cols) * COLW, 156 + Math.floor(i / cols) * ROWH, c, ART[c.key]());
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>${DEFS}
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FDF8EE"/><stop offset="100%" stop-color="#F7EFE0"/></linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <text x="${M}" y="68" font-family="NanumSquare" font-weight="800" font-size="32" fill="${T.ink}">증강 카드 — 채색형 (정교 버전)</text>
    <text x="${M}" y="102" font-family="NanumGothic" font-size="15.5" fill="${T.ink2}">다층 그라데이션 · 스페큘러 하이라이트 · 소프트 그림자/글로우로 마감한 일러스트 엠블럼</text>
    <line x1="${M}" y1="124" x2="${W - M}" y2="124" stroke="${T.line}" stroke-width="1.5"/>
    ${body}
  </svg>`;
}

function render(svg, file, zoom = 2.4) {
  writeFileSync(file, new Resvg(svg, { fitTo: { mode: 'zoom', value: zoom }, font: { loadSystemFonts: true } }).render().asPng());
  console.log('wrote', file);
}

render(sheet(), out('시안_채색형_정교.png'));
