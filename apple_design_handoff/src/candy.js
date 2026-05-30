/* ============================================================
   candy.js — 캔디 글로스 상세조정 엔진
   "시간대(빛) + Tweaks 값" 을 합쳐 사과 외형 변수를 주입한다.
   ============================================================ */
(function(){
  const $  = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
  const el = (t,c,h)=>{const e=document.createElement(t); if(c)e.className=c; if(h!=null)e.innerHTML=h; return e;};
  const root = document.documentElement;

  /* 실루엣(둥근·통통) */
  const PATH='M45 14C48 17 52 17 55 14C68 9 91 23 91 51C91 74 73 90 50 90C27 90 9 74 9 51C9 23 32 9 45 14Z';
  const MASK=`url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path d='${PATH}' fill='#000'/></svg>`)}")`;

  /* ---- 색 보간 ---- */
  const h2r=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
  const r2h=a=>'#'+a.map(v=>Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,'0')).join('');
  const mix=(A,B,k)=>{const a=h2r(A),b=h2r(B);return r2h([a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k,a[2]+(b[2]-a[2])*k]);};

  /* ---- LOOK (Tweaks 가 갱신) ---- */
  const LOOK = window.LOOK = {
    tone:['#e8705a','#d4513a','#9c3a2a'],  // 소프트 코럴
    gloss:0, sky:0.6, rim:0.55, depth:0.35,
    leaf:'green', nightOutline:false
  };

  /* ---- 사과 ---- */
  function makeApple({type='normal', val=1, size=50}={}){
    const a=el('div','apple '+type);
    a.style.setProperty('--s', size+'px');
    a.style.setProperty('--spx', size);
    a.style.setProperty('--mask', MASK);
    if(size<=24) a.classList.add('xs');
    a.innerHTML='<span class="out"></span><span class="b"></span><span class="sh"></span><span class="rl"></span><span class="st"></span><span class="lf"></span><span class="n"></span>';
    const n=a.querySelector('.n');
    if(type==='wild'){ n.textContent='★'; n.classList.add('mark'); }
    else n.textContent=val;
    return a;
  }
  function makeScene(cls=''){
    const s=el('div','scene '+cls);
    s.innerHTML='<div class="stars"></div><div class="sun"></div><div class="hill"></div><div class="field"></div>';
    return s;
  }

  /* ---- 외형 주입: frame(t)+LOOK → 변수 ---- */
  function applyLookTo(target, t){
    const f=window.SCENE.frame(t);
    const s=target.style;
    s.setProperty('--top', LOOK.tone[0]);
    s.setProperty('--mid', LOOK.tone[1]);
    s.setProperty('--bot', LOOK.tone[2]);
    s.setProperty('--gloss', LOOK.gloss.toFixed(3));
    s.setProperty('--hl', mix('#ffffff', f.sky1, Math.min(LOOK.sky,1)*0.72));      // 하늘 반사
    s.setProperty('--amb', (0.22 + LOOK.depth*0.5 + f.star*0.16).toFixed(3));       // 하단 음영
    s.setProperty('--rim', f.disc);                                                // 해/달 빛
    s.setProperty('--rim-a', Math.min(LOOK.rim*(0.34+0.66*Math.max(f.star,0.22)),1).toFixed(3));
    s.setProperty('--out-a', (LOOK.nightOutline ? f.star : 0).toFixed(3));          // 밤 외곽선
    s.setProperty('--out-w', LOOK.nightOutline ? '3' : '0');
    const lf = LOOK.leaf==='muted' ? ['#9bbf7e','#6f9a52'] : ['#8fc873','#5E9A4E'];
    s.setProperty('--leaf1', lf[0]); s.setProperty('--leaf2', lf[1]);
    s.setProperty('--shadow-a', (0.6 + LOOK.depth*0.6).toFixed(2));
  }

  const fixedScenes=[];   // {el, t}
  window.applyAllLooks = function(){
    applyLookTo(root, T);
    fixedScenes.forEach(o=>applyLookTo(o.el, o.t));
  };

  /* ============================================================
     히어로 보드
     ============================================================ */
  const COLS=14, ROWS=6, CELLS=COLS*ROWS, BOARD=[];
  (function(){
    const g=new Set(), w=new Set();
    while(g.size<6) g.add(Math.floor(Math.random()*CELLS));
    while(w.size<3){const i=Math.floor(Math.random()*CELLS); if(!g.has(i)) w.add(i);}
    for(let i=0;i<CELLS;i++){
      const type=w.has(i)?'wild':g.has(i)?'gold':'normal';
      BOARD.push({type,val:1+Math.floor(Math.random()*9)});
    }
  })();
  const heroScene=makeScene('board');
  const heroGrid=el('div','grid');
  heroScene.querySelector('.field').appendChild(heroGrid);
  function paintHero(){
    heroGrid.innerHTML='';
    const size=(window.innerWidth<=760)?30:42;
    BOARD.forEach(c=>heroGrid.appendChild(makeApple({type:c.type,val:c.val,size})));
  }

  /* ============================================================
     하루 한 바퀴 — 5 고정 시간대 타일
     ============================================================ */
  const CYCLE=[
    {t:0.0, name:'아침',  round:'R1'},
    {t:0.25,name:'한낮',  round:'R2'},
    {t:0.5, name:'오후',  round:'R3'},
    {t:0.75,name:'해질녘',round:'R4'},
    {t:1.0, name:'밤',    round:'R5'},
  ];
  function buildCycle(){
    const row=$('#cycleRow');
    CYCLE.forEach(C=>{
      const cell=el('div','cyc');
      const sc=makeScene('trio');
      const f=sc.querySelector('.field');
      f.appendChild(makeApple({type:'normal',val:6,size:50}));
      f.appendChild(makeApple({type:'gold',val:3,size:50}));
      f.appendChild(makeApple({type:'wild',size:50}));
      window.SCENE.apply(C.t, sc);     // 하늘 고정
      applyLookTo(sc, C.t);            // 사과 빛 고정
      fixedScenes.push({el:sc,t:C.t});
      cell.appendChild(sc);
      cell.appendChild(el('div','cyc-cap',`<b>${C.round}</b> ${C.name}`));
      row.appendChild(cell);
    });
  }

  /* ============================================================
     디테일 — 3종 / 숫자 / 크기
     ============================================================ */
  function buildDetail(){
    const trio=$('#trioRow');
    [['normal',6,'기본'],['gold',3,'황금'],['wild',null,'와일드']].forEach(([ty,v,lab])=>{
      const it=el('div','trio-item');
      it.appendChild(makeApple({type:ty,val:v||1,size:64}));
      it.appendChild(el('span','tlab',lab));
      trio.appendChild(it);
    });
    const nrow=$('#numRow');
    for(let i=1;i<=9;i++) nrow.appendChild(makeApple({type:'normal',val:i,size:40}));
    const srow=$('#sizeRow');
    [[20,'모바일 최소'],[30,''],[40,''],[50,'데스크톱']].forEach(([s,lab])=>{
      const it=el('div','size-item2');
      it.appendChild(makeApple({type:'normal',val:8,size:s}));
      it.appendChild(el('span','spx',(lab?lab+' · ':'')+s+'px'));
      srow.appendChild(it);
    });
  }

  /* ============================================================
     시간 컨트롤
     ============================================================ */
  let T=0.12, playing=false, raf=null, last=0;
  const LOOP=42000;
  function setTime(t){
    T=Math.max(0,Math.min(1,t));
    const f=window.SCENE.apply(T);
    applyLookTo(root, T);
    const sl=$('#timeSlider'); if(+sl.value!==Math.round(T*1000)) sl.value=Math.round(T*1000);
    $('#timeName').textContent=f.name; $('#timeRound').textContent=f.round;
    $$('.rmark').forEach((m,i)=>m.classList.toggle('on', i===Math.round(T*4)));
  }
  function tick(ts){
    if(!last) last=ts; const dt=ts-last; last=ts;
    if(playing){ let nt=T+dt/LOOP; if(nt>1)nt=0; setTime(nt); raf=requestAnimationFrame(tick); }
  }
  function play(){ playing=true; last=0; $('#playBtn').classList.add('on'); $('#playBtn').textContent='❚❚ 일시정지'; raf=requestAnimationFrame(tick); }
  function pause(){ playing=false; if(raf)cancelAnimationFrame(raf); $('#playBtn').classList.remove('on'); $('#playBtn').textContent='▶ 자동 순환'; }

  function init(){
    $('#heroStageSlot').appendChild(heroScene);
    paintHero(); buildCycle(); buildDetail();
    $('#timeSlider').oninput=e=>{ if(playing)pause(); setTime(+e.target.value/1000); };
    $('#playBtn').onclick=()=>{ playing?pause():play(); };
    $$('.rmark').forEach((m,i)=>{ m.onclick=()=>{ if(playing)pause(); setTime(i/4); }; });
    setTime(T);
    let rt; window.addEventListener('resize',()=>{ clearTimeout(rt); rt=setTimeout(paintHero,200); });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
