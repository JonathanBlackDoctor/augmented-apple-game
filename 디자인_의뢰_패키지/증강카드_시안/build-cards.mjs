/* build-cards.mjs — 증강 카드 아트 시안 생성기
 * 기존 무드보드(styles.css / apple-shapes.css)의 dir-a "햇살 과수원" 팔레트와
 * .aug-card 디자인 언어를 그대로 따른다. 아직 아트가 없는 증강 4종을
 * 두 가지 스타일 시안(A: 채색형 / B: 라인형)으로 풀카드 렌더한다.
 *
 *   node build-cards.mjs   →  *.png 출력
 */
import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const out = (name) => fileURLToPath(new URL('./' + name, import.meta.url));

// ── dir-a "햇살 과수원" 토큰 ──────────────────────────────────────
const T = {
  paper2: '#FFFDF7', ink: '#3A2A1E', ink2: '#836A54', line: '#EADCC4',
  chip: '#FFFDF7', apple: '#E04A36', apple2: '#B8311E', appleHi: '#FF9A77',
  gold: '#E3A12A', gold2: '#B97F12', goldBg: '#FBEFD2', leaf: '#5E9A4E',
};
// 티어 아트 배경 (apple-shapes.css .aug-art 그라데이션)
const TIER_ART = {
  silver: ['#f4f7fa', '#d8e0e9'],
  gold:   ['#fdf0cf', '#f1d281'],
  prism:  ['#f0ebff', '#dcf6fb'],
};
const APPLE = 'M44 15C47 18 53 18 56 15C67 11 90 24 90 50C90 73 72 89 50 89C28 89 10 73 10 50C10 24 33 11 44 15Z';

let U = 0; const uid = () => 'u' + (U++);

