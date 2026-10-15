// dates arrive as YYYY-MM-DD; show mm/dd/yyyy, sort on the stored value
const mdy=v=>{ const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(v||''); return m?`${m[2]}/${m[3]}/${m[1]}`:(v||''); };
// ---------- plat map ----------
GEO.t.forEach(t=>{ t.st=TSTAT[t.id]?TSTAT[t.id].s:'X'; t.unit=TSTAT[t.id]?TSTAT[t.id].unit:null; });
const SHP_IDS=new Set(GEO.t.map(t=>t.id));
const MISSING=[...new Set(DATA.map(r=>r.id))].filter(id=>!SHP_IDS.has(id));
const FULL=[0,0,GEO.w,GEO.h];
const PL={vb:null,fitKey:null,tract:null,shade:'st'};
// Clearing the selected tract zooms back out to the whole unit (or all units when none is picked).
function unselectTract(){ PL.tract=null; render(); fitPlat(); }
try{ const v=localStorage.getItem('pwe-shade'); if(v==='st'||v==='pct') PL.shade=v; }catch(e){}
function unitBox(u){ const o=GEO.u.find(x=>!x.ctx&&x.u===u); if(o) return o.b; const ts=GEO.t.filter(t=>t.unit===u); if(!ts.length) return null;
  return [Math.min(...ts.map(t=>t.b[0])),Math.min(...ts.map(t=>t.b[1])),Math.max(...ts.map(t=>t.b[2])),Math.max(...ts.map(t=>t.b[3]))]; }
const boxVB=(b,pad=.08)=>{ const w=b[2]-b[0],h=b[3]-b[1],p=Math.max(w,h)*pad; return [b[0]-p,b[1]-p,w+2*p,h+2*p]; };
const pctFill=p=>`color-mix(in srgb,var(--s-acq) ${Math.round(p*100)}%,var(--s-work))`;
function tractFill(t,id){ if(PL.shade==='pct'&&TSTAT[t.id]&&TSTAT[t.id].t>0) return pctFill(TSTAT[t.id].p); return PST[t.st].fill.replace('PAT','PAT-'+id); }
function patDefs(id){ const s=id==='k'?360:120; return `<defs><pattern id="PAT-${id}" patternUnits="userSpaceOnUse" width="${s}" height="${s}" patternTransform="rotate(45)"><rect width="${s}" height="${s}" fill="var(--s-acq)"/><rect width="${s*.43}" height="${s}" fill="var(--s-work)"/></pattern></defs>`; }
function platMarkup(id){
  const match=new Set(filtered({noUnit:true}).map(r=>r.id)), anyF=['ls','lessee','form','abs'].some(k=>state[k]);
  let h=patDefs(id)+'<g class="tracts">';
  GEO.t.forEach(t=>{ const inUnit=!state.unit||t.unit===state.unit, hit=t.st==='X'||!anyF||match.has(t.id), S=TSTAT[t.id];
    const tp=S?`<b>${t.ut?'Tract '+esc(t.ut)+' · ':''}${esc(ushort(S.unit))}</b><br>${esc(t.id)}<br>${PST[t.st].label} · ${fmt(S.p*100,1)}% leased<br>${fmt(S.l,2)} of ${fmt(S.t,2)} net ac leased`:`<b>${esc(t.id)}</b><br>${esc(t.su?title(t.su)+' · not in this export':'Not in this export')}`;
    const cls=['tract',t.st==='X'?'ctx':'',(!inUnit||!hit)?'dim':'',PL.tract===t.id&&id==='p'?'sel':''].filter(Boolean).join(' ');
    h+=`<path class="${cls}" d="${t.d}" fill="${tractFill(t,id)}" data-id="${esc(t.id)}" data-u="${esc(t.unit||'')}" data-tip="${esc(tp)}"/>`; });
  if(id==='p'&&PL.tract) GEO.t.forEach(t=>{ if(t.id===PL.tract) h+=`<path class="selhalo" d="${t.d}"/><path class="selline" d="${t.d}"/>`; });
  h+='</g><g class="ulines">'+GEO.u.map(u=>`<path class="uline${u.ctx?' ctx':''}${state.unit&&!u.ctx&&u.u!==state.unit?' faint':''}${state.unit&&u.u===state.unit&&id==='k'?' hl':''}" d="${u.d}" data-u="${esc(u.ctx?'':u.u)}"/>`).join('')+'</g><g class="labels"></g>';
  return h; }
