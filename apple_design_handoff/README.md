# 증강 사과게임 — 캔디 글로스 사과 핸드오프

확정된 캔디 글로스 사과를 **완전히 동일하게** 재현하기 위한 패키지입니다.
광택(스페큘러) **0**, 밤 외곽선 **미사용**, 숫자 폰트 **Quicksand**.

## 무엇부터 보면 되나

1. **`사과 구현 스펙.html`** — 가장 먼저. 실루엣·색·그라데이션 레이어·낮밤 광원 모델·타이포를
   실물 렌더와 함께 정리한 메인 스펙 시트. (브라우저로 열기. Cmd/Ctrl+P 로 PDF 저장 가능)
2. **`assets/apple-spec.json`** — 구현의 단일 진실 소스. 모든 토큰·좌표·식이 기계가독 형식.
3. **`사과 레퍼런스 (단일파일).html`** — 오프라인 단일 파일. 시간 슬라이더로 굴려가며
   **픽셀 비교**용으로 사용. (인터넷 없이 열림)

## 폴더

```
handoff/
├─ 사과 구현 스펙.html          ← 메인 스펙 시트(실물 렌더 포함)
├─ 사과 레퍼런스 (단일파일).html  ← 오프라인 인터랙티브 레퍼런스
├─ README.md
├─ assets/
│  ├─ apple-spec.json          ← 전체 토큰·그라데이션·광원 모델
│  └─ apple-silhouette.svg     ← 실루엣 path (정규화 0–100)
└─ src/                         ← 레퍼런스 구현(CSS 변수 구동)
   ├─ candy.css                ← 사과·무대 스타일
   ├─ candy.js                 ← 시간+룩 엔진(광원 모델 원본)
   ├─ scene.js                 ← 낮밤 키프레임·색 보간
   ├─ candy-tweaks.jsx         ← 조정 패널(선택)
   └─ tweaks-panel.jsx
```

## 핵심 요약

- **실루엣** `M45 14C48 17 52 17 55 14C68 9 91 23 91 51C91 74 73 90 50 90C27 90 9 74 9 51C9 23 32 9 45 14Z` (viewBox 0 0 100 100)
- **베이스 톤(소프트 코럴)** top `#e8705a` · mid `#d4513a` · bot `#9c3a2a` — linear 176°
- **하늘 반사 hl** = `mix(#ffffff, f.sky1, 0.6*0.72)` — 상단 시트로 합성
- **하단 음영 amb** = `0.22 + 0.35*0.5 + f.star*0.16`
- **림 라이트** screen 블렌드, 색 = 해/달 디스크, `rim_a = min(0.55*(0.34+0.66*max(f.star,0.22)), 1)`
- **숫자** Quicksand 600 / `0.47×셀` / `#FFF4EC`
- **광택 0, 밤 외곽선 0**

## PixiJS 포팅 메모

`src/board/BoardView.ts` 같은 코드 벡터 렌더 기준:

1. 실루엣 path 를 마스크로 사용.
2. 보디는 **base(linear) → sheen(hl radial) → ambient(amb radial)** 순서로 그림.
3. 림 라이트를 **screen** 으로 합성.
4. `hl·amb·rim·rim_a·shadow_a` 는 라운드 진행도 `t∈[0,1]` 로 매 프레임 1회 계산해
   모든 사과가 공유(사과별 계산 불필요). 식은 `apple-spec.json > lightModel.formulas` 와
   `src/candy.js > applyLookTo()` 가 동일.
5. 황금/와일드는 보디 레이어와 숫자 색만 교체(`apple-spec.json > variants`).

문의·역제안 환영합니다.
