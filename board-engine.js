# Handoff: 증강 사과게임 — UI · 테마 · 보드 비주얼 시스템

## Overview
증강 사과게임(Augmented Apple Game)의 풀 비주얼 리디자인 시안입니다. "합이 10이 되도록 숫자 사과를 드래그로 묶어 제거하는" 코어 위에, 라운드 사이 **증강(빌드)** 과 **1대1 대결·랭크**를 얹은 캐주얼 경쟁 퍼즐 웹게임입니다.

이 번들은 **3가지 비주얼 방향(테마)** 을 하나의 토큰 기반 시스템으로 담고 있습니다. 모두 "라이트 + 프리미엄 + 과수원" 톤 안에서 색·타이포·배경만 다릅니다. 셋 중 하나를 **주 방향으로 선택**해 출시하되, 토큰 구조는 그대로 테마 전환으로 구현하면 됩니다.

- **방향 A · 햇살 과수원 (Sunlit Orchard)** — 따뜻한 크림, 윤기 흐르는 사과, 허니 골드. *(샘플 스크린샷 기준 추천)*
- **방향 B · 갓 짠 과즙 (Fresh-Pressed)** — 시원한 화이트, 젤리빛 사과, 민트·라임.
- **방향 C · 과일 정물 (Fruit Still-Life)** — 리넨 갤러리, 무광 절제, 와인 악센트.

## About the Design Files
이 번들의 파일들은 **HTML로 만든 디자인 레퍼런스**입니다 — 의도한 룩과 동작을 보여주는 프로토타입이며, 그대로 복사해 출시하는 프로덕션 코드가 아닙니다. 목표는 이 HTML 디자인을 **타깃 코드베이스의 기존 환경(브리프 기준: React + PixiJS)에서 동일하게 재현**하는 것입니다.

- React/DOM 세계 → 홈·HUD·오버레이·버튼·카드·배지·인풋·토스트
- PixiJS/Canvas 세계 → 사과 보드·사과·선택 박스·파티클·견제 FX

아래 스펙(특히 디자인 토큰, 사과 스펙, 보드 메커닉)을 React CSS 변수 + Pixi `theme.ts` 숫자 토큰으로 옮기면 됩니다.

## Fidelity
**High-fidelity.** 색·타이포·간격·인터랙션이 최종에 가깝습니다. 픽셀 단위로 재현하되, 폰트·모션·곡선 값은 아래 토큰을 그대로 사용하세요. (단, 화면 구성은 시안 = 무드보드 형태로 나열되어 있으니, 실제 앱에서는 각 컴포넌트를 해당 화면에 배치하세요.)

## How to view the reference
`증강 사과게임 — 비주얼 방향.html`을 브라우저로 열면 pan/zoom 캔버스에 3개 방향이 나열됩니다. 각 "플레이 보드" 카드는 **실제로 드래그 가능**합니다(합 10 → 제거). `사과시안/사과 모양 시안.html`은 사과 모양/마감 탐색 기록입니다(최종 선택 = 아래 "사과 스펙").

---

## Design Tokens

### 공통(Shared)
| 토큰 | 값 |
|---|---|
| Easing (premium spring) | `cubic-bezier(.22, 1, .36, 1)` |
| Radius — 카드 | `18px` |
| Radius — 버튼 | `14px` (sm `11px`) |
| Radius — 칩/배지/타이머바 | `999px` |
| Radius — 선택 박스 | `calc(cell * 0.16)` |
| Radius — 증강 아트 타일 | `14px` |
| 그림자 — 버튼 | `0 8px 22px <apple-shadow>` |
| 그림자 — 카드 hover | `0 14px 34px rgba(0,0,0,.10)` |
| 사과 그림자 | `drop-shadow(0 1.5px 1.5px <apple-cast>)` |
| 숫자 | `tabular-nums`, weight 800 (C는 700) |

### 폰트
- **본문/UI(한글)**: Pretendard Variable (전 방향 공통)
- **디스플레이(제목)**: 방향별 — 한글 우선 + 라틴 우선 스택
  - A: `'Newsreader','Gowun Batang', serif`
  - B: `'Space Grotesk','Gowun Dodum', sans-serif`
  - C: `'Cormorant Garamond','Nanum Myeongjo', serif`
- **숫자(사과/스코어)**: A=`Pretendard`, B=`Hanken Grotesk`, C=`Archivo`
- 로딩: Pretendard는 jsDelivr CDN(@import), 나머지는 Google Fonts. 한글 서브셋 권장.