function drawLabels(svg,vb,mode){ const g=svg.querySelector('.labels'); if(!g) return;
  const zoomed=vb[2]<GEO.w*.45, fs=vb[2]/(mode==='key'?26:38); let h='';
  if(mode!=='key'&&zoomed){ GEO.t.forEach(t=>{ if(!t.ut||(state.unit&&t.unit!==state.unit)) return; if(t.l[0]<vb[0]||t.l[0]>vb[0]+vb[2]||t.l[1]<vb[1]||t.l[1]>vb[1]+vb[3]) return;
      h+=`<text x="${t.l[0]}" y="${t.l[1]}" style="font-size:${fs*.8}px;stroke-width:${fs*.22}px">${esc(t.ut)}</text>`; }); }
  if(!zoomed||mode==='key'){ GEO.u.forEach(u=>{ if(u.ctx&&GEO.u.some(v=>!v.ctx&&ushort(v.u).toUpperCase()===u.u.toUpperCase())) return; h+=`<text class="ul${u.ctx?' ctx':''}" x="${u.l[0]}" y="${u.l[1]}" style="font-size:${fs}px;stroke-width:${fs*.25}px">${esc(u.ctx?title(u.u):ushort(u.u))}</text>`; }); }
  g.innerHTML=h; }
function legendHtml(){ if(PL.shade==='pct') return `<span><i class="lg" style="background:var(--s-work)"></i>0%</span><span class="grad"></span><span><i class="lg" style="background:var(--s-acq)"></i>100% leased</span><span><i class="lg" style="background:var(--p-none)"></i>No net interest</span><span><i class="lg ctx"></i>Not in export</span>`;
  return ['L','P','U','Z','X'].map(k=>`<span><i class="lg ${k==='P'?'part':k==='X'?'ctx':''}" style="${k==='P'||k==='X'?'':'background:'+PST[k].fill}"></i>${PST[k].label}</span>`).join(''); }
function renderKey(){ const svg=$('#keymap'); svg.setAttribute('viewBox',boxVB(FULL,.03).join(' ')); svg.setAttribute('preserveAspectRatio','xMidYMid meet');
  svg.innerHTML=platMarkup('k'); drawLabels(svg,FULL,'key');
  $('#key-leg').innerHTML=['L','P','U','X'].map(k=>`<span><i class="lg ${k==='P'?'part':k==='X'?'ctx':''}" style="${k==='P'||k==='X'?'':'background:'+PST[k].fill}"></i>${PST[k].label}</span>`).join('');
  $('#key-foot').textContent='Grey dashed outlines are parcels in the parcel file that are not in this export.';
  svg.querySelectorAll('.tract,.uline').forEach(p=>p.onclick=()=>{ const u=p.dataset.u; if(!u||u===OUT) return; setUnit(u); setTab('un'); }); }

function setVB(vb){ PL.vb=vb; const svg=$('#plat'); svg.setAttribute('viewBox',vb.join(' ')); drawLabels(svg,vb,'plat'); }
function fitPlat(){ const b=state.unit&&state.unit!==OUT?unitBox(state.unit):null; setVB(boxVB(b||FULL,b?.1:.03)); PL.fitKey=state.unit; }
// center on a tract, framed with a margin around all of its parcel pieces (never wider than half the unit view)
function tractBox(id){ const ps=GEO.t.filter(x=>x.id===id); if(!ps.length) return null; return [Math.min(...ps.map(p=>p.b[0])),Math.min(...ps.map(p=>p.b[1])),Math.max(...ps.map(p=>p.b[2])),Math.max(...ps.map(p=>p.b[3]))]; }
function zoomTract(id){ const b=tractBox(id); if(!b) return; const w=b[2]-b[0], h=b[3]-b[1], side=Math.max(w,h,GEO.w/45)*1.6, cx=(b[0]+b[2])/2, cy=(b[1]+b[3])/2;
  setVB([cx-side/2,cy-side/2,side,side]); }
