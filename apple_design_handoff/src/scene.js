/* ============================================================
   scene.js — 낮밤 순환 과수원 엔진
   t ∈ [0,1] 를 R1(아침)→R5(밤) 5 키프레임 사이로 보간해
   :root 의 CSS 변수(--sky0/1/2, --hill, --sunx/y, --sundisc, --sunglow, --star)
   로 출력한다. 모든 .scene 요소가 이 변수를 상속해 같은 시간대를 공유.
   ============================================================ */
(function(){
  // R1 아침 · R2 한낮 · R3 오후 · R4 해질녘 · R5 밤
  const KF = [
    { name:'아침', round:'R1', sky:['#A9C8E4','#FCE6CB','#F8CF9E'], hill:'#6E9F52',
      sunx:14, suny:60, disc:'#FFF1CC', glow:'rgba(255,221,160,.55)', star:0 },
    { name:'한낮', round:'R2', sky:['#8FBFE9','#EAF3F7','#FCF4DE'], hill:'#73A655',
      sunx:34, suny:18, disc:'#FFFEF6', glow:'rgba(255,250,225,.45)', star:0 },
    { name:'오후', round:'R3', sky:['#A6BFDC','#FFE7B8','#FFD295'], hill:'#6C9A4D',
      sunx:54, suny:30, disc:'#FFE3A4', glow:'rgba(255,206,130,.55)', star:0 },
    { name:'해질녘', round:'R4', sky:['#7E6CA6','#FF9C76','#FFC062'], hill:'#54693F',
      sunx:76, suny:64, disc:'#FF865A', glow:'rgba(255,120,70,.5)', star:.22 },
    { name:'밤', round:'R5', sky:['#10173A','#1E2A52','#34375F'], hill:'#1A2F3C',
      sunx:80, suny:22, disc:'#DCE4FF', glow:'rgba(150,170,255,.32)', star:1 },
  ];

  const h2r = h => [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
  const r2h = a => '#'+a.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
  const lerp = (a,b,k)=>a+(b-a)*k;
  const lhex = (A,B,k)=>{const a=h2r(A),b=h2r(B);return r2h([lerp(a[0],b[0],k),lerp(a[1],b[1],k),lerp(a[2],b[2],k)]);};

  function frame(t){
    t = Math.max(0, Math.min(1, t));
    const seg = t * (KF.length - 1);
    let i = Math.floor(seg);
    if (i >= KF.length - 1) i = KF.length - 2;
    const k = seg - i;
    const A = KF[i], B = KF[i+1];
    return {
      sky0:lhex(A.sky[0],B.sky[0],k),
      sky1:lhex(A.sky[1],B.sky[1],k),
      sky2:lhex(A.sky[2],B.sky[2],k),
      hill:lhex(A.hill,B.hill,k),
      disc:lhex(A.disc,B.disc,k),
      glow:A.glow,               // 글로우는 단순화: 가까운 키프레임
      sunx:lerp(A.sunx,B.sunx,k),
      suny:lerp(A.suny,B.suny,k),
      star:lerp(A.star,B.star,k),
      name:(k<.5?A.name:B.name),
      round:(k<.5?A.round:B.round),
      i, k
    };
  }

  function apply(t, target){
    const f = frame(t);
    const r = (target || document.documentElement).style;
    r.setProperty('--sky0', f.sky0);
    r.setProperty('--sky1', f.sky1);
    r.setProperty('--sky2', f.sky2);
    r.setProperty('--hill', f.hill);
    r.setProperty('--sundisc', f.disc);
    r.setProperty('--sunglow', f.glow);
    r.setProperty('--sunx', f.sunx + '%');
    r.setProperty('--suny', f.suny + '%');
    r.setProperty('--star', f.star.toFixed(3));
    return f;
  }

  window.SCENE = { KF, frame, apply };
})();