// ── 엠블럼: 채색형(A) ─────────────────────────────────────────────
const ART_A = {
  // 황금 사과 — 윤기 흐르는 금사과 + ×2
  golden() {
    const g = uid();
    return `
    <defs>
      <radialGradient id="${g}-glow" cx="50%" cy="44%" r="55%"><stop offset="0%" stop-color="#fff6d8"/><stop offset="100%" stop-color="#fff6d8" stop-opacity="0"/></radialGradient>
      <linearGradient id="${g}-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffeaa0"/><stop offset="48%" stop-color="#f3c33d"/><stop offset="100%" stop-color="#cf8f10"/></linearGradient>
      <radialGradient id="${g}-sh" cx="38%" cy="22%" r="42%"><stop offset="0%" stop-color="#fffdf2" stop-opacity=".9"/><stop offset="100%" stop-color="#fffdf2" stop-opacity="0"/></radialGradient>
    </defs>
    <circle cx="50" cy="51" r="44" fill="url(#${g}-glow)"/>
    <line x1="51" y1="22" x2="58" y2="11" stroke="#7a5320" stroke-width="3" stroke-linecap="round"/>
    <path d="M58 11 C70 4 80 9 78 20 C66 24 58 20 58 11Z" fill="${T.leaf}"/>
    <path d="M60 16 C66 13 72 13 75 15" stroke="#3f7a33" stroke-width="1.2" fill="none" stroke-linecap="round"/>
    <path d="${APPLE}" fill="url(#${g}-b)" stroke="#fff4cf" stroke-width="1.4"/>
    <ellipse cx="40" cy="36" rx="15" ry="11" fill="url(#${g}-sh)"/>
    <g fill="#fffaf0">
      <path d="M70 60 l2.4 5 5 2.4 -5 2.4 -2.4 5 -2.4 -5 -5 -2.4 5 -2.4Z"/>
      <circle cx="30" cy="64" r="2.4"/>
    </g>
    <g font-family="NanumSquare, NanumGothic" font-weight="800" fill="#fff">
      <text x="49" y="66" font-size="22" text-anchor="middle" stroke="#cf8f10" stroke-width="3.4" paint-order="stroke">×2</text>
      <text x="49" y="66" font-size="22" text-anchor="middle">×2</text>
    </g>`;
  },
  // 유리대포 — 프리즘 포신이 무지개 파편을 발사 + 균열(리스크) + ×3
  glasscannon() {
    const g = uid();
    return `
    <defs>
      <radialGradient id="${g}-glow" cx="44%" cy="52%" r="56%"><stop offset="0%" stop-color="#eef0ff"/><stop offset="100%" stop-color="#eef0ff" stop-opacity="0"/></radialGradient>
      <linearGradient id="${g}-bar" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f3f0ff"/><stop offset="50%" stop-color="#c7b6ff"/><stop offset="100%" stop-color="#8f7be8"/></linearGradient>
    </defs>
    <circle cx="50" cy="50" r="45" fill="url(#${g}-glow)"/>
    ${['#ff5a6e','#ff9f43','#ffd23f','#4fd17a','#3aa6ff','#9a6bff'].map((c,i)=>`<line x1="66" y1="40" x2="96" y2="${22+i*6.6}" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`).join('')}
    <circle cx="68" cy="40" r="7" fill="#fff" opacity=".9"/>
    <g transform="rotate(-26 40 56)">
      <rect x="12" y="46" width="48" height="20" rx="6" fill="url(#${g}-bar)" stroke="#fff" stroke-width="1.3"/>
      <rect x="14" y="49" width="44" height="5" rx="2.5" fill="#fff" opacity=".45"/>
      <circle cx="20" cy="56" r="3.4" fill="#fff" opacity=".7"/>
    </g>
    <path d="M30 70 l5 -6 -3 -2 5 -7" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <g font-family="NanumSquare, NanumGothic" font-weight="800">
      <text x="34" y="40" font-size="19" text-anchor="middle" fill="#fff" stroke="#8f7be8" stroke-width="3.2" paint-order="stroke">×3</text>
      <text x="34" y="40" font-size="19" text-anchor="middle" fill="#fff">×3</text>
    </g>`;
  },
  // 잔상 — 사과가 남기는 잔상 트레일 + 모션 라인
  afterimage() {
    const g = uid();
    return `
    <defs>
      <radialGradient id="${g}-glow" cx="56%" cy="48%" r="56%"><stop offset="0%" stop-color="#fff3d6"/><stop offset="100%" stop-color="#fff3d6" stop-opacity="0"/></radialGradient>
      <linearGradient id="${g}-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${T.appleHi}"/><stop offset="100%" stop-color="${T.apple}"/></linearGradient>
    </defs>
    <circle cx="52" cy="50" r="44" fill="url(#${g}-glow)"/>
    <g transform="translate(-22 0) scale(.86)" transform-origin="50 50"><path d="${APPLE}" fill="${T.apple}" opacity=".14"/></g>
    <g transform="translate(-11 0) scale(.93)" transform-origin="50 50"><path d="${APPLE}" fill="${T.apple}" opacity=".28"/></g>
    <g transform="translate(8 0)">
      <line x1="50" y1="22" x2="57" y2="12" stroke="#6e4a22" stroke-width="3" stroke-linecap="round"/>
      <path d="M57 12 C68 6 77 11 75 20 C64 24 57 20 57 12Z" fill="${T.leaf}"/>
      <path d="${APPLE}" fill="url(#${g}-b)" stroke="#ffd9c8" stroke-width="1.2"/>
      <ellipse cx="42" cy="38" rx="13" ry="9" fill="#fff" opacity=".4"/>
    </g>
    <g stroke="${T.gold}" stroke-width="2.4" stroke-linecap="round" opacity=".85">
      <line x1="6" y1="40" x2="20" y2="40"/><line x1="2" y1="52" x2="14" y2="52"/><line x1="8" y1="64" x2="19" y2="64"/>
    </g>`;
  },
  // 재배치 — 두 사과가 자리를 바꿔 합 10을 만든다
  rearrange() {
    const g = uid();
    const mini = (x, y, fill, n) => `
      <g transform="translate(${x} ${y})">
        <path d="${APPLE}" transform="scale(.32)" fill="${fill}"/>
        <text x="16" y="21" font-family="NanumSquare" font-weight="800" font-size="14" text-anchor="middle" fill="#fff">${n}</text>
      </g>`;
    return `
    <defs>
      <radialGradient id="${g}-glow" cx="50%" cy="48%" r="55%"><stop offset="0%" stop-color="#f7fafc"/><stop offset="100%" stop-color="#f7fafc" stop-opacity="0"/></radialGradient>
    </defs>
    <circle cx="50" cy="50" r="45" fill="url(#${g}-glow)"/>
    <path d="M26 30 A30 30 0 0 1 74 30" fill="none" stroke="#9aa6b2" stroke-width="3" stroke-linecap="round"/>
    <path d="M74 30 l1 -9 -9 3Z" fill="#9aa6b2"/>
    <path d="M74 70 A30 30 0 0 1 26 70" fill="none" stroke="#9aa6b2" stroke-width="3" stroke-linecap="round"/>
    <path d="M26 70 l-1 9 9 -3Z" fill="#9aa6b2"/>
    ${mini(12, 36, T.apple, 7)}
    ${mini(56, 36, T.leaf, 3)}
    <g font-family="NanumSquare" font-weight="800">
      <text x="50" y="56" font-size="14" text-anchor="middle" fill="#fff" stroke="#51606e" stroke-width="3" paint-order="stroke">=10</text>
      <text x="50" y="56" font-size="14" text-anchor="middle" fill="#fff">=10</text>
    </g>`;
  },
};

