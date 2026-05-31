/**
 * candyApple — 보드 사과 렌더러 (파일명은 과거 모델의 잔재일 뿐, 현재 디자인은 아래와 같다).
 *
 * 현재 룩 = 업로드된 HTML 시안(사과 — 위로+왼쪽 잎) 그대로의 "정적 평면 사과":
 *   - 본체: border-radius:50% 와 동일한 완전한 원(arc 클립).
 *   - 색: radial-gradient(72% 60% at 50% 30%, #ED6138 / #E5512C 56% / #DC4824) 한 겹.
 *   - 그림자: filter:drop-shadow(0 1.5px 2px rgba(40,18,12,.28)) (캔버스 shadow 로 근사).
 *   - 꼭지: 둥근 막대, 잎: 페탈(0 100% 0 100%) — HTML 의 위치/각도 그대로.
 *   - 숫자: weight 800, 색 #FFF4EC(변형별).
 *   ⚠️ 캔디 글로스(sheen/specular/ambient/rim)·낮밤 시간반응은 모두 제거됨(평면).
 *
 * 참고: 아래 sceneAt/lookAt/SCENE_KEYS 등 '낮밤 광원' 코드는 현재 렌더에 쓰이지 않는
 *       잔재다(평면이라 look 무시). BoardView 가 아직 import 하므로 남겨둔 것뿐이며,
 *       다음 정리에서 제거 예정. 사과 외형은 전적으로 drawApple 만 결정한다.
 *
 * 이 모듈은 board/ 렌더 레이어 전용이며 코어 순수성과 무관하다.
 * (offscreen canvas 2D 사용 → PixiJS 텍스처로 업로드)
 */
import type { CellTag } from '../contracts';

/** 사과 변형 종류 = 보드 셀 태그. 보디 팔레트·광택·숫자 색만 달라진다. */
export type AppleVariant = CellTag;

