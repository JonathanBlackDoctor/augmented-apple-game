# 증강 사과게임 (Augmented Apple Game)

합이 **10**이 되도록 숫자 사과를 드래그로 담는 사과게임(Fruit Box)의 코어 위에,
*리그 오브 레전드 아레나*식 **증강 빌드**와 **실시간 1대1 랭크 대결**을 얹는 웹 게임.
GitHub Pages 정적 배포 + Firebase 실시간 백엔드 기반.

> 현재 상태: **Phase 0(혼자 30초 사과게임) + Phase 1(5라운드 증강 루프, 각자 보드)** 까지 구현·검증 완료.
> 자세한 진행 내역은 `진행보고서_2026-05-30.md` 참고.

## 빠른 시작

```bash
npm install        # 의존성 설치
npm run dev        # 개발 서버 (http://localhost:5173)
npm run build      # 타입체크 + 프로덕션 빌드 (dist/)
npm run preview    # 빌드 결과 미리보기
npm test           # 단위 테스트 (Vitest)
npm run lint       # ESLint (코어 순수성 규칙 포함)
```

## 핵심 설계 원칙

1. **계약 우선(Contract-First)** — 모든 모듈은 `src/contracts/*` 의 타입/인터페이스를 통해서만 통신.
2. **코어 순수성(Pure Core)** — `src/core/**` 는 react·pixi.js·firebase·DOM 전역·`Date.now`·`Math.random`
   사용 금지(ESLint로 강제). 무작위성은 주입된 `SeededRng`, 시간은 주입된 단조 시계만 사용 → 결정적·재시뮬레이션 가능.
3. **단계별 출시** — 각 Phase 끝에서 `npm run build` 성공 + 단위테스트 녹색.

## 디렉터리

```
src/
  contracts/   공유 타입·이벤트·인터페이스 (로직 0)
  core/        순수 게임 엔진 (보드 생성/합10 판정/점수/타이머/replay)
  augments/    증강 카탈로그 + 훅 버스 + 3택1 런타임
  roundmodes/  대결 모드 플러그인 (separate 구현)
  board/       PixiJS 보드 렌더 + 디자인 토큰 + 레이아웃 기하
  input/       포인터/터치 드래그 → 선택 사각형
  app/         런타임 지휘자(MatchController) + zustand 스토어 + 시계/사운드
  ui/          React 화면 (홈/게임 HUD/증강 선택/결과)
  net/ profile/ ranking/ matchmaking/ bot/ social/ compat/  (Phase 2~5 예정)
firebase/      database.rules.json + emulator 설정
```

배포·Firebase·Kakao 설정은 개발 계획서 §19 및 진행보고서의 "사용자가 직접 해야 할 일"을 참고하세요.