### 방향 A · 햇살 과수원
| 역할 | hex |
|---|---|
| paper / paper-2 | `#FBF5E9` / `#FFFDF7` |
| ink / ink-2 / line | `#3A2A1E` / `#836A54` / `#EADCC4` |
| apple / apple-2 / apple-hi | `#E04A36` / `#B8311E` / `#FF9A77` |
| gold / gold-2 / gold-bg | `#E3A12A` / `#B97F12` / `#FBEFD2` |
| leaf | `#5E9A4E` |
| valid (합10 성공) | `#3E9F63` |
| num-color | `#FFF4EC` · gloss `rgba(255,250,242,.46)` |

### 방향 B · 갓 짠 과즙
| 역할 | hex |
|---|---|
| paper / paper-2 | `#EFFAF3` / `#FBFFFD` |
| ink / ink-2 / line | `#143A2C` / `#4E7D68` / `#CFEBDC` |
| apple / apple-2 / apple-hi | `#F0514E` / `#D2322F` / `#FFC2BB` |
| accent(민트) / -2 / bg | `#18B07A` / `#0E8E61` / `#DCF6EA` |
| leaf / lime | `#36C98E` / `#A8DC4E` |
| valid | `#11A06A` |
| num-color | `#FFFFFF` · gloss `rgba(255,255,255,.5)` |

### 방향 C · 과일 정물
| 역할 | hex |
|---|---|
| paper / paper-2 | `#F1ECE2` / `#F8F4EC` |
| ink / ink-2 / line | `#221C16` / `#6E6256` / `#DDD2C2` |
| apple / apple-2 / apple-hi | `#BC4A3C` / `#99392E` / `#D98E7E` |
| gold(오커) / -2 / wine | `#C68A3A` / `#A06D24` / `#7A3B50` |
| leaf | `#7E8A52` |
| valid | `#5E8C5A` |
| num-color | `#F6EEE0` · gloss `rgba(255,242,232,.42)` |

### 증강 티어 색(랭크 티어와 별개 체계!)
- 실버 `#eef1f4` bg / `#51606e` text / dot `#8b97a3`
- 골드 `<gold-bg>` / `<gold-2>` / dot `<gold>`
- 프리즘 그라데이션 `linear-gradient(120deg, #8a7dff, #6ad7d0, #ffd97a)` / text `#6a4bd6`

---

## 사과 스펙 (가장 중요 — 모든 표면에서 동일)
선택된 최종 사과: **곡률은 통통하게(납작~잎사귀 사이), 잎 부착, 새틴 마감.**

- **실루엣(마스크)** — viewBox `0 0 100 100`, 단일 path, 셀에 `100% 100%`로 스케일:
  ```
  M44 15C47 18 53 18 56 15C67 11 90 24 90 50C90 73 72 89 50 89C28 89 10 73 10 50C10 24 33 11 44 15Z
  ```
  꼭지에 얕고 좁은 딤플 1개. (Pixi에서는 이 path를 사과 보디 외곽으로 사용하거나 SVG 스프라이트로 납품.)
- **구성**: 마스크된 보디(`.apple-body`) + 줄기 + 잎 + 숫자(마스크 밖, 항상 또렷). 숫자는 절대 마스크하지 말 것.
- **보디 그라데이션(새틴)**: `radial-gradient(78% 66% at 50% 12%, <apple-hi>, transparent 58%)` 위에 `linear-gradient(178deg, <apple> 4%, <apple-2> 54%, deeper)`.
- **새틴 광택**: 보디 위 `radial-gradient(58% 78% at 38% 20%, <gloss>, transparent 70%)`, 높이 64%. (하드한 링/유리광 금지 — 부드러운 윗면 sheen만.)
- **줄기**: 셀 기준 폭 8% × 높이 22%, `#7a4a2a`, `rotate(13deg)`.
- **잎**: 폭 33% × 높이 30%, `border-radius: 0 100% 0 100%`, `rotate(-30deg)`, `linear-gradient(135deg, <leaf 72%+white>, <leaf>)`.
- **숫자**: `font-size = cell * 0.44`, weight 800(C 700), `tabular-nums`, color `<num-color>`, `text-shadow: 0 1px 1px <num-shadow>`.
- **셀 크기 가정**: 모바일 최소 ~20px ~ 데스크톱 ~50px. 어느 극단에서도 1~9가 즉시 읽혀야 함.
- **밀도 주의**: 실제 게임은 17×10(170칸). 모든 사과에 잎을 달면 모바일 고밀도에서 다소 번잡할 수 있음 — 옵션: 잎을 더 작게/연하게, 또는 **특수 사과(황금·와일드)에만** 잎 부착. (현 시안은 전 사과에 부착.)
- **변형**: 황금(점수 2배) = 골드 그라데이션, 와일드 = conic 무지개 그라데이션. (`board-engine.js` 및 `styles.css`의 `.apple.golden/.wild .apple-body` 참고.)

