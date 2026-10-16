// ---------- guided tour ----------
// A step-by-step walkthrough of the real page: dims everything, spotlights one part at a time,
// and switches tabs / opens a unit along the way. Started by the rail's Tour button or ?tour in the URL.
const TOUR=(function(){
  // One tour for every PWE project: the wording (and the recorded narration in /tour/) is the same on each page,
  // so it names both groupings — PWE III's gas units with survey plats and PWE IV's townships — instead of switching words per page.
  const G='unit or township';
  const pickUnit=()=>{ const c={}; DATA.forEach(r=>{ if(r.unitL&&r.unitL!==OUT) c[r.unitL]=(c[r.unitL]||0)+1; });
    return UNITS.filter(u=>c[u]).sort((a,b)=>c[b]-c[a])[0]||UNITS[0]; };
  const pickTract=()=>{ const ids=[...new Set(DATA.filter(r=>r.unitL===state.unit).map(r=>r.id))].filter(id=>TSTAT[id]&&GEO.t.some(g=>g.id===id));
    return ids.sort((a,b)=>TSTAT[b].t-TSTAT[a].t)[0]; };
  const toTab=t=>{ if(curTab!==t) setTab(t); };
  // Every step says which screen it lives on, so Back (or a dot) lands on the right screen too, not only Next.
  const onOv=()=>{ if(PL.tract) unselectTract(); toTab('ov'); }, onLl=()=>{ if(PL.tract) unselectTract(); toTab('ll'); };
  const onUn=keepTract=>{ if(!state.unit) setUnit(pickUnit()); if(!keepTract&&PL.tract) unselectTract(); toTab('un'); };
  const S=[
    {t:'Welcome to the PWE Dashboard', b:`This short tour shows where everything is and how to use it. It takes about two minutes, and it works the same way on every PWE project: PWE III groups its tracts into gas units with survey plats, and PWE IV groups them by township until its units are set.<br><br>Press <b>Play with voice</b> to have it narrated and move along on its own, or use <b>Next</b> / <b>Back</b> and the arrow keys, and <b>Esc</b> to leave at any time. You can replay it from the <b>Tour</b> button on the left.`},
    {sel:'.rail', pre:onOv, side:'right', t:'Views', b:`The rail on the left switches between the three views: the <b>Overview</b>, the map view (<b>Units &amp; plats</b> on PWE III, <b>Townships &amp; map</b> on PWE IV), and the <b>Records</b> table. <b>Home</b> goes back to the list of PWE projects.`},
    {sel:'.bar', pre:onOv, side:'bottom', t:'Filters', b:`Everything on every view follows these filters. Pick a ${G} or a landowner status here. Clicking a bar, a ${G} or an owner elsewhere also adds a filter, and each one shows as a chip you can remove with <b>×</b>. <b>Clear filters</b> resets all of them.`},
    {sel:'#kpis-l', pre:onOv, side:'right', t:'Headline numbers', b:`Total net acres, leased net acres and tract counts for whatever the filters currently include. Net acres are each owner's interest, counted once per tract.`},
    {sel:()=>$('#ubars').closest('.c'), pre:onOv, side:'right', t:'Net acres chart', b:`Leased (green) against unleased (amber) for each ${G}. Switch between <b>Net ac</b> and <b>% leased</b> at the top right, and click a bar to filter the whole dashboard to that ${G}.`},
    {sel:'.mapc', pre:onOv, side:'left', t:'Overview map', b:`Every tract, shaded by lease status. Hover a tract for a summary and click it to open it in the map view.<br><br>The legend items are buttons: click one to hide or show those tracts. Use <b>Find a tract or owner</b> to jump straight to one.`},
    {sel:'.col.right', pre:onOv, side:'left', t:'Leased share', b:`The gauge shows the share of net acres leased; the ring shows how many tracts are fully, partly or not leased.`},
    {sel:()=>$('#sb').closest('.c'), pre:onOv, side:'top', t:'Summary table', b:`One row per ${G}: total acres (from the survey plats on PWE III), net acres, leased and unleased. Click a row to open it in the map view.`},
    {sel:'.work2', pre:onOv, side:'top', t:'Where to focus', b:`The largest unleased tracts and owners. Click a tract to see it on the map, or an owner to see all of their records.`},
    {sel:'#uhead', side:'right', pre:()=>{ if(PL.tract) unselectTract(); setUnit(pickUnit()); toTab('un'); }, t:'Map view', b:`This view opens one ${G} at a time. Step through them with <b>‹</b> and <b>›</b>, or pick one from the filter at the top. On PWE III, <b>Survey plat</b> opens the recorded plat itself, which you can zoom and pan.`},
    {sel:'.pbox', pre:()=>onUn(), side:'left', t:'The map', b:`Drag to pan and scroll (or <b>+</b> / <b>−</b>) to zoom; <b>⤢</b> fits back to the ${G}.<br><br>Switch between <b>Aerial</b> and <b>Map</b> at the top left. The overlay button shows or hides survey lines: <b>Abstracts</b> on PWE III and the <b>STR grid</b> from SONRIS on PWE IV. The legend items toggle tracts on and off.`},
    {sel:'#pside', side:'left', pre:()=>{ onUn(true); const t=pickTract(); if(t&&PL.tract!==t){ PL.tract=t; renderPlat(); zoomTract(t); } }, t:'Tract details', b:`Clicking a tract (on the map or in this list) zooms to it and lists every owner with their net acres, status and lease. Click an owner to see the full record.<br><br>Click outside the tract, press <b>Esc</b> or use <b>Back</b> to zoom out to the ${G} again.`},
    {sel:'.llbar', pre:onLl, side:'bottom', t:'Records', b:`Every owner interest, one row each, with the same columns as the Mapper export. Search by tract, owner, contract no. or lessee; the counts update as you type.`},
    {sel:'#ll', pre:onLl, side:'top', t:'Sort and open', b:`Click a column header to sort (click again to reverse). Click any row for a detail panel with the lease terms and a <b>Show on map</b> button.`},
    {sel:'#copy', pre:onLl, side:'bottom', t:'Export to Excel', b:`Downloads the rows currently shown (after filters and search) as a formatted Excel table with filter buttons on every column.`},
    {sel:'#theme', pre:onOv, side:'right', t:'Light or dark', b:`Switch the color theme here; the dashboard remembers your choice.`},
    {t:`You're all set`, b:`That's the whole dashboard, and the same steps work on every PWE project. Replay this tour any time from the <b>Tour</b> button on the left. The date at the top right shows which Mapper export the numbers come from.`},
  ];
  let i=-1, saved=null, el=null, hole=null, raf=0;
  // ----- narration: recorded neural-voice clips (/tour/NN.mp3 at the site root, shared by every project; from build_tour_audio.py) read each step and move on by themselves;
  //       if a clip can't load (e.g. a single-file copy) the browser's own speech voice reads that step instead -----
  const SY=window.speechSynthesis, HasSynth=!!(SY&&window.SpeechSynthesisUtterance), CanSpeak=true, AUD=new Audio(), clip=k=>`/tour/${String(k+1).padStart(2,'0')}.mp3?v=4`;
  let noClips=false; AUD.preload='auto';
  let playing=false, voice=null, utt=0, adv=0;
  const pickVoice=()=>{ if(!HasSynth) return null; const v=SY.getVoices(), en=v.filter(x=>/^en[-_]US/i.test(x.lang)), any=v.filter(x=>/^en/i.test(x.lang));
    const find=re=>en.find(x=>re.test(x.name))||any.find(x=>re.test(x.name));
    return find(/(Aria|Jenny|Ava|Emma|Andrew|Guy).*Natural/i)||find(/Natural/i)||find(/Google US English/i)||find(/Samantha|Ava|Allison|Zira/i)||en[0]||any[0]||null; };
  if(HasSynth){ voice=pickVoice(); SY.addEventListener&&SY.addEventListener('voiceschanged',()=>{ voice=pickVoice(); }); }
  // spoken wording: symbols and abbreviations a voice would stumble on
  const spoken=st=>{ let t=(st.t+'. '+st.b).replace(/<br\s*\/?>/g,' ')
      .replace(/<b>‹<\/b> and <b>›<\/b>/g,'the arrow buttons').replace(/<b>\+<\/b> \/ <b>−<\/b>/g,'the plus and minus buttons')
      .replace(/ \(or the plus and minus buttons\)/,', or use the plus and minus buttons,').replace(/% leased/g,'percent leased').replace(/ \/ /g,' or ').replace(/<b>⤢<\/b>/g,'the fit button').replace(/<b>×<\/b>/g,'the x')
      .replace(/<[^>]+>/g,'').replace(/&amp;/g,'and').replace(/&[a-z]+;/g,' ')
      .replace(/\bPWE III\b/g,'Pine Wave 3').replace(/\bPWE IV\b/g,'Pine Wave 4').replace(/\bPWE\b/g,'Pine Wave').replace(/\bSTR\b/g,'S T R').replace(/\bRRC\b/g,'R R C').replace(/\bSONRIS\b/g,'Sonris')
      .replace(/contract no\./g,'contract number').replace(/\bEsc\b/g,'Escape').replace(/\bNet ac\b/g,'Net acres').replace(/Oct (\d+), (\d{4})/g,'October $1, $2');
    return t.replace(/\s+/g,' ').trim(); };
  function stopVoice(){ clearTimeout(adv); utt++; AUD.onended=AUD.onerror=null; try{ AUD.pause(); }catch(e){} if(HasSynth) SY.cancel(); }
  const next=me=>{ if(me!==utt||!playing) return; adv=setTimeout(()=>{ if(me!==utt||!playing) return; if(i<S.length-1) go(i+1); else setPlay(false); },900); };
  function speakStep(){ stopVoice(); if(!playing||i<0) return; const me=utt;
    if(noClips) return synthStep(me);
    AUD.onended=()=>next(me); AUD.onerror=()=>{ if(me!==utt) return; noClips=true; synthStep(me); };
    AUD.src=clip(i); const pr=AUD.play(); if(pr&&pr.catch) pr.catch(e=>{ if(me!==utt) return; if(e&&e.name==='NotAllowedError') setPlay(false); else if(!noClips){ noClips=true; synthStep(me); } });
    if(i<S.length-1){ const n=new Audio(); n.preload='auto'; n.src=clip(i+1); } }
  function synthStep(me){ if(!HasSynth){ setPlay(false); return; } const parts=spoken(S[i]).match(/[^.!?]+[.!?]*/g)||[];
    // one utterance per sentence: Chrome cuts long utterances off after about 15 seconds
    parts.forEach((txt,k)=>{ const u=new SpeechSynthesisUtterance(txt.trim()); if(voice){ u.voice=voice; u.lang=voice.lang; } u.rate=1.02;
      if(k===parts.length-1) u.onend=()=>next(me);
      u.onerror=e=>{ if(me===utt&&e.error==='not-allowed') setPlay(false); };
      SY.speak(u); }); }
  function playBtn(){ const b=$('#tour-v'); if(!b) return; b.hidden=!CanSpeak; b.classList.toggle('on',playing);
    b.querySelector('svg').innerHTML=playing?'<rect x="6.5" y="5" width="4" height="14" rx="1"/><rect x="13.5" y="5" width="4" height="14" rx="1"/>':'<path d="M8 5.5v13l10.5-6.5z"/>';
    b.querySelector('span').textContent=playing?'Pause voice':(i===0?'Play with voice':'Voice'); b.setAttribute('aria-pressed',playing); }
  function setPlay(on){ playing=on&&CanSpeak; try{ localStorage.setItem('pwe-tour-voice',playing?'1':'0'); }catch(e){} playBtn(); if(playing) speakStep(); else stopVoice(); }
  function build(){
    el=document.createElement('div'); el.className='tour'; el.innerHTML=`<div class="tour-hole"></div><div class="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-t">
      <div class="tour-top"><div class="tour-step" id="tour-n"></div><button type="button" class="tour-play" id="tour-v" hidden><svg viewBox="0 0 24 24" aria-hidden="true"></svg><span></span></button></div><h3 id="tour-t"></h3><div class="tour-b" id="tour-b"></div>
      <div class="tour-dots" id="tour-d"></div>
      <div class="tour-ft"><button type="button" class="btn" id="tour-x">Skip tour</button><span></span><button type="button" class="btn" id="tour-p">Back</button><button type="button" class="btn pri" id="tour-nx">Next</button></div></div>`;
    document.body.appendChild(el); hole=el.querySelector('.tour-hole');
    $('#tour-v').onclick=()=>setPlay(!playing);
    $('#tour-x').onclick=end; $('#tour-p').onclick=()=>go(i-1); $('#tour-nx').onclick=()=>i<S.length-1?go(i+1):end();
    el.querySelector('.tour-hole').onclick=e=>e.stopPropagation();
    $('#tour-d').innerHTML=S.map((_,k)=>`<button type="button" aria-label="Step ${k+1}" data-k="${k}"></button>`).join('');
    $$('#tour-d button').forEach(b=>b.onclick=()=>go(+b.dataset.k));
  }
  const target=s=>{ if(!s.sel) return null; const t=typeof s.sel==='function'?s.sel():$(s.sel); if(!t) return null; const r=t.getBoundingClientRect(); return r.width&&r.height?t:null; };
  function place(){ cancelAnimationFrame(raf); raf=requestAnimationFrame(()=>{ if(i<0) return; const s=S[i], t=target(s), c=el.querySelector('.tour-card'), P=8, M=14;
    const vw=innerWidth, vh=innerHeight, cw=Math.min(380,vw-32); c.style.width=cw+'px'; const ch=c.offsetHeight;
    if(!t){ hole.className='tour-hole none'; Object.assign(hole.style,{left:vw/2+'px',top:vh/2+'px',width:'0px',height:'0px'});
      Object.assign(c.style,{left:(vw-cw)/2+'px',top:Math.max(16,(vh-ch)/2)+'px'}); return; }
    const r=t.getBoundingClientRect(), x=Math.max(4,r.left-P), y=Math.max(4,r.top-P), w=Math.min(vw-4,r.right+P)-x, h=Math.min(vh-4,r.bottom+P)-y;
    hole.className='tour-hole'; Object.assign(hole.style,{left:x+'px',top:y+'px',width:w+'px',height:h+'px'});
    const fits={right:vw-(x+w)-M>=cw, left:x-M>=cw, bottom:vh-(y+h)-M>=ch, top:y-M>=ch};
    let side=fits[s.side]?s.side:['right','left','bottom','top'].find(k=>fits[k])||'over', L, T;
    if(side==='right'||side==='left'){ L=side==='right'?x+w+M:x-M-cw; T=Math.min(Math.max(16,y),vh-ch-16); }
    else if(side==='bottom'||side==='top'){ T=side==='bottom'?y+h+M:y-M-ch; L=Math.min(Math.max(16,x),vw-cw-16); }
    else { L=Math.max(16,Math.min(x+w,vw)-cw-16); T=Math.max(16,Math.min(y+h,vh)-ch-16); } // inside the target's lower-right corner, clear of map legends
    Object.assign(c.style,{left:L+'px',top:T+'px'}); }); }
  function go(k){ if(k<0||k>=S.length) return; i=k; const s=S[i];
    try{ s.pre&&s.pre(); }catch(e){}
    $('#tour-n').textContent=`Step ${i+1} of ${S.length}`; $('#tour-t').innerHTML=s.t; $('#tour-b').innerHTML=s.b;
    $('#tour-p').disabled=i===0; $('#tour-nx').textContent=i===S.length-1?'Finish':'Next'; $('#tour-x').style.visibility=i===S.length-1?'hidden':'';
    $$('#tour-d button').forEach((b,j)=>b.classList.toggle('on',j===i));
    setTimeout(()=>{ const t=target(s); if(t){ const r=t.getBoundingClientRect(); if(r.top<70||r.bottom>innerHeight-20) t.scrollIntoView({block:r.height>innerHeight*.7?'start':'center'}); }
      place(); setTimeout(place,350); }, 60);
    playBtn(); if(playing) speakStep(); else stopVoice();
    $('#tour-nx').focus({preventScroll:true}); }
  function start(ev){ if(i>=0) return; if(!el) build(); closeDrawer&&!$('#drawer').hidden&&closeDrawer(); if(!$('#docv').hidden) closeDoc();
    saved={tab:curTab||'ov', unit:state.unit, tract:PL.tract}; el.hidden=false; let pref=false; try{ pref=localStorage.getItem('pwe-tour-voice')==='1'; }catch(e){} playing=!!(ev&&ev.isTrusted&&pref&&CanSpeak); document.documentElement.classList.add('touring'); go(0); }
  function end(){ if(i<0) return; i=-1; playing=false; stopVoice(); el.hidden=true; document.documentElement.classList.remove('touring');
    if(saved){ PL.tract=saved.tract; setUnit(saved.unit,!!saved.tract); setTab(saved.tab); }
    if(/[?&]tour\b/.test(location.search)) history.replaceState(null,'',location.pathname+location.hash);
    requestAnimationFrame(fitKeyBox); $('#tour').focus({preventScroll:true}); }
  addEventListener('resize',()=>{ if(i>=0) place(); }); addEventListener('scroll',()=>{ if(i>=0) place(); },{passive:true});
  addEventListener('keydown',e=>{ if(i<0) return;
    if(e.key==='Escape'){ e.stopImmediatePropagation(); e.preventDefault(); end(); }
    else if(e.key==='ArrowRight'&&!/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)){ e.preventDefault(); i<S.length-1?go(i+1):end(); }
    else if(e.key==='ArrowLeft'&&!/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)){ e.preventDefault(); go(i-1); } },true);
  $('#tour').onclick=start;
  return {start,end,go,spoken:k=>spoken(S[k]),n:()=>S.length};
})();
if(/[?&]tour\b/.test(location.search)) setTimeout(()=>TOUR.start(),400);