function renderUnitHead(){
  const u=state.unit, rr=filtered(), p=pctOf(rr), base=filtered({noLs:true}), pb=pctOf(base), doc=PLATDOCS[u], i=UNITS.indexOf(u);
  const meta=u?(doc?`Survey plat ${doc.short} · called ${fmt(PLATCALL[u],3)} ac`:PLATCALL[u]?`${PLATNOTE[u]||'Plat not attached'} · called ${fmt(PLATCALL[u],3)} ac`:u===OUT?'Tracts outside the gas units':`${fmt(tracts(rr))} tracts · no survey plat yet`):`${UNITS.filter(x=>x!==OUT).length} units · pick one from the list or the map`;
  $('#uhead').innerHTML=`<div class="navb"><button class="ibtn" type="button" id="u-prev" aria-label="Previous unit" ${!u||i<=0?'disabled':''}>‹</button><button class="ibtn" type="button" id="u-next" aria-label="Next unit" ${u&&i>=UNITS.length-1?'disabled':''}>›</button></div>
    <div><h2>${esc(u?bl(u):'All units')}</h2><div class="meta">${esc(meta)}</div></div>
    <div class="uacts">${doc?`<button class="btn pri" type="button" data-doc="${esc(u)}">${DOCICON}<span>Survey plat</span></button>`:`<button class="btn" type="button" disabled>${DOCICON}<span>${u?'No survey plat attached':'Survey plat'}</span></button>`}<button class="btn" type="button" id="u-recs">View ${fmt(rr.length)} records</button></div>
    <div class="stats">${stat('% leased',pctTxt(p),'')}${stat('Unit acres · plat',u===OUT?'–':fmt(unitAc(rr),3),u===OUT?'':'ac')}${stat('<i class="sw" style="background:var(--s-acq)"></i>Leased',fmt(pb.l,2),'ac')}${stat('<i class="sw" style="background:var(--s-work)"></i>Unleased',fmt(pb.u,2),'ac')}</div>`;
  $('#u-prev').onclick=()=>{ if(i>0) setUnit(UNITS[i-1]); };
  $('#u-next').onclick=()=>{ setUnit(u?UNITS[i+1]:UNITS[0]); };
  $('#u-recs').onclick=()=>setTab('ll');
  wireDocs($('#uhead'));
}
function renderPlat(){
  if(PL.tract&&state.unit&&TSTAT[PL.tract]&&TSTAT[PL.tract].unit!==state.unit) PL.tract=null;
  renderUnitHead();
  if($('#pane-un').hidden) return;
  const svg=$('#plat');
  $$('#pl-shade button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===PL.shade));
  svg.setAttribute('preserveAspectRatio','xMidYMid meet');
  svg.innerHTML=platMarkup('p');
  if(PL.fitKey!==state.unit||!PL.vb) fitPlat(); else setVB(PL.vb);
  $('#pl-leg').innerHTML=legendHtml();
  const miss=MISSING.filter(id=>!state.unit||TSTAT[id].unit===state.unit);
  $('#pl-foot').textContent=(state.unit===OUT?'Outside tracts sit around the units, so the whole parcel map is shown. ':'')+(miss.length?`${fmt(miss.length)} tract${miss.length>1?'s':''} in this view have no parcel shape (${fmt(miss.reduce((a,id)=>a+TSTAT[id].t,0),2)} net ac); they still count in every total.`:'Every tract in this view has a parcel shape.');
  renderSide();
}
function renderSide(){
  const el=$('#pside'), t=PL.tract&&TSTAT[PL.tract]?PL.tract:null;
  if(t){ const S=TSTAT[t], gt=GEO.t.find(x=>x.id===t), rows=DATA.filter(r=>r.id===t), own=[...rows].sort((a,b)=>(b.cac||0)-(a.cac||0)), st=S.s;
    el.innerHTML=`<button class="back" type="button" id="ps-back">← ${esc(state.unit?bl(state.unit):'All units')}</button>
      <div><div class="pid">${esc(t)}</div><h3>${TNUM[t]?'Tract '+esc(TNUM[t])+' · ':''}${esc(ushort(S.unit))}</h3>
      <span class="spill">${swatch(st)}${PST[st].label}</span></div>
      <div class="s3"><div><b>${fmt(S.p*100,1)}%</b><span>Leased</span></div><div><b>${fmt(S.l,2)}</b><span>Leased net ac</span></div><div><b>${fmt(S.t-S.l,2)}</b><span>Unleased net ac</span></div></div>
      <div class="kv"><span>Tract acres</span><b>${S.tac!=null?fmt(S.tac,3):'–'}</b><span>Net acres</span><b>${fmt(S.t,3)}</b>${PLATCALL[S.unit]?`<span>On survey plat</span><b>${OFFPLAT.has(t)?'No · not in unit acres':'Yes'}</b>`:''}<span>Owner rows</span><b>${fmt(rows.length)}</b>${gt&&gt.note?`<span>Parcel note</span><b>${esc(title(gt.note))}</b>`:''}</div>
      <div class="lbl">Owners · net ac</div>
      <div class="olist">${own.map(r=>{ const g=gOf(r.g); return `<button type="button" class="orow" data-i="${r.i}"><i class="sw" style="background:var(${g.c})"></i><span class="on">${esc(r.owner)}<small>${r.lno?esc(r.lno)+' · ':''}${esc(bl(r.lesseeL))}</small></span><b>${fmt(r.dup?0:(r.cac||0),4)}</b></button>`; }).join('')}</div>
      <div class="acts"><button class="btn" type="button" id="ps-zoom" ${gt?'':'disabled'}>Zoom to tract</button><button class="btn pri" type="button" id="ps-ll">Open in Records</button></div>`;
    $('#ps-back').onclick=()=>unselectTract();
    $('#ps-zoom').onclick=()=>zoomTract(t);
    $('#ps-ll').onclick=()=>{ state.q=t; $('#q').value=t; setTab('ll'); render(); };
    el.querySelectorAll('.orow').forEach(b=>b.onclick=()=>openDrawer(DATA[+b.dataset.i]));
    return; }
  const rows=filtered({noLs:true});
  const all=[...new Set(rows.map(r=>r.id))].map(id=>({id,S:TSTAT[id]})).sort((a,b)=>(b.S.t-b.S.l)-(a.S.t-a.S.l)||String(TNUM[a.id]||a.id).localeCompare(String(TNUM[b.id]||b.id),undefined,{numeric:true}));
  const open=all.filter(x=>x.S.t-x.S.l>1e-6), cnt={L:0,P:0,U:0,Z:0}; all.forEach(x=>cnt[x.S.s]++);
  el.innerHTML=`<div class="tcount">${['L','P','U','Z'].map(k=>`<span>${swatch(k)}${PST[k].label} <b>${fmt(cnt[k])}</b></span>`).join('')}</div>
    <div class="lbl">Tracts with unleased interest · ${fmt(open.length)}</div>
    <div class="olist">${open.slice(0,40).map(x=>`<button type="button" class="orow" data-t="${esc(x.id)}">${swatch(x.S.s)}<span class="on">${TNUM[x.id]?'Tract '+esc(TNUM[x.id]):esc(x.id)}${state.unit?'':' · '+esc(ushort(x.S.unit))}<small>${esc(x.id)} · ${fmt(x.S.p*100,1)}% leased${SHP_IDS.has(x.id)?'':' · no parcel shape'}</small></span><b>${fmt(x.S.t-x.S.l,2)}<em>ac</em></b></button>`).join('')||'<div class="empty">Every tract in this view is fully leased.</div>'}</div>
    <p class="note">Click a tract on the map or in this list for its owners and leases.</p>`;
  el.querySelectorAll('.orow').forEach(b=>b.onclick=()=>{ PL.tract=b.dataset.t; renderPlat(); zoomTract(b.dataset.t); if(typeof showMap==='function') showMap(); });
}
$$('#pl-shade button').forEach(b=>b.onclick=()=>{ PL.shade=b.dataset.v; try{localStorage.setItem('pwe-shade',PL.shade)}catch(e){} renderPlat(); });
(function(){ const svg=$('#plat'); let drag=null;
  const scale=()=>{ const r=svg.getBoundingClientRect(); return Math.max(PL.vb[2]/r.width,PL.vb[3]/r.height); };
  const toSvg=e=>{ const r=svg.getBoundingClientRect(), s=scale(); return [PL.vb[0]+PL.vb[2]/2+(e.clientX-r.left-r.width/2)*s, PL.vb[1]+PL.vb[3]/2+(e.clientY-r.top-r.height/2)*s]; };
  const zoom=(k,c)=>{ const [x,y,w,h]=PL.vb; const nw=w*k, minW=GEO.w/60,maxW=GEO.w*1.6; if(nw<minW) k=minW/w; if(nw>maxW) k=maxW/w; const [cx,cy]=c||[x+w/2,y+h/2]; setVB([cx-(cx-x)*k,cy-(cy-y)*k,w*k,h*k]); };
  svg.addEventListener('wheel',e=>{ e.preventDefault(); zoom(e.deltaY>0?1.2:1/1.2,toSvg(e)); },{passive:false});
  svg.addEventListener('pointerdown',e=>{ drag={x:e.clientX,y:e.clientY,vb:[...PL.vb],s:scale(),moved:false,t:e.target}; svg.setPointerCapture(e.pointerId); });
  svg.addEventListener('pointermove',e=>{ if(!drag) return; const dx=e.clientX-drag.x, dy=e.clientY-drag.y; if(!drag.moved&&Math.hypot(dx,dy)<4) return; drag.moved=true; hideTip(); svg.classList.add('panning'); setVB([drag.vb[0]-dx*drag.s,drag.vb[1]-dy*drag.s,drag.vb[2],drag.vb[3]]); });
  svg.addEventListener('pointerup',e=>{ if(!drag) return; const d=drag; drag=null; svg.classList.remove('panning');
    if(!d.moved){ const p=d.t.closest&&d.t.closest('.tract'); if(p&&TSTAT[p.dataset.id]){ if(PL.tract===p.dataset.id){ unselectTract(); return; } if(!state.unit&&p.dataset.u&&p.dataset.u!==OUT){ state.unit=p.dataset.u; PL.fitKey=null; } PL.tract=p.dataset.id; render(); } else if(PL.tract) unselectTract(); } });
  $('#z-in').onclick=()=>zoom(1/1.4); $('#z-out').onclick=()=>zoom(1.4); $('#z-fit').onclick=()=>fitPlat();
})();

// ---------- records ----------
const COLS=[{k:'id',l:'Tract ID',cls:'id'},{k:'unitL',l:'Unit',f:ushort},{k:'tn',l:'Plat tract'},{k:'owner',l:'Mineral owner',cls:'own'},{k:'ls',l:'Landowner status',pill:1},
  {k:'int',l:'Min int',r:1,d:6},{k:'tac',l:'Tract ac',r:1,d:3},{k:'cac',l:'Net ac',r:1,d:4},{k:'lesseeL',l:'Current lessee',f:bl},{k:'lno',l:'Lease no.'},{k:'formL',l:'Lease form',f:bl},{k:'eff',l:'Effective',f:mdy},{k:'exp',l:'Expires',f:mdy}];
// no plat tract numbers (e.g. PWE IV) → drop that column
if(!Object.keys(TNUM).length) COLS.splice(COLS.findIndex(c=>c.k==='tn'),1);
let listRows=[];
function renderList(){
  $('#llh').innerHTML='<tr>'+COLS.map(c=>`<th class="${c.r?'r':''}${state.sort===c.k?' sorted':''}" data-k="${c.k}" scope="col">${c.l}<span class="ar">${state.sort===c.k?(state.dir>0?'▲':'▼'):'↕'}</span></th>`).join('')+'</tr>';
  $$('#llh th').forEach(th=>th.onclick=()=>{ const k=th.dataset.k; if(state.sort===k) state.dir*=-1; else { state.sort=k; state.dir=COLS.find(c=>c.k===k).r?-1:1; } renderList(); });
  const rows=filtered({q:true}), k=state.sort, d=state.dir;
  rows.sort((a,b)=>{ const x=a[k],y=b[k]; if((x==null||x==='')&&(y==null||y==='')) return 0; if(x==null||x==='') return 1; if(y==null||y==='') return -1;
    return (typeof x==='number'&&typeof y==='number'?x-y:String(x).localeCompare(String(y),undefined,{numeric:true}))*d; });
  listRows=rows;
  $('#llShown').textContent=fmt(rows.length); $('#llTracts').textContent=fmt(tracts(rows)); $('#llAc').textContent=fmt(net(rows),2); $('#llct').textContent=fmt(rows.length);
  if(!rows.length){ $('#llb').innerHTML=`<tr><td colspan="${COLS.length}" class="empty">No records match. Clear a filter or the search.</td></tr>`; return; }
  $('#llb').innerHTML=rows.map((r,i)=>`<tr tabindex="0" data-i="${i}">`+COLS.map(c=>{ let v=r[c.k];
    if(c.pill){ const g=gOf(r.g); return `<td><span class="spill"><i class="sw" style="background:var(${g.c})"></i>${g.label}</span></td>`; }
    if(c.k==='cac'&&r.dup) return `<td class="r muted" title="Repeat of this owner's interest under another lease; counted once">${fmt(r.nac||0,4)}*</td>`;
    if(v==null||v===''||v===BLANK) return `<td class="${c.r?'r ':''}muted">–</td>`;
    v=c.d!=null?fmt(v,c.d):c.f?c.f(v):v;
    if(c.k==='id'||c.k==='tn') return `<td class="${c.cls||''}"><button type="button" class="jump" data-jump="${esc(r.id)}" data-tip="Show on plat map">${esc(v)}</button></td>`;
    return `<td class="${c.r?'r ':''}${c.cls||''}"${c.cls==='own'?` title="${esc(v)}"`:''}>${esc(v)}</td>`; }).join('')+'</tr>').join('');
}
$('#llb').addEventListener('click',e=>{ const j=e.target.closest('[data-jump]'); if(j){ openTract(j.dataset.jump); return; } const tr=e.target.closest('tr[data-i]'); if(tr) openDrawer(listRows[+tr.dataset.i]); });
$('#llb').addEventListener('keydown',e=>{ const tr=e.target.closest('tr[data-i]'); if(tr&&e.key==='Enter') openDrawer(listRows[+tr.dataset.i]); });
let qt; $('#q').addEventListener('input',e=>{ clearTimeout(qt); qt=setTimeout(()=>{ state.q=e.target.value.trim(); renderList(); renderChips(); },120); });
$('#copy').onclick=async()=>{
  const q=v=>{ v=v==null?'':String(v); return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; };
  const hdr=['Tract ID','Unit','Plat tract','Abstract','Mineral owner','Owner ID','Address','Phone','Landowner status','Mineral interest','Tract acres','Net acres','Net acres counted','Current lessee','Lease no.','Lease form','Effective','Expires'];
  const csv=[hdr.join(',')].concat(listRows.map(r=>[r.id,r.unit,r.tn,r.abs,r.owner,r.oid,r.addr,r.phone,r.ls,r.int,r.tac,r.nac,r.cac,r.lessee,r.lno,r.form,mdy(r.eff),mdy(r.exp)].map(q).join(','))).join('\n');
  const b=$('#copy'), old=b.textContent;
  try{ await navigator.clipboard.writeText(csv); b.textContent=`Copied ${fmt(listRows.length)} rows`; }
  catch(e){ const ta=document.createElement('textarea'); ta.value=csv; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); b.textContent='Copied'; }catch(_){ b.textContent='Copy failed'; } ta.remove(); }
  setTimeout(()=>b.textContent=old,1800); };