정확한 코드: `board-engine.js`(보디/줄기/잎/숫자 DOM 생성), `styles.css`의 `:root --apple-mask`, `.apple` / `.apple-body` / `.apple .leaf`.

---

## 게임 보드 (코어 표면)
- **격자**: 게임 17열 × 10행(170칸). 정사각 셀, 화면에 꽉 맞게 가변. 데모 엔진은 12×8 @ 40px.
- **드래그 선택**: 포인터(마우스+터치)로 직사각형 드래그. 박스 안 살아있는 사과 숫자 **합이 정확히 10**이면 떼는 순간 모두 제거 + 점수(사과 1개=1점).
- **선택 박스 상태**:
  - 진행 중(합≠10): `2.5px dashed <sel-border>`, 배경 `rgba(0,0,0,.05)`, radius `cell*0.16`.
  - 유효(합=10): `solid <valid>` + 배경 `<valid-bg>` + glow `0 0 0 3px <valid-ring>, 0 6px 22px <valid-ring>`. 가장 중요한 긍정 피드백.
- **선택 중 셀**: 사과 `transform: scale(1.07)`.
- **제거 모션**: 사과 `ab-pop` `.34s`(scale 1.07→1.28→0). 파티클 버스트 `ab-burst` `.56s`(셀당 5개, 사방으로). 점수 팝 `+N` `ab-rise` `.7s`(4개↑ 제거 시 `.big`, 골드 컬러).
- **콤보**: 성공 제거마다 +1, 2.6초 무동작 시 0으로 리셋.
- **타이머**: 라운드 30초. 첫 입력에 시작. `≤5초` 경고 = 타이머바 `<apple>` 컬러 + `t-pulse .7s` 깜빡임. 0초 → 보드 프리즈 + "다시 플레이" 오버레이.
- **빈 칸**: 사과 그룹 `opacity:0; scale(.2)`.
- 정확한 로직: `board-engine.js` (`mountAppleBoard(root, {cols,rows,cell,total,onUpdate})`).

---

## 화면(Screens) & 컴포넌트

각 화면은 방향별 `.board-surface`(테마 배경) 위에 올라갑니다. 아래는 시안에 구현된 컴포넌트:

### HUD (게임 중)
- 라운드 칩 `R n/5` (chip), 점수(숫자 폰트, `<apple>`, 30px + "점" 14px), 콤보 칩(2콤보↑ 등장, `<gold>` bg, white).
- 타이머바: 높이 9px, 트랙 `<track>`, fill `<valid>`(경고 시 `<apple>`), 우측 남은 초(숫자 폰트, 17px).

### 증강 선택 오버레이
- 상단: 티어 배지(실버/골드/프리즘) + 제목(디스플레이 폰트) "증강 선택" + 안내 "하나를 골라 빌드를 쌓으세요 · 리롤 없음".
- 카드 3장(grid 1fr×3, gap 13px), 각 카드: **아트 타일(높이 112px, 티어별 radial bg)** + 계열 pill + 이름(디스플레이) + 효과 설명.
  - 골드 카드: `<gold>` 테두리 + 골드 그라데이션 bg.
  - 프리즘 카드: 무지개 그라데이션 테두리 + `prism-shine 4.5s` 스윕 애니메이션.
- hover: `translateY(-4px)` + 그림자.

### 증강 아이콘(아트) — 큰 엠블럼, 타일을 가득 채움
6개 계열(시간·콤보·보드·룰·하이리스크·견제) × 3티어(실버/골드/프리즘) = 총 22종 필요. 시안엔 대표 3종 SVG 구현:
- **시간(여유)**: 스틸 그라데이션 시계 + 눈금 + 바늘 + 초록 "+시간" 호 화살표.
- **콤보(연쇄)**: 골드 4방향 스파클 + 방사 광선 + 작은 반짝임.
- **룰(연금술)**: 보라-청록 크리스털 프리즘 + 들어오는 흰 빛 + 6색 스펙트럼 분산.
양식: 면(글리프) + 그라데이션, 타일을 가득 채우는 회화적 엠블럼. 정확한 SVG: `moodboard.jsx`의 `ART` 객체. (그라데이션 id는 인스턴스마다 유니크하게 — `ART.x(uid)` 패턴 참고.)

