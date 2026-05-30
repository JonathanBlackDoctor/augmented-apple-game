# 제미나이 음악 생성 프롬프트 — 증강 사과게임 BGM (차분·힐링 버전)

게임 톤은 **"햇살 과수원(Sunlit Orchard)"** — 따뜻한 크림빛 종이, 윤기 나는 사과,
꿀빛 골드 포인트, 한 판 동안 아침→낮→해질녘→밤→동틀녘으로 흐르는 하늘.
목표는 **아주 차분하고 편안하고 힐링되는, 거의 의식되지 않는 배경음**입니다.
빠른 퍼즐의 긴장을 가라앉히고 오래 들어도 질리지 않아야 해요.

낮/밤 두 곡을 만들고, 둘은 **같은 키·같은 악기 팔레트**로 맞추면 하늘 위상에 따라
크로스페이드될 때 가장 자연스럽습니다.

---

## ⚠️ 두 가지 핵심 규칙 (꼭 지켜주세요)

### 1) 비트 없는 앰비언트 (beatless ambient) — 박자 동기화 문제 해소
드럼·강박(downbeat)이 **없어야** 합니다. 두 곡(낮/밤)이 동시에 흐르다 크로스페이드될 때
박자가 어긋나 보여도, **칠 박자 자체가 없으면 충돌이 들리지 않습니다.** 그래서 모든
프롬프트에 `no drums, no strong beat, free-floating / rubato, ambient` 를 넣습니다.
→ "박자 동기화가 안 됐는데 괜찮나?"에 대한 답: **비트리스라 동기화할 박자가 없어 OK.**

### 2) 30초 클립이라도 끊김 없이 루프되게
제미나이/Lyria 계열은 보통 **~30초** 클립입니다. 게임은 WebAudio로 **샘플 단위
gapless 루프**를 재생하므로 30초마다 무음 끊김은 없습니다. 다만 클립의 **시작과 끝이
음악적으로 이어져야** 이음새가 안 튑니다. 그래서 프롬프트에
`seamless loop, ends where it begins, no hard ending or fade-out, sustained tail`
을 넣습니다.
- 30초가 너무 짧게 느껴지면: **같은 프롬프트로 2~3개 생성해 이어 붙여** 60~90초로 만들면
  반복 주기가 길어져 덜 지루합니다(끝/시작 음만 맞추면 됨).

---

## 공통 설정 (모든 변형 공유)

- Key: **C major / A minor 계열** (두 곡 동일 톤), 또는 D major
- Tempo 느낌: **60–75 BPM 정도의 아주 느린 호흡** (강박 없이 rubato 권장)
- 분위기: 따뜻함, 평온, 위안, 약간의 향수 / spacious, soft, intimate
- 믹스: 둥글고 부드러운 음색, 날카로운 고역·강한 베이스 없음, 잔향(reverb) 넉넉히
- 가사 없음(instrumental), seamless loop, 30~90초

> 아래 3가지 스타일 중 **마음에 드는 하나를 골라** 낮/밤 한 쌍을 생성하세요.
> 셋 다 위 두 규칙을 지키므로 게임에 그대로 들어갑니다. 저장 이름:
> `public/audio/bgm-day.mp3`, `public/audio/bgm-night.mp3`

---

## 변형 A — 네오클래식 펠트 피아노 (가장 무난·따뜻)

**낮 (`bgm-day.mp3`)**
> A very calm, healing neoclassical instrumental for a cozy orchard puzzle game.
> Soft felt piano playing slow, sparse, gentle arpeggios, with warm ambient pads
> and subtle string swells underneath. Major key, around 65 BPM but free and
> rubato — no drums, no strong beat, no percussion. Spacious reverb, intimate and
> soothing, meditative and unobtrusive. Seamless loop that ends where it begins,
> with a sustained tail and no hard ending or fade-out. Mood: warm morning light,
> peaceful, comforting.

**밤 (`bgm-night.mp3`)**
> The same cozy orchard piano theme reimagined for a starlit night — even calmer
> and more intimate. Slow felt piano with long pauses, deep warm pads, faint
> glassy bells like distant fireflies, gentle low drone. Major / soft minor,
> ~60 BPM, free-floating, no drums and no beat. Lush reverb, dreamy and
> nostalgic, very quiet and healing. Seamless loop, sustained tail, no hard
> ending. Mood: nightfall, stillness, gentle and soothing.

## 변형 B — 앰비언트 패드 + 자연음 (가장 몽환·힐링)

**낮 (`bgm-day.mp3`)**
> A serene ambient instrumental for relaxation: warm evolving synth pads, soft
> bowed-glass textures, occasional gentle marimba or kalimba notes, and faint
> nature ambience (soft breeze, distant birdsong) low in the mix. Major, very
> slow and beatless, no drums or rhythm. Wide, airy, spacious reverb; calm,
> healing, almost meditative. Seamless loop with a sustained tail that flows back
> to the start, no hard ending. Mood: sunlit orchard, fresh air, deep calm.

**밤 (`bgm-night.mp3`)**
> A deep, dreamy ambient night track: warm low drones and slow pads, soft glassy
> chimes and sparse kalimba, faint crickets and a gentle night breeze low in the
> mix. Soft minor/major, beatless and free-floating, no drums. Lush reverb, dark
> but cozy and reassuring, very quiet. Seamless loop, sustained tail, no hard
> ending. Mood: warm summer night, fireflies, soothing and safe.

## 변형 C — 로파이 힐링 (살짝 아늑·따뜻한 질감)

**낮 (`bgm-day.mp3`)**
> A gentle lo-fi healing instrumental, very mellow and relaxing. Soft mellow
> electric piano (Rhodes) and warm guitar harmonics, dreamy pads, light vinyl
> warmth and air. NO beat, no drums, no hi-hats — just floating chords, slow and
> calm in a major key. Cozy, warm, comforting and unobtrusive, with soft reverb.
> Seamless loop that ends where it begins, sustained tail, no hard ending. Mood:
> lazy warm afternoon, content and peaceful.

**밤 (`bgm-night.mp3`)**
> A softer lo-fi night version of the same cozy theme: muted Rhodes piano and
> warm guitar, deep mellow pads, faint twinkling bells, gentle vinyl air. No
> beat, no drums, slow and floating, soft minor/major. Warm intimate reverb,
> nostalgic and very calm. Seamless loop, sustained tail, no hard ending. Mood:
> quiet night, warm and reassuring.

---

## 만든 뒤 확인

1. 고른 변형의 낮/밤 곡을 `public/audio/bgm-day.mp3`, `public/audio/bgm-night.mp3` 로 저장
2. `npm run dev` → 화면을 한 번 클릭(자동재생 정책상 첫 제스처 필요)하면 낮 곡 재생
3. 한 판을 플레이하거나 홈에서 기다리면 밤이 될 때 자연스럽게 밤 곡으로 전환
4. 우상단 스피커 버튼으로 음소거/해제 (설정은 다음 접속에도 유지)
5. 30초 반복이 거슬리면 같은 프롬프트로 2~3개 더 만들어 이어 붙여 길이를 늘리세요