/** 확정 실루엣 path (viewBox 0 0 100 100, 좌우 대칭, 상단 중앙 꼭지 패임) */
export const APPLE_SILHOUETTE =
  'M45 14C48 17 52 17 55 14C68 9 91 23 91 51C91 74 73 90 50 90C27 90 9 74 9 51C9 23 32 9 45 14Z';

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): Rgb {
  const h = hex.replace('#', '');
  const norm =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  const n = parseInt(norm, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex({ r, g, b }: Rgb): string {
  const c = (v: number): string =>
    Math.round(Math.max(0, Math.min(255, v)))
      .toString(16)
      .padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** 두 색을 t(0..1)로 선형 보간 */
function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex({
    r: A.r + (B.r - A.r) * t,
    g: A.g + (B.g - A.g) * t,
    b: A.b + (B.b - A.b) * t,
  });
}

const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;

// ── 낮밤 키프레임 (scene.js > KF, R1 아침 → R5 밤) ─────────────────────────
// t 를 (KF.length-1) 구간으로 균등 보간한다(scene.js > frame).
interface SceneKey {
  /** sky[0..2] (위/중/아래 하늘색). hl 반사는 sky1(중간)을 쓴다. */
  sky: [string, string, string];
  /** 해/달 디스크 색 — rim light 색. */
  disc: string;
  /** 밤 정도 0..1. */
  star: number;
}

const SCENE_KEYS: SceneKey[] = [
  { sky: ['#A9C8E4', '#FCE6CB', '#F8CF9E'], disc: '#FFF1CC', star: 0.0 }, // R1 아침
  { sky: ['#8FBFE9', '#EAF3F7', '#FCF4DE'], disc: '#FFFEF6', star: 0.0 }, // R2 한낮
  { sky: ['#A6BFDC', '#FFE7B8', '#FFD295'], disc: '#FFE3A4', star: 0.0 }, // R3 오후
  { sky: ['#7E6CA6', '#FF9C76', '#FFC062'], disc: '#FF865A', star: 0.22 }, // R4 해질녘
  { sky: ['#10173A', '#1E2A52', '#34375F'], disc: '#DCE4FF', star: 1.0 }, // R5 밤
];

export interface SceneFrame {
  sky1: string;
  disc: string;
  star: number;
}

/** 진행도 t로 하늘/광원 프레임을 보간. (scene.js > frame) */
export function sceneAt(t: number): SceneFrame {
  const x = clamp01(t);
  const seg = x * (SCENE_KEYS.length - 1);
  let i = Math.floor(seg);
  if (i >= SCENE_KEYS.length - 1) i = SCENE_KEYS.length - 2;
  const k = seg - i;
  const A = SCENE_KEYS[i];
  const B = SCENE_KEYS[i + 1];
  return {
    sky1: mix(A.sky[1], B.sky[1], k),
    disc: mix(A.disc, B.disc, k),
    star: lerp(A.star, B.star, k),
  };
}

// ── 확정 LOOK 토큰 (candy.js > LOOK, tweakable_locked) ─────────────────────
const LOOK_SKY = 0.6;
const LOOK_RIM = 0.55;
const LOOK_DEPTH = 0.35;

/** 모든 사과가 공유하는 광원 룩 (apple-spec.json > lightModel.formulas) */
export interface AppleLook {
  /** sheen(하늘 반사 하이라이트) 색 */
  hl: string;
  /** 하단 음영 강도 0..1 */
  amb: number;
  /** 림 라이트 색(해/달 디스크) */
  rim: Rgb;
  /** 림 라이트 강도 0..1 */
  rim_a: number;
  /** 접지 그림자 알파 0..1 */
  shadow_a: number;
}

/**
 * 라운드 진행도 t로부터 공유 룩 계산. 매 프레임 1회만 호출하면 된다.
 * (candy.js > applyLookTo 의 식과 동일)
 */
export function lookAt(t: number): AppleLook {
  const f = sceneAt(t);
  return {
    hl: mix('#ffffff', f.sky1, Math.min(LOOK_SKY, 1) * 0.72),
    amb: 0.22 + LOOK_DEPTH * 0.5 + f.star * 0.16,
    rim: hexToRgb(f.disc),
    rim_a: Math.min(LOOK_RIM * (0.34 + 0.66 * Math.max(f.star, 0.22)), 1),
    shadow_a: 0.6 + LOOK_DEPTH * 0.6,
  };
}

// ── 변형별 스펙 (apple-spec.json > palette / variants) ──────────────────────
interface VariantSpec {
  /** 베이스 linear 176° (top → mid → bot) */
  palette: [string, string, string];
  /** 하단 코어 음영 색 (알파는 look.amb) */
  amb: [number, number, number];
  /** 숫자 색 */
  number: string;
  /** sheen 색. 'sky' = 하늘 반사 hl(동적), 그 외 = 고정 색. */
  sheen: 'sky' | string;
  /** 고정 스페큘러(흰 점) 알파. 없으면 미사용(=확정 광택 0). */
  specular?: number;
  /** 와일드 이리데센트 글린트 */
  iridescent?: boolean;
  /** 무지개(와일드) 베이스 — palette 대신 5색 분광 그라데이션 */
  rainbow?: boolean;
  /** 폭탄 — 잎 대신 도화선 + 불꽃 스파클 */
  fuse?: boolean;
  /** 잎 그라데이션 (leaf1 → leaf2) */
  leaf: [string, string];
  /** 꼭지 그라데이션 (top → bot) */
  stem: [string, string];
}

const VARIANTS: Record<AppleVariant, VariantSpec> = {
  // 확정 베이스 톤(소프트 코럴)
  normal: {
    // 사과 시안 v2.html 본체 색 (radial 72% 60% at 50% 30%)
    palette: ['#ED6138', '#E5512C', '#DC4824'],
    amb: [70, 16, 8],
    number: '#FFF4EC',
    sheen: 'sky',
    // v2 이파리/꼭지 그라데이션
    leaf: ['#69B23A', '#4C9626'],
    stem: ['#7C4B2B', '#5C3620'],
  },
  golden: {
    palette: ['#f4c659', '#dca21f', '#ad7d13'],
    amb: [90, 60, 8],
    number: '#5a3c08',
    sheen: '#ffe9a8',
    specular: 0.55,
    leaf: ['#cdd07a', '#9aa24e'],
    stem: ['#8a5630', '#5f3a1f'],
  },
  wild: {
    palette: ['#9e92ff', '#7d6df0', '#5f4cd6'],
    amb: [40, 24, 90],
    number: '#ffffff',
    sheen: '#fdeaff',
    specular: 0.5,
    rainbow: true,
    leaf: ['#9fe6c4', '#56b78c'],
    stem: ['#6a5cc0', '#473a90'],
  },
  // 핸드오프에 없는 증강 사과 — 같은 광원 모델로 톤만 파생(보석 청록 / 폭탄 슬레이트).
  gem: {
    palette: ['#6fe3e0', '#2bb6c8', '#1c7e96'],
    amb: [8, 60, 70],
    number: '#eafdff',
    sheen: 'sky',
    leaf: ['#9ee0d8', '#4fb3ad'],
    stem: ['#3a7d70', '#1f5048'],
  },
  bomb: {
    palette: ['#6a6f86', '#454a63', '#2a2e44'],
    amb: [20, 20, 44],
    number: '#f2f2f6',
    sheen: 'sky',
    fuse: true,
    leaf: ['#9bbf7e', '#6f9a52'],
    stem: ['#5a5060', '#3a3340'],
  },
};

/**
 * 0..100 박스에 타원형 radial-gradient 를 채운다(CSS `radial-gradient(rx% ry% at cx cy)`).
 * 캔버스 radial 은 원형뿐이라 스케일로 타원을 흉내낸다. 클립 영역 밖은 어차피 잘린다.
 */
function radialFill(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  stops: Array<[number, string]>,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(rx, ry);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  for (const [off, col] of stops) g.addColorStop(off, col);
  ctx.fillStyle = g;
  ctx.fillRect(-300, -300, 600, 600);
  ctx.restore();
}

export interface DrawAppleOptions {
  /** 셀(=텍스처) 한 변 픽셀 크기 */
  size: number;
  /** 표시할 숫자 (null이면 숫자 생략 — 보디만) */
  value: number | null;
  /** 공유 광원 룩 */
  look: AppleLook;
  /** 변형 */
  variant?: AppleVariant;
  /** 꼭지·잎 표시 (기본: size>24, apple-spec.json > geometry.lod) */
  decorations?: boolean;
}

/**
 * 사과 1개를 (0,0)~(size,size) 영역에 그린다.
 * 업로드된 HTML(사과 — 위로+왼쪽 잎) 그대로의 정적 평면 룩:
 *   원형 본체(border-radius:50%) + 평면 radial 한 겹 + drop-shadow.
 * 캔디 글로스(sheen/ambient/rim)·낮밤 시간반응은 제거됐다(look 미사용).
 */
export function drawApple(ctx: CanvasRenderingContext2D, opt: DrawAppleOptions): void {
  const { size, value } = opt;
  const variant = opt.variant ?? 'normal';
  const v = VARIANTS[variant] ?? VARIANTS.normal;
  const showDeco = opt.decorations ?? size > 24;
  const s = size / 100; // 0..100 정규 좌표 → 픽셀
  const cx = size * 0.5;
  const cy = size * 0.5;
  const r = size * 0.5; // border-radius:50% → 완전한 원

  // ── 본체 그림자: filter:drop-shadow(0 1.5px 2px rgba(40,18,12,.28)) ──
  // HTML 150px 기준값을 셀 크기에 비례시킨다(1.5/150, 2/150).
  // 불투명 원을 한 번 그려 그림자만 남기고, 본체로 완전히 덮는다.
  ctx.save();
  ctx.shadowColor = 'rgba(40,18,12,0.28)';
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = size * 0.01;
  ctx.shadowBlur = size * 0.0133;
  ctx.fillStyle = v.palette[2];
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── 본체: 원형 클립 안, 평면 radial 한 겹 ──
  //   background: radial-gradient(72% 60% at 50% 30%, #ED6138, #E5512C 56%, #DC4824)
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.scale(s, s);
  if (v.rainbow) {
    // wild matches any value → a 5-colour prism along a 176° axis.
    const rad = (176 * Math.PI) / 180;
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);
    const g1 = ctx.createLinearGradient(50 - dx * 50, 50 - dy * 50, 50 + dx * 50, 50 + dy * 50);
    g1.addColorStop(0, '#ff9ec4');
    g1.addColorStop(0.25, '#ffe08a');
    g1.addColorStop(0.5, '#8fe6c8');
    g1.addColorStop(0.72, '#7fc4f0');
    g1.addColorStop(1, '#b3a8ff');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, 100, 100);
  } else {
    radialFill(ctx, 50, 30, 72, 60, [
      [0, v.palette[0]],
      [0.56, v.palette[1]],
      [1, v.palette[2]],
    ]);
  }
  ctx.restore();

  // 꼭지·잎은 보디 위(앞)에 얹는다 (HTML z-순서: 잎/꼭지 > 과일).
  if (showDeco) drawStemLeaf(ctx, v, s);

  // ── 숫자 (Quicksand, weight 800, 셀 0.46배) ──
  if (value != null) {
    const small = size <= 24;
    const ratio = small ? 0.52 : 0.46;
    ctx.fillStyle = v.number;
    ctx.font = `800 ${size * ratio}px Quicksand, "Pretendard Variable", Pretendard, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(120,30,16,0.36)';
    ctx.shadowBlur = small ? size * 0.04 : size * 0.05;
    ctx.shadowOffsetY = small ? 1.5 : 2;
    ctx.fillText(String(value), size * 0.5, size * 0.52);
  }
}

/** 꼭지(stem) + 잎(leaf) — 사과 시안 v2.html 디자인 이식. 0..100 정규 좌표를 s 로
 *  스케일해 그린다. 폭탄(fuse)은 잎/꼭지 대신 타들어가는 도화선 + 불꽃을 그린다.
 *  v2 의 DOM/CSS transform 을 그대로 캔버스 좌표로 옮긴다(원점·회전·박스 동일). */
function drawStemLeaf(ctx: CanvasRenderingContext2D, v: VariantSpec, s: number): void {
  ctx.save();
  ctx.scale(s, s);

  if (v.fuse) {
    drawFuse(ctx);
    ctx.restore();
    return;
  }

  // ── 꼭지(stem) — v2: 둥근 막대, transform-origin bottom-center 기준 11° 기움 ──
  //   v2 CSS: top:-10% left:47.5% width:7.5% height:24% border-radius:40% rotate(11deg)
  ctx.save();
  ctx.translate(51.25, 14); // bottom-center = left 47.5% + width/2(3.75), top -10% + height 24%
  ctx.rotate((11 * Math.PI) / 180);
  const sw = 7.5;
  const sh = 24;
  const sg = ctx.createLinearGradient(0, -sh, 0, 0);
  sg.addColorStop(0, v.stem[0]);
  sg.addColorStop(1, v.stem[1]);
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.roundRect(-sw / 2, -sh, sw, sh, sw * 0.4);
  ctx.fill();
  ctx.restore();

  // ── 잎(leaf) — v2 페탈 모양(border-radius:0 100% 0 100%), 승인된 위치 ──
  //   top:-26% left:24% width:28% height:28% rotate(-38deg) transform-origin:bottom-right
  //   → "꼭지에서 왼쪽 위로 돋아나오듯".
  ctx.save();
  ctx.translate(52, 2); // bottom-right = left24%+width28%(52), top-26%+height28%(2)
  ctx.rotate((-38 * Math.PI) / 180);
  const lw = 28;
  const lh = 28;
  // 박스(원점=BR): TL(-lw,-lh) TR(0,-lh) BR(0,0) BL(-lw,0).
  // 둥근 모서리는 TR·BL(100%), 뾰족한 꼭짓점은 TL·BR(0) → 잎 모양.
  ctx.beginPath();
  ctx.moveTo(-lw, -lh);
  ctx.quadraticCurveTo(0, -lh, 0, 0); // TL → (TR) → BR
  ctx.quadraticCurveTo(-lw, 0, -lw, -lh); // BR → (BL) → TL
  ctx.closePath();
  // v2 linear-gradient(150deg): 우상(밝은 #leaf0) → 좌하(어두운 #leaf1)
  const lg = ctx.createLinearGradient(0, -lh, -lw, 0);
  lg.addColorStop(0, v.leaf[0]);
  lg.addColorStop(1, v.leaf[1]);
  ctx.fillStyle = lg;
  ctx.fill();
  // v2 box-shadow: inset -1px -1px → 우하단(원점쪽) 안쪽 그림자
  ctx.clip();
  const ish = ctx.createRadialGradient(0, 0, 0, 0, 0, lw * 0.55);
  ish.addColorStop(0, 'rgba(0,0,0,0.18)');
  ish.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = ish;
  ctx.fillRect(-lw, -lh, lw, lh);
  ctx.restore();

  ctx.restore();
}

/** 폭탄 도화선 + 끝의 불꽃 스파클. 0..100 좌표(호출부에서 이미 스케일됨). */
function drawFuse(ctx: CanvasRenderingContext2D): void {
  // 도화선 — 딤플에서 우상단으로 살짝 휘어 올라간다
  ctx.strokeStyle = '#8a6a40';
  ctx.lineWidth = 3.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(50, 14);
  ctx.quadraticCurveTo(54, 6, 62, 8);
  ctx.stroke();

  const tx = 62;
  const ty = 8;
  // 불꽃 글로우
  const gg = ctx.createRadialGradient(tx, ty, 0, tx, ty, 7);
  gg.addColorStop(0, 'rgba(255,255,255,0.95)');
  gg.addColorStop(0.5, 'rgba(255,181,58,0.7)');
  gg.addColorStop(1, 'rgba(255,181,58,0)');
  ctx.fillStyle = gg;
  ctx.beginPath();
  ctx.arc(tx, ty, 7, 0, Math.PI * 2);
  ctx.fill();
  // 4갈래 스파클 + 흰 코어
  ctx.fillStyle = '#fff3c4';
  const r = 6;
  ctx.beginPath();
  ctx.moveTo(tx, ty - r);
  ctx.lineTo(tx + r * 0.3, ty);
  ctx.lineTo(tx, ty + r);
  ctx.lineTo(tx - r * 0.3, ty);
  ctx.closePath();
  ctx.moveTo(tx - r, ty);
  ctx.lineTo(tx, ty - r * 0.3);
  ctx.lineTo(tx + r, ty);
  ctx.lineTo(tx, ty + r * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(tx, ty, 1.8, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * 텍스처 여백(셀 크기 대비 비율). 잎(top:-26%)·꼭지(top:-10%)가 본체 위로
 * 솟아 캔버스 경계에 잘리지 않도록 위쪽에 넉넉히, drop-shadow 가 잘리지 않도록
 * 아래쪽에 약간 둔다. 좌우는 잎이 본체 안쪽(x≈12.7~34)이라 여백이 필요 없다.
 * board 레이어(BoardView)가 같은 값으로 스프라이트 앵커·크기를 맞춘다.
 */
export const APPLE_TEX_PAD = { top: 0.32, bottom: 0.08 };

/**
 * 사과(보디) 텍스처용 offscreen 캔버스를 만들어 그린다.
 * 반환된 canvas를 PixiJS Texture.from(canvas)로 업로드해 Sprite로 사용.
 * 숫자는 board 레이어가 별도 Text로 얹으므로 기본 value=null(보디만).
 * 캔버스는 size×size 가 아니라 위/아래 여백을 더한 size×(size·ratio) 이며,
 * 본체(원형)의 (0,0)~(size,size) 영역은 위쪽 여백만큼 아래로 평행이동돼 그려진다.
 */
export function renderAppleCanvas(
  opt: Omit<DrawAppleOptions, 'value'> & { value?: number | null; resolution?: number },
): HTMLCanvasElement {
  const resolution =
    opt.resolution ?? (typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1);
  const { size } = opt;
  const w = size;
  const h = size * (1 + APPLE_TEX_PAD.top + APPLE_TEX_PAD.bottom);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * resolution));
  canvas.height = Math.max(1, Math.round(h * resolution));
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.scale(resolution, resolution);
    ctx.translate(0, size * APPLE_TEX_PAD.top);
    drawApple(ctx, { ...opt, value: opt.value ?? null });
  }
  return canvas;
}

/** 변형별 숫자 색 (board 레이어의 Pixi Text 가 참조). */
export function numberColor(variant: AppleVariant): string {
  return (VARIANTS[variant] ?? VARIANTS.normal).number;
}
