# 제미나이 음악 생성 프롬프트 — 증강 사과게임 BGM

게임 톤은 **"햇살 과수원(Sunlit Orchard)"** — 따뜻한 크림빛 종이, 윤기 나는 사과,
꿀빛 골드 포인트, 한 판 동안 아침→낮→해질녘→밤→동틀녘으로 흐르는 하늘.

**가장 중요한 기준: 듣기만 해도 기분이 좋아지는 BGM.** 두 갈래로 나눠 뒀어요 —
편안하게 가라앉히는 **차분·힐링** 계열(변형 A~C)과, 밝고 산뜻하게 기분을 띄우는
**밝고 경쾌** 계열(변형 D~F). 취향대로 한 쌍(낮/밤)을 골라 생성하면 됩니다.

낮/밤 두 곡은 **같은 키·같은 악기 팔레트**로 맞추면 하늘 위상에 따라 크로스페이드될 때
가장 자연스럽습니다.

---

## ⚠️ 두 가지 핵심 규칙 (꼭 지켜주세요)

### 1) 박자 동기화 걱정을 없애려면 — 비트는 약하게/없이
가장 안전한 건 드럼·강박이 **없는** 앰비언트입니다(차분 계열 A~C가 그래요). 두 곡(낮/밤)이
동시에 흐르다 크로스페이드돼도 **칠 박자가 없으면 충돌이 안 들립니다.**
밝고 경쾌한 계열(D~F)은 약간의 리듬이 들어가야 신나는데, 이때는
**아주 가볍고 부드러운 퍼커션**(셰이커·핑거스냅·소프트 우드블록 등, 강한 킥/스네어 금지)만
쓰고 낮/밤 곡의 **템포를 똑같이** 맞추세요. 크로스페이드 구간이 길고(수 초) 퍼커션이
약해서 위상이 어긋나도 거의 안 들립니다.
→ "박자 동기화 안 됐는데 괜찮나?"에 대한 답: **비트를 빼거나 약하게 + 같은 템포면 OK.**

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

- Key: **밝은 장조** — C major / G major / D major 계열 (낮/밤 두 곡 동일 톤)
- 분위기 공통분모: 따뜻함, 다정함, **들으면 기분이 좋아지는** 긍정적인 색
- 믹스: 둥글고 부드러운 음색, 날카로운 고역·강한 베이스 없음, 잔향(reverb) 적당히
- 가사 없음(instrumental), seamless loop, 30~90초
- 차분 계열(A~C): 60–75 BPM 호흡, 비트 없음 / 경쾌 계열(D~F): 90–115 BPM, 가벼운 퍼커션 OK

> 아래 6가지 중 **마음에 드는 하나를 골라** 낮/밤 한 쌍을 생성하세요.
> A~C는 차분·힐링, D~F는 밝고 경쾌. 모두 위 두 규칙을 지키므로 게임에 그대로 들어갑니다.
> 저장 이름: `public/audio/bgm-day.mp3`, `public/audio/bgm-night.mp3`

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

# 밝고 경쾌 계열 (기분이 좋아지는 톤)

## 변형 D — 어쿠스틱 우쿨렐레·휘파람 (햇살 산책)

**낮 (`bgm-day.mp3`)**
> A bright, happy, feel-good acoustic instrumental for a cute casual fruit puzzle
> game. Bouncy ukulele strumming and fingerpicking, cheerful whistling melody,
> sweet glockenspiel, hand claps and soft shakers, warm acoustic bass. Major key,
> upbeat around 110 BPM but light and gentle — soft percussion only, no harsh
> drums. Sunny, playful, optimistic, instantly puts you in a good mood. Seamless
> loop that ends where it begins, no hard ending. Mood: a happy sunny walk
> through an orchard.

**밤 (`bgm-night.mp3`)**
> A warm, gently upbeat night version of the same cheerful ukulele theme — same
> tempo and instruments but cozier and softer. Mellow ukulele, soft humming or
> whistle, twinkling glockenspiel and bells, light brushed shakers, warm bass.
> Major key, ~110 BPM, soft percussion only, happy but relaxed and snug. Seamless
> loop, no hard ending. Mood: a cozy, content evening, still smiling.

## 변형 E — 통통 튀는 마림바·플럭 (귀엽고 활기찬)

**낮 (`bgm-day.mp3`)**
> A cute, energetic, feel-good instrumental for a colorful casual puzzle game.
> Bouncy marimba and pizzicato strings playing a catchy, hummable melody, bright
> plucky synth, playful bells, light claps and shakers, warm rounded bass. Major
> key, lively ~115 BPM with a light bouncy groove (soft percussion only, no heavy
> kick or snare). Joyful, charming and full of positive energy without being
> hectic. Seamless loop that ends where it begins, no hard ending. Mood: cheerful,
> sparkly, makes you smile.

**밤 (`bgm-night.mp3`)**
> A softer, dreamy-but-still-upbeat night version of the same cute theme: mellow
> marimba and pizzicato, gentle plucky synth, twinkling music-box bells, light
> shakers, warm bass. Major key, ~110 BPM, soft percussion only, playful yet
> calm and cozy. Seamless loop, no hard ending. Mood: a happy, twinkly starlit
> night.

## 변형 F — 산뜻한 팝 인스트루멘털 (밝고 청량)

**낮 (`bgm-day.mp3`)**
> A bright, refreshing, feel-good pop instrumental for a casual mobile game. Clean
> bouncy electric piano and bright acoustic guitar, cheerful synth lead, light
> claps, shakers and gentle finger snaps, warm groovy bass. Major key, upbeat
> ~108 BPM with a light, airy groove — soft percussion only, no aggressive drums.
> Crisp, sunny, positive and uplifting, the kind of tune that lifts your mood
> instantly. Seamless loop that ends where it begins, no hard ending. Mood: fresh
> sunny morning, light and happy.

**밤 (`bgm-night.mp3`)**
> A warm, chilled night version of the same fresh pop theme — same tempo and
> instruments, softer and dreamier. Mellow electric piano and guitar, smooth
> synth pads, twinkly bells, light shakers and snaps, warm bass. Major key,
> ~108 BPM, soft percussion only, upbeat but relaxed and cozy. Seamless loop, no
> hard ending. Mood: a breezy, feel-good evening.

---

## 만든 뒤 확인

1. 고른 변형의 낮/밤 곡을 `public/audio/bgm-day.mp3`, `public/audio/bgm-night.mp3` 로 저장
2. `npm run dev` → 화면을 한 번 클릭(자동재생 정책상 첫 제스처 필요)하면 낮 곡 재생
3. 한 판을 플레이하거나 홈에서 기다리면 밤이 될 때 자연스럽게 밤 곡으로 전환
4. 우상단 스피커 버튼으로 음소거/해제 (설정은 다음 접속에도 유지)
5. 30초 반복이 거슬리면 같은 프롬프트로 2~3개 더 만들어 이어 붙여 길이를 늘리세요