// ── 엠블럼: 라인형(B) ─────────────────────────────────────────────
const ART_B = {
  golden() {
    const s = T.gold2;
    return `
    <path d="M50 24 C53 21 60 21 63 24" fill="none" stroke="${s}" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M63 24 C72 18 80 22 78 30 C69 33 63 30 63 24Z" fill="none" stroke="${T.leaf}" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="${APPLE}" fill="none" stroke="${s}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M34 36 C30 44 31 54 37 60" fill="none" stroke="${s}" stroke-width="2" stroke-linecap="round" opacity=".7"/>
    <text x="50" y="62" font-family="NanumSquare" font-weight="800" font-size="22" text-anchor="middle" fill="${s}">×2</text>
    <g stroke="${T.gold}" stroke-width="2" stroke-linecap="round"><line x1="74" y1="30" x2="74" y2="40"/><line x1="69" y1="35" x2="79" y2="35"/></g>`;
  },
  glasscannon() {
    return `
    ${['#ff5a6e','#ff9f43','#ffd23f','#4fd17a','#3aa6ff','#9a6bff'].map((c,i)=>`<line x1="66" y1="40" x2="94" y2="${24+i*6}" stroke="${c}" stroke-width="2.6" stroke-linecap="round"/>`).join('')}
    <g transform="rotate(-26 40 56)">
      <rect x="14" y="47" width="46" height="18" rx="6" fill="none" stroke="#8f7be8" stroke-width="3"/>
      <line x1="14" y1="56" x2="60" y2="56" stroke="#c7b6ff" stroke-width="1.6"/>
    </g>
    <path d="M30 70 l5 -6 -3 -2 5 -7" stroke="#8f7be8" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="33" y="40" font-family="NanumSquare" font-weight="800" font-size="19" text-anchor="middle" fill="#8f7be8">×3</text>`;
  },
  afterimage() {
    const s = T.apple2;
    return `
    <path d="${APPLE}" transform="translate(-20 0) scale(.86)" transform-origin="50 50" fill="none" stroke="${s}" stroke-width="2" opacity=".3"/>
    <path d="${APPLE}" transform="translate(-9 0) scale(.93)" transform-origin="50 50" fill="none" stroke="${s}" stroke-width="2.4" opacity=".55"/>
    <g transform="translate(9 0)">
      <path d="M50 24 C53 21 59 21 62 24" fill="none" stroke="${s}" stroke-width="2.2" stroke-linecap="round"/>
      <path d="${APPLE}" fill="none" stroke="${s}" stroke-width="3" stroke-linejoin="round"/>
    </g>
    <g stroke="${T.gold}" stroke-width="2.4" stroke-linecap="round"><line x1="7" y1="42" x2="20" y2="42"/><line x1="3" y1="54" x2="15" y2="54"/></g>`;
  },
  rearrange() {
    const s = '#51606e';
    const mini = (x, n) => `<g transform="translate(${x} 40)"><path d="${APPLE}" transform="scale(.3)" fill="none" stroke="${s}" stroke-width="3.4"/><text x="15" y="20" font-family="NanumSquare" font-weight="800" font-size="13" text-anchor="middle" fill="${s}">${n}</text></g>`;
    return `
    <path d="M26 30 A30 30 0 0 1 74 30" fill="none" stroke="${s}" stroke-width="3" stroke-linecap="round"/>
    <path d="M74 30 l1 -9 -9 3Z" fill="${s}"/>
    <path d="M74 70 A30 30 0 0 1 26 70" fill="none" stroke="${s}" stroke-width="3" stroke-linecap="round"/>
    <path d="M26 70 l-1 9 9 -3Z" fill="${s}"/>
    ${mini(13, 7)}${mini(57, 3)}
    <text x="50" y="57" font-family="NanumSquare" font-weight="800" font-size="13" text-anchor="middle" fill="${s}">=10</text>`;
  },
};

