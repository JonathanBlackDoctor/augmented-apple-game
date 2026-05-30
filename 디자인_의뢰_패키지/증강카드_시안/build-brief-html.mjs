/* build-brief-html.mjs — 증강카드_작업요청서.md 의 HTML 판 생성
 * 기존 증강사과게임_디자인의뢰서.html 의 CSS를 그대로 재사용하고,
 * 제작 샘플 PNG를 base64로 임베드해 단일 파일로 만든다.
 *   node 디자인_의뢰_패키지/증강카드_시안/build-brief-html.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const pkg = (p) => here('../' + p);

const srcHtml = readFileSync(pkg('증강사과게임_디자인의뢰서.html'), 'utf8');
const style = srcHtml.match(/<style>[\s\S]*?<\/style>/)[0];

const imgB64 = readFileSync(here('./시안_채색형_정교.png')).toString('base64');
const imgSrc = `data:image/png;base64,${imgB64}`;

const tagOf = { 실버: 't-silver', 골드: 't-gold', 프리즘: 't-prism' };
const tag = (t) => `<span class="tag ${tagOf[t]}">${t}</span>`;

// 계열별 카탈로그 (이름, 티어, 효과, 아트 디렉션, sample?)
const FAM = [
  ['시간 (time)', [
    ['time.relief', '여유', '실버', '라운드 시작 시 +3초', '✅기존: 은빛 시계 + +시간 화살. 한 박자 여유로운 톤', 0],
    ['time.countdown', '초읽기', '실버', '콤보 성공마다 +0.5초', '초읽기 숫자/스톱워치, 째깍이는 리듬감', 0],
    ['time.afterimage', '잔상', '골드', '드래그 중 시간 60% 감속', '사과 + 잔상 트레일 + 모션 라인', 1],
    ['time.lord', '시간의 지배자', '프리즘', '미드래그 시 타이머 정지', '정지된 시계/동결된 시간, 프리즘 마감', 0],
  ]],
  ['콤보 (combo)', [
    ['combo.training', '훈련', '실버', '4개↑ 동시 제거 +5%', '반복/연습 모티프(타깃·체크) 절제 톤', 0],
    ['combo.chain', '연쇄', '골드', '콤보 유지 시 1.5×', '✅기존: 금빛 4방향 스파클/연쇄 별', 0],
    ['combo.infinite', '무한 연쇄', '프리즘', '콤보 절대 안 끊김', '무한대(∞) + 연쇄 폭발, 프리즘 홀로', 0],
  ]],
  ['보드 (board)', [
    ['board.rearrange', '재배치', '실버', '시작 시 합 10 짝 생성', '두 사과(7·3) 스왑 화살표 + 10 메달', 1],
    ['board.wild', '와일드', '실버', '라운드당 와일드 사과 1개', '물음표/무지갯빛 변환 사과', 0],
    ['board.golden', '황금 사과', '골드', '라운드당 황금 사과 2개(2배)', '윤기 금사과 + ×2 메달 + 스파클', 1],
    ['board.plenty', '풍요', '프리즘', '제거 자리 즉시 보충', '쏟아지는 사과/풍요의 뿔', 0],
  ]],
  ['룰 (rule)', [
    ['rule.kindness', '친절', '실버', '낮은 확률로 합 9 인정', '부드러운 하트/관용, 합 "9"', 0],
    ['rule.eleven', '11의 길', '골드', '합 10·11 동시 인정', '10·11 병기 표지판/갈림길', 0],
    ['rule.alchemy', '연금술', '프리즘', '10의 배수 모두 인정', '✅기존: 프리즘 크리스탈 + 무지개 분광', 0],
  ]],
  ['하이리스크 (risk)', [
    ['risk.doubleedge', '양날의 검', '골드', '점수 1.8×, 실패마다 -3', '양날 검/저울, 보상↔위험 긴장', 0],
    ['risk.glasscannon', '유리대포', '프리즘', '점수 3×, 타이머 2배 속도', '크리스탈 대포 + 무지개 발사 + 균열 + ×3', 1],
  ]],
  ['견제 (disrupt) — 대결 전용, 예정', [
    ['disrupt.blur', '눈속임', '실버', '시작 1초 상대 숫자 흐림', '흐릿한 숫자/안개, 시야 방해', 0],
    ['disrupt.junk', '잡티', '실버', '상대 보드에 잡템 사과', '벌레먹은/얼룩진 사과, 불순물', 0],
    ['disrupt.shuffle', '지진', '골드', '상대 보드 1회 셔플', '흔들리는 격자/지진 파동', 0],
    ['disrupt.freeze', '동결', '골드', '상대 타이머/입력 1.5초 정지', '얼음/서리, 정지된 입력', 0],
    ['disrupt.steal', '강탈', '프리즘', '상대 점수 20% 흡수', '빨아들이는 소용돌이/낚아채는 손', 0],
    ['disrupt.blackout', '암전', '프리즘', '상대 화면 2초 가림', '꺼지는 화면/암흑, 불길한 프리즘', 0],
  ]],
];

const catalog = FAM.map(([fam, rows]) => `
<h3>${fam}</h3>
<table>
  <thead><tr><th>ID</th><th>이름</th><th class="c">티어</th><th>효과</th><th>아트 디렉션</th></tr></thead>
  <tbody>
  ${rows.map(([id, name, tier, eff, dir, s]) => `<tr><td><span class="mono">${id}</span></td><td><strong>${name}</strong></td><td class="c">${tag(tier)}</td><td>${eff}</td><td>${s ? '<span class="tag t-done">샘플</span> ' : ''}${dir}</td></tr>`).join('\n  ')}
  </tbody>
</table>`).join('\n');

const sw = (hex, name) => `<span class="sw"><i style="background:${hex}"></i>${name} ${hex}</span>`;

const body = `
<!-- ============ COVER ============ -->
<section class="cover">
  <div class="mark">
    <svg class="logo" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 18c-7-9-22-6-22 8 0 12 11 24 22 24s22-12 22-24c0-14-15-17-22-8z" fill="#e5503b"/>
      <path d="M34 9c4-3 9-2 11 1-3 3-8 3-11-1z" fill="#5a9a48"/>
      <text x="32" y="43" text-anchor="middle" font-size="22" font-weight="800" fill="#fff" font-family="sans-serif">10</text>
    </svg>
    증강 사과게임 · Augmented Apple Game
  </div>
  <div class="hero">
    <span class="kicker">Commission Brief · 증강 카드 아트</span>
    <h1>증강 카드 아트<br/>외주 작업 요청서</h1>
    <p class="lede">증강(Augment) <strong>22종</strong> 각각의 아트 엠블럼을, 첨부 샘플과 동일한 <strong>채색형(광택 일러스트)</strong> 톤으로 제작 의뢰합니다. 6개 계열의 시각 정체성과 3개 티어의 위계가 핵심입니다.</p>
  </div>
  <div>
    <div class="meta">
      <div><b>작업 범위</b>증강 아트 엠블럼 22종 (SVG + PNG @1x/2x/3x)</div>
      <div><b>스타일</b>채색형 · 햇살 과수원 팔레트 · 광택 일러스트</div>
      <div><b>기준선</b>첨부 제작 샘플 4종</div>
      <div><b>버전</b>v1.0 · 2026-05-30</div>
    </div>
    <div class="freehand">본 문서는 <b>카드 아트에 한정</b>한 실무 요청서입니다. 게임 전체 UI/브랜딩 리디자인은 별도 문서 <b>증강사과게임_디자인의뢰서.html</b>(§06)을 참고하세요. 질문·역제안 모두 환영합니다.</div>
  </div>
</section>

<!-- ============ 0. TL;DR ============ -->
<h2 class="sec"><span class="n">00</span>한눈에 (TL;DR)</h2>
<ul>
  <li><strong>무엇을</strong> — 22개 증강 각각의 아트 엠블럼(아이콘/일러스트) 1종씩.</li>
  <li><strong>어떤 스타일로</strong> — 아래 레퍼런스와 <strong>동일한 톤</strong>(따뜻한 과수원 팔레트 + 광택 일러스트).</li>
  <li><strong>어떻게 납품</strong> — 각 엠블럼을 <strong>SVG</strong>(<span class="mono">viewBox="0 0 100 100"</span>) + <strong>PNG @1x/2x/3x</strong>, 지정 파일명 규칙으로.</li>
  <li><strong>합격 기준</strong> — 6계열 구분 · 3티어 위계 · 16px 썸네일 가독성.</li>
</ul>

<div class="call note">
  <h4>품질 기준선 — 우리가 직접 만든 샘플 4종</h4>
  <p>아래 4종(황금 사과·유리대포·잔상·재배치)이 <strong>목표 품질·톤의 기준선</strong>입니다. 같은 결을 유지하되, 더 정교하고 아름답게 끌어올려 주세요.</p>
</div>
<figure style="margin:8px 0 22px;">
  <img src="${imgSrc}" alt="증강 카드 채색형 샘플 4종" style="width:100%; border:1px solid var(--line); border-radius:14px; display:block;" />
  <figcaption style="font-size:12px; color:var(--ink-3); margin-top:8px;">샘플: 다층 그라데이션 · 스페큘러 하이라이트 · 소프트 그림자/글로우로 마감한 채색형 엠블럼.</figcaption>
</figure>

<!-- ============ 1. 컨텍스트 ============ -->
<h2 class="sec"><span class="n">01</span>게임 컨텍스트 — 왜 이 아트가 필요한가</h2>
<p>"합이 10이 되도록 숫자 사과를 드래그로 담는" 사과게임 코어 위에, <em>리그 오브 레전드 아레나식 증강 빌드</em>와 실시간 1대1 대결을 얹은 웹 게임입니다.</p>
<p>라운드마다 플레이어는 <strong>증강 카드 3장 중 1장</strong>을 골라 빌드를 쌓습니다(리롤 없음). 이 <strong>증강 선택 순간</strong>이 게임의 핵심 쾌감 지점이며, 카드 아트는 그 선택을 <strong>탐나고 설레게</strong> 만드는 역할을 합니다.</p>
<div class="call"><h4>경험 우선순위</h4><p>① 즉각적 손맛 › <strong>② 빌드의 쾌감(증강)</strong> › ③ 공정한 긴장감 › ④ 바이럴 성장. <strong>카드 아트는 ②를 직접 책임집니다.</strong></p></div>

<!-- ============ 2. 범위 ============ -->
<h2 class="sec"><span class="n">02</span>작업 범위 (Scope)</h2>
<table>
  <thead><tr><th>항목</th><th class="c">수량</th><th>비고</th></tr></thead>
  <tbody>
    <tr><td>증강 아트 엠블럼</td><td class="c"><strong>22종</strong></td><td>§06 카탈로그 (현재 12종 구현 + 대결 단계 10종)</td></tr>
    <tr><td>계열(Family) 식별 모티프</td><td class="c">6계열</td><td>22종 안에서 일관 적용 (가이드 정리 시 가산점)</td></tr>
    <tr><td>티어(Tier) 위계 표현</td><td class="c">3티어</td><td>실버/골드/프리즘 — 배경·테두리·마감에 반영</td></tr>
  </tbody>
</table>
<p class="muted"><strong>범위 외</strong>: 카드 프레임 CSS · 폰트 · 보드 아트 · 랭크 배지 · 화면 UI(별도 트랙). 단, 엠블럼이 §04 카드 슬롯 규격 안에서 보기 좋아야 합니다.</p>

<!-- ============ 3. 스타일 ============ -->
<h2 class="sec"><span class="n">03</span>스타일 디렉션 (Art Direction)</h2>
<h3>3.1 톤 &amp; 무드 — "햇살 과수원 (Sunlit Orchard)"</h3>
<p>잘 익은 과수원의 따뜻한 햇살. 크림빛 종이 위에서 윤기 흐르는 사과가 톡톡 터지는 — <strong>정성 들인 프리미엄 과일 브랜드</strong> 같은 라이트·캐주얼 톤. 어둡거나 차갑지 않게, 항상 <strong>따뜻하고 먹음직스럽게</strong>.</p>
<h3>3.2 표현 양식</h3>
<ul>
  <li><strong>채색형(면 기반) 일러스트</strong> — 단순 라인 아이콘 ❌, 입체감 있는 채색 엠블럼 ⭕.</li>
  <li><strong>다층 그라데이션</strong> — 형태마다 2~3 스톱 이상으로 양감 표현.</li>
  <li><strong>스페큘러 하이라이트</strong> — 샤프한 광택점 + 부드러운 시인(sheen).</li>
  <li><strong>소프트 그림자/글로우</strong> — 접지 그림자 · 광원 헤일로 · 미세 글로우로 공간감.</li>
  <li><strong>사과 실루엣 모티프</strong> — 게임 핵심 오브젝트. 엠블럼에 사과 DNA를 녹여 주세요(§4.3 path 제공).</li>
  <li><strong>메달형 수치 배지</strong> — 수치(×2·×3·10)는 작은 원형 메달로 통일(샘플 참조).</li>
</ul>
<h3>3.3 레퍼런스 자산</h3>
<div class="grid2">
  <div class="card"><h4>목표 기준선</h4><p><span class="mono">증강카드_시안/시안_채색형_정교.png</span> — 우리 제작 샘플 4종(위 이미지).</p></div>
  <div class="card"><h4>기존 3종 톤</h4><p><span class="mono">moodboard.jsx</span> / <span class="mono">styles.css</span>의 <span class="mono">ART</span> 객체(time·combo·rule).</p></div>
  <div class="card"><h4>생성 코드</h4><p><span class="mono">증강카드_시안/build-cards.mjs</span> — 샘플 SVG/그라데이션/필터/사과 글리프 구현(참고용).</p></div>
  <div class="card"><h4>카드 환경</h4><p><span class="mono">apple-shapes.css</span>의 <span class="mono">.aug-card</span> · <span class="mono">.aug-art</span> · <span class="mono">.dir-a</span>.</p></div>
</div>

<!-- ============ 4. 규격 ============ -->
<h2 class="sec"><span class="n">04</span>카드 슬롯 규격 (엠블럼이 놓이는 환경)</h2>
<h3>4.1 치수 (현재 구현 기준)</h3>
<table>
  <thead><tr><th>요소</th><th>값</th></tr></thead>
  <tbody>
    <tr><td>카드</td><td>244 × 338 px, radius 20</td></tr>
    <tr><td>아트 영역</td><td>카드 폭 - 34, 높이 <strong>172 px</strong>, radius 15</td></tr>
    <tr><td>엠블럼 캔버스</td><td><span class="mono">viewBox="0 0 100 100"</span>, 중앙 배치(약 1.4~1.5× 표시)</td></tr>
    <tr><td>안전 여백</td><td>100 단위 기준 상하좌우 <strong>8 이상</strong>(글로우/그림자는 넘어가도 됨)</td></tr>
  </tbody>
</table>
<h3>4.2 디자인 토큰 (dir-a "햇살 과수원")</h3>
<div class="swatches">
  ${sw('#FBF5E9', 'paper')} ${sw('#FFFDF7', 'paper-2')} ${sw('#3A2A1E', 'ink')} ${sw('#836A54', 'ink-2')}
  ${sw('#EADCC4', 'line')} ${sw('#E04A36', 'apple')} ${sw('#B8311E', 'apple-2')} ${sw('#FF9A77', 'apple-hi')}
  ${sw('#E3A12A', 'gold')} ${sw('#B97F12', 'gold-2')} ${sw('#FBEFD2', 'gold-bg')} ${sw('#5E9A4E', 'leaf')}
</div>
<h3>4.3 사과 실루엣 SVG path (100×100, 재사용 권장)</h3>
<p><span class="mono">M44 15C47 18 53 18 56 15C67 11 90 24 90 50C90 73 72 89 50 89C28 89 10 73 10 50C10 24 33 11 44 15Z</span></p>
<h3>4.4 티어별 아트 배경 (엠블럼 뒤 그라데이션)</h3>
<table>
  <thead><tr><th class="c">티어</th><th>아트 영역 배경 (radial, 위→아래)</th><th>카드 테두리</th></tr></thead>
  <tbody>
    <tr><td class="c">${tag('실버')}</td><td><span class="mono">#f6f9fc → #d7dfe9</span></td><td><span class="mono">#d3dbe5</span> 1.6px</td></tr>
    <tr><td class="c">${tag('골드')}</td><td><span class="mono">#fef3d4 → #f0cd76</span></td><td>gold 2px</td></tr>
    <tr><td class="c">${tag('프리즘')}</td><td><span class="mono">#f3eeff → #dbf4fb</span></td><td>무지개 <span class="mono">#8a7dff → #6ad7d0 → #ffd97a</span> 2.6px</td></tr>
  </tbody>
</table>
<div class="call warn"><p>엠블럼은 이 배경 위에서 <strong>명도 대비가 확보</strong>되어야 합니다(밝은 배경 → 형태에 충분한 채도/어두운 면 필요).</p></div>

<!-- ============ 5. 계열·티어 ============ -->
<h2 class="sec"><span class="n">05</span>계열 &amp; 티어 시각 시스템</h2>
<h3>5.1 6개 계열 — 각각 고유한 시각 정체성</h3>
<table>
  <thead><tr><th>계열</th><th>키워드</th><th>색/모티프 힌트</th></tr></thead>
  <tbody>
    <tr><td><strong>시간 (time)</strong></td><td>여유·감속·정지</td><td>시계/모래시계/잔상, 은빛·금빛</td></tr>
    <tr><td><strong>콤보 (combo)</strong></td><td>연속·배수·폭발</td><td>별/스파크/연쇄 화살, 골드·옐로</td></tr>
    <tr><td><strong>보드 (board)</strong></td><td>판을 유리하게</td><td>사과 그 자체·격자·정리, 레드/골드</td></tr>
    <tr><td><strong>룰 (rule)</strong></td><td>인정 조건 변경</td><td>프리즘/크리스탈/분광, 퍼플·무지개</td></tr>
    <tr><td><strong>하이리스크 (risk)</strong></td><td>고위험 고수익</td><td>균열·날·폭발·유리, 강한 대비 + 경고색</td></tr>
    <tr><td><strong>견제 (disrupt)</strong></td><td>상대 방해(대결)</td><td>흐림·셔플·동결·암전, 차갑거나 불길한 악센트</td></tr>
  </tbody>
</table>
<h3>5.2 3개 티어 — 위계가 보일 것</h3>
<table>
  <thead><tr><th class="c">티어</th><th>위계</th><th>엠블럼 마감 가이드</th></tr></thead>
  <tbody>
    <tr><td class="c">${tag('실버')}</td><td>기본</td><td>절제된 채색, 은빛 메탈/쿨그레이, 광택 최소</td></tr>
    <tr><td class="c">${tag('골드')}</td><td>강함</td><td>금빛 강조, 광택·스파클 증가, 따뜻한 헤일로</td></tr>
    <tr><td class="c">${tag('프리즘')}</td><td>최상위</td><td>무지개 분광·홀로그램, 가장 화려한 마감(가독성 유지)</td></tr>
  </tbody>
</table>

<!-- ============ 6. 카탈로그 ============ -->
<h2 class="sec"><span class="n">06</span>전체 증강 카탈로그 — 22종 (아트 1종씩)</h2>
<p class="sec-lead"><span class="mono">ID</span> = 파일명/코드 식별자(§07). <span class="tag t-done">샘플</span> = 우리 제작 샘플 존재. 아트 디렉션은 출발점 제안이며, 더 좋은 해석은 환영합니다.</p>
${catalog}
<p class="muted"><strong>합계</strong>: 시간 4 · 콤보 3 · 보드 4 · 룰 3 · 하이리스크 2 · 견제 6 = <strong>22종</strong> (이 중 4종 샘플 존재).</p>

<!-- ============ 7. 납품 ============ -->
<h2 class="sec"><span class="n">07</span>기술 납품 사양 (Handoff)</h2>
<h3>7.1 포맷</h3>
<ul>
  <li><strong>SVG</strong> 벡터 원본 — <span class="mono">viewBox="0 0 100 100"</span>, 레이어 정리, 텍스트는 가능하면 path 변환, 그라데이션/필터 id는 엠블럼별 고유 접두사.</li>
  <li><strong>PNG</strong> 래스터 — 투명 배경, <strong>@1x(100) / @2x(200) / @3x(300)</strong> 3종.</li>
  <li>(선택) Figma 원본/컴포넌트 — 있으면 가산점.</li>
</ul>
<h3>7.2 파일 네이밍 규칙 (엄수)</h3>
<p>
  <span class="mono">augment-&lt;id&gt;.svg</span> · <span class="mono">augment-&lt;id&gt;@1x.png / @2x.png / @3x.png</span><br/>
  예) <span class="mono">augment-board.golden.svg</span>, <span class="mono">augment-time.afterimage@2x.png</span> — <span class="mono">&lt;id&gt;</span>는 §06 표의 ID를 그대로(점 포함).
</p>
<h3>7.3 폴더 구조 (제안)</h3>
<p><span class="mono">augment-cards/ → svg/ , png/ , _preview/(계열·티어 시트) , README(매핑·색 노트)</span></p>
<h3>7.4 색/렌더 제약</h3>
<ul>
  <li>모든 색은 §4.2 토큰을 기본으로, 계열 정체성 색을 악센트로. <strong>새 베이스 컬러 도입은 사전 합의.</strong></li>
  <li>그림자/글로우는 SVG 필터 또는 면으로 — <strong>@1x 100px, 16px 썸네일에서도</strong> 깨지지 않게 디테일 위계 관리.</li>
</ul>

<!-- ============ 8. 합격 ============ -->
<h2 class="sec"><span class="n">08</span>합격 기준 (Acceptance)</h2>
<ul class="checklist">
  <li>22종 전부, SVG + PNG@1x/2x/3x, 네이밍 준수</li>
  <li><strong>계열 구분</strong> — 같은 계열 묶임, 다른 계열과 한눈에 구별</li>
  <li><strong>티어 위계</strong> — 실버 &lt; 골드 &lt; 프리즘 화려함 읽힘</li>
  <li><strong>톤 일치</strong> — 샘플과 같은 "햇살 과수원" 채색 결</li>
  <li><strong>가독성</strong> — 16px 썸네일에서도 실루엣/의미 읽힘</li>
  <li><strong>카드 적합성</strong> — §4.4 티어 배경 위 대비·여백 안정</li>
  <li><strong>수치 표현</strong> — 배수/조건 수치는 통일된 메달 룰</li>
  <li>(가산) 계열·티어 디자인 토큰/가이드 1장</li>
</ul>

<!-- ============ 9. 진행 ============ -->
<h2 class="sec"><span class="n">09</span>진행 방식 (제안)</h2>
<ol>
  <li><strong>킥오프</strong> — 본 문서 + 레퍼런스 4종 공유, Q&amp;A.</li>
  <li><strong>1차: 파일럿 6종</strong> — 계열별 대표 1종 × 톤·티어 검증. <strong>여기서 스타일 잠금.</strong></li>
  <li><strong>2차: 나머지 16종</strong> — 잠근 스타일로 확장.</li>
  <li><strong>3차: 폴리시 &amp; 납품</strong> — @1x/2x/3x 검수, 네이밍/폴더 정리, 가이드 1장.</li>
</ol>
<div class="call note"><p>티어/계열 위계와 톤만 1차에서 합의되면 나머지는 빠르게 확장됩니다. <strong>파일럿 6종을 가장 신경 써 주세요.</strong></p></div>

<!-- ============ 10. 자산 ============ -->
<h2 class="sec"><span class="n">10</span>첨부 / 참고 자산</h2>
<table>
  <thead><tr><th>자산</th><th>경로</th><th>용도</th></tr></thead>
  <tbody>
    <tr><td><strong>목표 샘플 4종</strong></td><td><span class="mono">증강카드_시안/시안_채색형_정교.png</span></td><td>품질·톤 기준선</td></tr>
    <tr><td>샘플 생성 코드</td><td><span class="mono">증강카드_시안/build-cards.mjs</span></td><td>SVG/그라데이션/필터/사과 글리프</td></tr>
    <tr><td>기존 3종 엠블럼</td><td><span class="mono">styles.css · moodboard.jsx (ART)</span></td><td>time/combo/rule 톤</td></tr>
    <tr><td>카드 CSS/토큰</td><td><span class="mono">apple-shapes.css (.aug-card/.aug-art/.dir-a)</span></td><td>실제 카드 환경</td></tr>
    <tr><td>런타임 카드</td><td><span class="mono">src/ui/components/AugmentOverlay.tsx</span></td><td>게임 내 사용 방식</td></tr>
    <tr><td>증강 데이터(권위)</td><td><span class="mono">src/augments/data/catalog.ts · plan/…개발계획서.md</span></td><td>효과/티어/계열 원천</td></tr>
    <tr><td>전체 리디자인 의뢰서</td><td><span class="mono">증강사과게임_디자인의뢰서.html</span></td><td>게임 전체 비주얼 맥락(§06)</td></tr>
  </tbody>
</table>

<!-- ============ 11. 빈칸 ============ -->
<h2 class="sec"><span class="n">11</span>빈칸 (의뢰자 작성)</h2>
<div class="kvs">
  <div><b>예산 / 단가</b><span class="muted">종당 or 일괄 — ____________</span></div>
  <div><b>마감일 / 마일스톤</b><span class="muted">파일럿 ______ · 전체 ______</span></div>
  <div><b>저작권 / 사용범위</b><span class="muted">상업적 무제한 양도 권장 / ____________</span></div>
  <div><b>커뮤니케이션 채널</b><span class="muted">____________</span></div>
  <div><b>수정 라운드</b><span class="muted">파일럿 ___회 / 종당 ___회</span></div>
</div>

<div class="end">
  증강 사과게임 — 증강 카드 아트 외주 작업 요청서 · v1.0 · 2026-05-30 · 문의·역제안 환영합니다.
</div>
`;

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>증강 사과게임 — 증강 카드 아트 작업 요청서</title>
${style}
</head>
<body>
<div class="wrap">
${body}
</div>
</body>
</html>`;

writeFileSync(pkg('증강카드_작업요청서.html'), html);
console.log('wrote 증강카드_작업요청서.html (' + (html.length / 1024 | 0) + ' KB)');
