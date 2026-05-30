# 제미나이 음악 생성 프롬프트 — 증강 사과게임 BGM

게임 톤은 **"햇살 과수원(Sunlit Orchard)"** — 따뜻한 크림빛 종이, 윤기 나는 사과,
꿀빛 골드 포인트, 그리고 한 판 동안 아침→낮→해질녘→밤→동틀녘으로 흐르는 하늘.
캐주얼 퍼즐(합이 10이 되도록 사과를 드래그)이라 **방해되지 않고 반복해 들어도 질리지 않는**
배경음이 목표입니다.

낮/밤 두 곡을 만들고, 둘은 **같은 키·비슷한 템포·같은 악기 팔레트**로 맞춰야
하늘 위상에 따라 크로스페이드될 때 자연스럽습니다.

> 사용 팁: 제미나이/Lyria 계열 음악 생성기는 가사 없는 인스트루멘털, 끊김 없는 루프,
> 길이(30~90초)를 명시하면 결과가 안정적입니다. 생성 후 `public/audio/`에
> `bgm-day.mp3`, `bgm-night.mp3` 이름으로 저장하세요.

---

## 공통 설정 (두 곡 공유)

- Key: **C major / A minor 계열** (두 곡 동일 톤)
- Tempo: **88–96 BPM**
- Instrumentation: 어쿠스틱 기타 아르페지오, 마림바/글로켄슈필, 따뜻한 펠트 피아노,
  가벼운 핸드 퍼커션, 부드러운 패드. **드럼 킥 강조 금지, 가사 없음**
- 끊김 없이 **seamless loop**, 30–90초
- 믹스: 부드럽고 둥근 음색, 날카로운 고역/강한 베이스 없음

---

## 낮 테마 — `bgm-day.mp3`

> A warm, cheerful acoustic instrumental for a cozy casual puzzle game set in a
> sunlit orchard. Bright fingerpicked acoustic guitar, gentle marimba and
> glockenspiel melodies, soft felt piano, light shakers and hand percussion,
> airy pads. Major key, ~92 BPM, relaxed and optimistic but unobtrusive — it
> should sit comfortably in the background while the player focuses. No vocals,
> no heavy drums, no sudden dynamics. Seamless loop, clean rounded mix, mastered
> at a moderate level. Mood: morning light, fresh, playful, content.

한국어 보조 설명: 아침 햇살이 비치는 과수원, 산뜻하고 경쾌하지만 집중을 방해하지 않는 톤.

## 밤 테마 — `bgm-night.mp3`

> A calm, dreamy night version of a cozy orchard puzzle theme — same key,
> instruments and tempo feel as the daytime track but softer and more intimate.
> Slow felt piano and guitar harmonics, mellow marimba, warm low pads, faint
> twinkling bells like fireflies, very light brushed percussion. Major/relaxed
> minor, ~90 BPM, peaceful and slightly nostalgic, perfect for a starlit
> evening. No vocals, no strong beat. Seamless loop, soft warm mix at a moderate
> level. Mood: nightfall, fireflies, gentle, soothing.

한국어 보조 설명: 같은 멜로디 분위기를 밤 버전으로 — 별빛·반딧불, 잔잔하고 포근하게.

---

## 만든 뒤 확인

1. `public/audio/bgm-day.mp3`, `public/audio/bgm-night.mp3` 로 저장
2. `npm run dev` → 화면을 한 번 클릭(자동재생 정책상 첫 제스처 필요)하면 낮 곡 재생
3. 한 판을 플레이하거나 홈에서 기다리면 밤이 될 때 자연스럽게 밤 곡으로 전환
4. 우상단 스피커 버튼으로 음소거/해제 (설정은 다음 접속에도 유지)