// ── 카드 빌더 ─────────────────────────────────────────────────────
const CW = 230, CH = 312, PAD = 16, ART_H = 150;
function tierStroke(tier, g) {
  if (tier === 'gold') return `stroke="${T.gold}" stroke-width="2"`;
  if (tier === 'prism') return `stroke="url(#${g}-pb)" stroke-width="2.4"`;
  return `stroke="#dbe2ea" stroke-width="1.6"`;
}
function card(x, y, { tier, fam, name, effect }, emblem) {
  const g = uid();
  const [c0, c1] = TIER_ART[tier];
  const lines = effect;
  const famW = fam.length * 11 + 22;
  return `
  <g transform="translate(${x} ${y})">
    <defs>
      <radialGradient id="${g}-art" cx="50%" cy="0%" r="120%"><stop offset="0%" stop-color="${c0}"/><stop offset="100%" stop-color="${c1}"/></radialGradient>
      <linearGradient id="${g}-pb" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#8a7dff"/><stop offset="50%" stop-color="#6ad7d0"/><stop offset="100%" stop-color="#ffd97a"/></linearGradient>
    </defs>
    <rect x="0.8" y="0.8" width="${CW-1.6}" height="${CH-1.6}" rx="18" fill="${T.paper2}" ${tierStroke(tier,g)}/>
    <rect x="${PAD}" y="${PAD}" width="${CW-PAD*2}" height="${ART_H}" rx="14" fill="url(#${g}-art)"/>
    <g transform="translate(${CW/2 - 66} ${PAD + ART_H/2 - 66}) scale(1.32)">
      <svg width="100" height="100" viewBox="0 0 100 100">${emblem}</svg>
    </g>
    <g transform="translate(${PAD} ${PAD + ART_H + 22})">
      <rect x="0" y="-13" width="${famW}" height="20" rx="10" fill="${T.chip}" stroke="${T.line}" stroke-width="1"/>
      <text x="${famW/2}" y="1" font-family="NanumGothic" font-weight="800" font-size="10.5" letter-spacing="1" text-anchor="middle" fill="${T.ink2}">${fam}</text>
      <text x="0" y="32" font-family="NanumSquare" font-weight="800" font-size="20" fill="${T.ink}">${name}</text>
      ${lines.map((l, i) => `<text x="0" y="${56 + i*19}" font-family="NanumGothic" font-size="12.5" fill="${T.ink2}">${l}</text>`).join('')}
    </g>
  </g>`;
}