function openDrawer(r){ const g=gOf(r.g), row=(l,v)=>(v==null||v==='')?'':`<dt>${l}</dt><dd>${v}</dd>`, n=(v,d)=>v!=null?fmt(v,d):'';
  $('#d-id').textContent=r.id+(r.tn?' · Tract '+r.tn:''); $('#d-owner').textContent=r.owner;
  $('#d-body').innerHTML=`<h4>Status</h4><dl>${row('Landowner status',`<span class="spill"><i class="sw" style="background:var(${g.c})"></i>${g.label}</span>`)}${row('Title status',esc(title(r.title)))}${row('Held by',esc(r.held))}</dl>
   <h4>Mineral owner</h4><dl>${row('Name',esc(r.owner))}${row('Owner ID',esc(r.oid))}${row('Address',esc(r.addr))}${row('Phone',esc(r.phone))}${row('Mineral interest',n(r.int,8))}${row('Net acres',n(r.nac,4)+(r.dup?' (repeat row, counted once)':''))}</dl>
   <h4>Tract</h4><button class="btn pri" type="button" id="d-map" style="margin-bottom:10px">Show on plat map</button><dl>${row('Tract ID',esc(r.id))}${row('Plat tract',esc(r.tn))}${row('Unit',esc(bl(r.unitL)))}${row('Abstract',esc(r.absL))}${row('County',esc(title(r.cty)))}${row('Tract acres',n(r.tac,3))}</dl>
   ${r.lno||r.lessee?`<h4>Lease</h4><dl>${row('Lease no.',esc(r.lno))}${row('Lessor',esc(r.lessor))}${row('Current lessee',esc(r.lessee))}${row('Vol/Page',esc(r.vp))}${row('Lease form',esc(title(r.form)))}${row('Effective',esc(mdy(r.eff)))}${row('Expires',esc(mdy(r.exp)))}${row('Term',esc(r.term))}${row('Gross acres',n(r.lgac,2))}${row('Net acres',n(r.lnac,4))}${row('Royalty',r.roy!=null?fmt(r.roy*100,2)+'%':'')}${row('Bonus / ac',r.bonus!=null?'$'+fmt(r.bonus,2):'')}</dl>`:''}`;
  $('#d-map').onclick=()=>{ closeDrawer(); openTract(r.id); };
  $('#drawer').hidden=false; $('#scrim').hidden=false; $('#d-close').focus(); }