### 랭크 티어 배지(7종) — 증강 티어와 다른 체계
육각 크레스트(쉴드) + 메탈 그라데이션 + 중앙 보석(다이아 컷) + 티어별 장식(측면 점 → 중앙 점 → 왕관).
- path: `M24 2 L44 13 V35 L24 52 L4 35 V13 Z` (viewBox 48×54), 보석 `M24 15 L33 27 L24 41 L15 27 Z`.
- 메탈/보석 컬러: Iron `#9aa0a8/#565c65`, Bronze `#cd9163/#875530`, Silver `#e9eef4/#9aa6b2`, Gold `#f8db80/#c7921f`, Platinum `#e2f2ee/#8fc7ba`, Diamond `#d8edff/#7aa6ff`, Master `#edd8f8/#9a5ad0`(왕관).
- MMR 구간: <800 Iron / 800–999 Bronze / 1000–1199 Silver / 1200–1399 Gold / 1400–1599 Platinum / 1600–1799 Diamond / ≥1800 Master.
- 정확한 SVG: `moodboard.jsx`의 `RankEmblem` + `RANKS`.

### 버튼
- primary: `<apple>` bg, white, radius 14, padding 13/20, shadow `0 8px 22px <apple-shadow>`.
- gold: `<gold>` bg / versus: `<ink>` bg, `<paper-2>` text / ghost: 투명 + `1.5px <line>` 테두리.
- hover 전 버튼: `translateY(-2px)`.

### 칩 · 배지 · 결과 · 토스트
- chip: 높이 32–34px, `<chip-bg>` + `1px <line>`, radius 999. accent=`<gold>`, combo=`<apple>`.
- 결과 카드: 제목(디스플레이, `<valid>`), 큰 점수(숫자 42px), 메타, `MMR +N` 펠릿(`<valid-bg>`).
- 토스트: `<ink>` bg, `<paper-2>` text, 좌측 체크 동그라미(`<valid>`).

---

## 배경 — 포근한 정원 (은은한 모션, 시선을 빼앗지 않음)
방향별 팔레트로 튜닝된 공통 정원 레이어. 중앙은 거의 종이색으로 비워 가독성 확보, 위/아래만 정원이 프레임.
- `g-sky` 상단 52% 하늘 그라데이션 / `g-sun` 부드러운 햇살 글로우(`g-sun 9s` 호흡) / `g-hill` 2겹 언덕(`g-sway 15~19s` 일렁임) / `g-meadow` 하단 30% 초원 / `g-breeze` 사선 빛줄기(`g-breeze 13s`) / `mote` 떠다니는 빛 입자.
- 전부 저대비/저투명도. 정확한 값: `styles.css`의 `.poster-bg` 및 `.dir-a/b/c` 변수(`--sky --sun --hill --hill2 --meadow --breeze --mote`).
- 성능: 모바일 GPU 고려, 과한 blur/filter 금지(브리프 §3).

## 모션 원칙
- 기본 이징 `cubic-bezier(.22,1,.36,1)`.
- 제거 버스트 .34–.56s, 점수 팝 .7s, 버튼/카드 hover .12–.16s, 프리즘 스윕 4.5s, 정원 모션 9–19s.

## State (참고 — 게임 로직은 거의 완성, 브리프 §9 코드 위치 참고)
- 라운드(1–5), 점수, 콤보, 남은 시간, 보유 증강 목록, (대결) 상대 점수·라운드 승수·MMR.

## Assets
- 외부 이미지 없음. 모든 그래픽은 CSS 그라데이션 + 인라인 SVG(마스크/아이콘/배지)로 생성.
- 폰트: Pretendard(jsDelivr), Newsreader·Space Grotesk·Hanken Grotesk·Cormorant Garamond·Archivo·Gowun Batang·Gowun Dodum·Nanum Myeongjo(Google Fonts).

## Files (이 번들)
| 파일 | 내용 |
|---|---|
| `증강 사과게임 — 비주얼 방향.html` | 메인 레퍼런스(3방향 무드보드 + 플레이 보드) |
| `styles.css` | 전 토큰·컴포넌트·사과·정원 배경·3방향 테마 CSS |
| `board-engine.js` | 플레이 보드 엔진(드래그·합10·파티클·콤보·타이머·사과 DOM) |
| `moodboard.jsx` | 화면/컴포넌트 + 증강 아트(`ART`) + 랭크 배지(`RankEmblem`) |
| `design-canvas.jsx` | (시안 뷰어 전용 — 제품 일부 아님) pan/zoom 캔버스 |
| `사과시안/` | 사과 모양·마감 탐색 기록(최종 선택 = 위 "사과 스펙") |

> 구현 시: 토큰을 단일 소스(JSON/Style-Dictionary 또는 CSS 변수 + Pixi `theme.ts`)로 정리하고, 3방향은 테마 전환으로. 한 방향을 주력으로 선택해 화면을 채우세요.
