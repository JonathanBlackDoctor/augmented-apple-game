/* candy-tweaks.jsx — 캔디 글로스 Tweaks (window.LOOK 으로 브리지) */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "tone": ["#e8705a", "#d4513a", "#9c3a2a"],
  "gloss": 0,
  "sky": 60,
  "rim": 55,
  "depth": 35,
  "leaf": "선명",
  "numFont": "부드럽게",
  "nightOutline": false
}/*EDITMODE-END*/;

const TONES = [
  ["#e8705a", "#d4513a", "#9c3a2a"],  // 소프트 코럴
  ["#e85c3e", "#cf3f22", "#92301a"],  // 오차드 레드
  ["#e24a3c", "#bf2f22", "#7e2014"],  // 딥 체리
  ["#f0845f", "#df5c3c", "#a84329"],  // 웜 피치
];

function CandyTweaks(){
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  React.useEffect(()=>{
    const L = window.LOOK; if(!L) return;
    L.tone = t.tone;
    L.gloss = t.gloss/100;
    L.sky   = t.sky/100;
    L.rim   = t.rim/100;
    L.depth = t.depth/100;
    L.leaf  = (t.leaf === '차분') ? 'muted' : 'green';
    L.nightOutline = t.nightOutline;
    document.documentElement.style.setProperty('--num-font',
      t.numFont === '기본'
        ? "'Pretendard','Pretendard Variable',sans-serif"
        : "'Quicksand','Pretendard','Pretendard Variable',sans-serif");
    if(window.applyAllLooks) window.applyAllLooks();
  }, [t]);

  return (
    <TweaksPanel title="캔디 글로스 조정">
      <TweakSection label="베이스 톤" />
      <TweakColor label="사과 색" value={t.tone} options={TONES}
                  onChange={v=>setTweak('tone', v)} />

      <TweakSection label="마감" />
      <TweakSlider label="광택" value={t.gloss} min={0} max={100} unit="%"
                   onChange={v=>setTweak('gloss', v)} />
      <TweakSlider label="하늘 반사" value={t.sky} min={0} max={100} unit="%"
                   onChange={v=>setTweak('sky', v)} />
      <TweakSlider label="환경 림라이트" value={t.rim} min={0} max={100} unit="%"
                   onChange={v=>setTweak('rim', v)} />
      <TweakSlider label="깊이 · 그림자" value={t.depth} min={0} max={100} unit="%"
                   onChange={v=>setTweak('depth', v)} />

      <TweakSection label="디테일" />
      <TweakRadio label="숫자 폰트" value={t.numFont} options={['부드럽게','기본']}
                  onChange={v=>setTweak('numFont', v)} />
      <TweakRadio label="잎 톤" value={t.leaf} options={['선명','차분']}
                  onChange={v=>setTweak('leaf', v)} />
      <TweakToggle label="밤 외곽선 (자동)" value={t.nightOutline}
                   onChange={v=>setTweak('nightOutline', v)} />
    </TweaksPanel>
  );
}

(function mount(){
  const rootEl = document.getElementById('tweaks-root');
  ReactDOM.createRoot(rootEl).render(<CandyTweaks />);
})();