const closeDrawer=()=>{ $('#drawer').hidden=true; $('#scrim').hidden=true; };
$('#d-close').onclick=closeDrawer; $('#scrim').onclick=closeDrawer;

// ---------- survey plat viewer ----------
const DV={doc:null,s:1,x:0,y:0};
function wireDocs(root){ (root||document).querySelectorAll('[data-doc]').forEach(b=>b.onclick=e=>{ e.stopPropagation(); openDoc(b.dataset.doc); }); }
function dvApply(){ const im=$('#dv-img'); im.style.transform=`translate(${DV.x}px,${DV.y}px) scale(${DV.s})`; $('#dv-z').textContent=Math.round(DV.s*100)+'%'; }
function dvFit(width){ const b=$('#dvb').getBoundingClientRect(), im=$('#dv-img'), w=im.naturalWidth, h=im.naturalHeight; if(!w) return;
  DV.s=width?(b.width-32)/w:Math.min((b.width-32)/w,(b.height-32)/h); DV.x=(b.width-w*DV.s)/2; DV.y=width?16:(b.height-h*DV.s)/2; dvApply(); }
function dvZoom(k,cx,cy){ const b=$('#dvb').getBoundingClientRect(); if(cx==null){ cx=b.width/2; cy=b.height/2; } const ns=Math.min(4,Math.max(.08,DV.s*k)); k=ns/DV.s; DV.x=cx-(cx-DV.x)*k; DV.y=cy-(cy-DV.y)*k; DV.s=ns; dvApply(); }
function openDoc(u){ const d=PLATDOCS[u]; if(!d) return; DV.doc=u; $('#dv-title').textContent=d.title; $('#dv-sub').textContent=d.sub; const im=$('#dv-img');
  im.alt=d.title; im.onload=()=>dvFit(false); $('#docv').hidden=false; if(im.getAttribute('src')!==d.src) im.src=d.src; else requestAnimationFrame(()=>dvFit(false)); $('#dv-close').focus(); }