// ── 데이터: 신규 증강 4종 ────────────────────────────────────────
const CARDS = [
  { key: 'golden',     tier: 'gold',   fam: '보드',     name: '황금 사과', effect: ['라운드당 황금 사과 2개.', '담으면 점수 2배.'] },
  { key: 'glasscannon',tier: 'prism',  fam: '하이리스크', name: '유리대포', effect: ['점수 3배. 그러나', '타이머가 2배 속도로 흐른다.'] },
  { key: 'afterimage', tier: 'gold',   fam: '시간',     name: '잔상',     effect: ['드래그하는 동안', '시간이 60% 느려진다.'] },
  { key: 'rearrange',  tier: 'silver', fam: '보드',     name: '재배치',   effect: ['시작 시 합 10 짝을', '여러 개 만들어 준다.'] },
];

// ── 시트 합성 + 렌더 ─────────────────────────────────────────────
const COLW = CW + 34, ROWH = CH + 30;
function sheet(title, sub, artset) {
  const cols = 2, rows = 2;
  const W = 64 + cols * COLW - 34 + 64;
  const H = 150 + rows * ROWH;
  let body = '';
  CARDS.forEach((c, i) => {
    const cx = 64 + (i % cols) * COLW;
    const cy = 150 + Math.floor(i / cols) * ROWH;
    body += card(cx, cy, c, artset[c.key]());
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="#FBF5E9"/>
    <text x="64" y="66" font-family="NanumSquare" font-weight="800" font-size="30" fill="${T.ink}">${title}</text>
    <text x="64" y="98" font-family="NanumGothic" font-size="15" fill="${T.ink2}">${sub}</text>
    <line x1="64" y1="120" x2="${W-64}" y2="120" stroke="${T.line}" stroke-width="1.5"/>
    ${body}
  </svg>`;
}

function render(svg, file, zoom = 2) {
  const r = new Resvg(svg, { fitTo: { mode: 'zoom', value: zoom }, font: { loadSystemFonts: true } });
  writeFileSync(file, r.render().asPng());
  console.log('wrote', file);
}

render(sheet('증강 카드 시안 A — 채색형', '윤기·광택 중심의 일러스트 엠블럼 · dir-a 햇살 과수원 팔레트', ART_A),
  out('시안A_채색형.png'));
render(sheet('증강 카드 시안 B — 라인형', '선·여백 중심의 미니멀 엠블럼 · 같은 4종, 다른 톤', ART_B),
  out('시안B_라인형.png'));

// 비교용: A·B를 한 장에 나란히
function combo() {
  const W = 64 + 2 * COLW - 34 + 64;
  const colH = 150 + 2 * ROWH;
  const H = colH;
  const styleCol = (xoff, title, artset) => {
    let b = `<text x="${xoff+0}" y="66" font-family="NanumSquare" font-weight="800" font-size="26" fill="${T.ink}">${title}</text>
      <line x1="${xoff}" y1="92" x2="${xoff + 2*COLW - 34}" y2="92" stroke="${T.line}" stroke-width="1.5"/>`;
    CARDS.forEach((c, i) => {
      const cx = xoff + (i % 2) * COLW;
      const cy = 120 + Math.floor(i / 2) * ROWH;
      b += card(cx, cy, c, artset[c.key]());
    });
    return b;
  };
  const fullW = 64 + 2*(2*COLW - 34) + 80 + 64;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${fullW}" height="${H}" viewBox="0 0 ${fullW} ${H}">
    <rect width="${fullW}" height="${H}" fill="#FBF5E9"/>
    ${styleCol(64, '시안 A · 채색형', ART_A)}
    <line x1="${64 + 2*COLW - 34 + 40}" y1="40" x2="${64 + 2*COLW - 34 + 40}" y2="${H-40}" stroke="${T.line}" stroke-width="1.5"/>
    ${styleCol(64 + 2*COLW - 34 + 80, '시안 B · 라인형', ART_B)}
  </svg>`;
}
render(combo(), out('시안_AB비교.png'), 1.7);