const closeDoc=()=>{ $('#docv').hidden=true; };
$('#dv-close').onclick=closeDoc; $('#dv-fit').onclick=()=>dvFit(false); $('#dv-w').onclick=()=>dvFit(true); $('#dv-in').onclick=()=>dvZoom(1.25); $('#dv-out').onclick=()=>dvZoom(1/1.25);
document.addEventListener('keydown',e=>{ if(e.key!=='Escape') return; if(!$('#docv').hidden) closeDoc(); else if(!$('#drawer').hidden) closeDrawer(); else if(PL.tract) unselectTract(); });
(function(){ const box=$('#dvb'); let dr=null;
  box.addEventListener('wheel',e=>{ e.preventDefault(); const b=box.getBoundingClientRect(); dvZoom(e.deltaY>0?1/1.15:1.15,e.clientX-b.left,e.clientY-b.top); },{passive:false});
  box.addEventListener('pointerdown',e=>{ dr={x:e.clientX,y:e.clientY,ox:DV.x,oy:DV.y}; box.setPointerCapture(e.pointerId); box.classList.add('panning'); });
  box.addEventListener('pointermove',e=>{ if(!dr) return; DV.x=dr.ox+e.clientX-dr.x; DV.y=dr.oy+e.clientY-dr.y; dvApply(); });
  const up=()=>{ dr=null; box.classList.remove('panning'); }; box.addEventListener('pointerup',up); box.addEventListener('pointercancel',up);
  box.addEventListener('dblclick',e=>{ const b=box.getBoundingClientRect(); dvZoom(2,e.clientX-b.left,e.clientY-b.top); });
  if(window.ResizeObserver) new ResizeObserver(()=>{ if(!$('#docv').hidden) dvFit(false); }).observe(box);
})();

