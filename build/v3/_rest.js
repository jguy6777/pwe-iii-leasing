// dates arrive as YYYY-MM-DD; show mm/dd/yyyy, sort on the stored value
const mdy=v=>{ const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(v||''); return m?`${m[2]}/${m[3]}/${m[1]}`:(v||''); };
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
  initPlat(); MP.invalidateSize();
  $$('#pl-shade button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===PL.shade));
  $$('#z-base button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.b===PL.base));
  if(PL.fitKey!==state.unit) fitPlat();
  setBase(MP); drawMap(MP);
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

// ---------- records ----------
const COLS=[{k:'lno',l:'Contract no.'},{k:'id',l:'Tract ID',cls:'id'},{k:'unitL',l:'Unit',f:ushort},{k:'tn',l:'Plat tract'},{k:'owner',l:'Mineral owner',cls:'own'},{k:'ls',l:'Landowner status',pill:1},
  {k:'int',l:'Min int',r:1,d:6},{k:'tac',l:'Tract ac',r:1,d:3},{k:'cac',l:'Net ac',r:1,d:4},{k:'lesseeL',l:'Current lessee',f:bl},{k:'eff',l:'Effective',f:mdy},{k:'exp',l:'Expires',f:mdy}];
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
// Export the rows currently shown in Records to an Excel workbook: one sheet, formatted as an Excel table
// (green header, filter buttons). ExcelJS is loaded only when the button is clicked.
function loadExcelJS(){ if(window.ExcelJS) return Promise.resolve(window.ExcelJS);
  const tryLoad=src=>new Promise((ok,no)=>{ const s=document.createElement('script'); s.src=src; s.onload=()=>window.ExcelJS?ok(window.ExcelJS):no(); s.onerror=no; document.head.appendChild(s); });
  return tryLoad('../lib/exceljs.min.js').catch(()=>tryLoad('https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js')); }
const xdate=v=>{ const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(v||''); return m?new Date(Date.UTC(+m[1],+m[2]-1,+m[3])):null; };
$('#copy').onclick=async()=>{
  const b=$('#copy'), old=b.textContent; b.disabled=true; b.textContent='Building…';
  try{
    const XL=await loadExcelJS(), U=(COLS.find(c=>c.k==='unitL')||{l:'Unit'}).l;
    const hasTn=Object.keys(TNUM).length>0, hasAbs=listRows.some(r=>r.abs!=null);
    const C=[['Contract no.',r=>r.lno||null,14],['Tract ID',r=>r.id,18],[U,r=>r.unit?bl(r.unit):'Outside',16],hasTn&&['Plat tract',r=>r.tn||null,10],hasAbs&&['Abstract',r=>r.abs!=null?'A-'+r.abs:null,10],
      ['Mineral owner',r=>r.owner,40],['Owner ID',r=>r.oid??null,11],['Address',r=>r.addr||null,40],['Phone',r=>r.phone||null,16],['Landowner status',r=>title(r.ls),15],
      ['Mineral interest',r=>r.int??null,15,'0.000000'],['Tract acres',r=>r.tac??null,12,'#,##0.000'],['Net acres',r=>r.nac??null,12,'#,##0.0000'],['Net acres counted',r=>r.cac??0,15,'#,##0.0000'],
      ['Current lessee',r=>r.lessee?title(r.lessee):null,30],['Effective',r=>xdate(r.eff),12,'mm/dd/yyyy'],['Expires',r=>xdate(r.exp),12,'mm/dd/yyyy']].filter(Boolean);
    const wb=new XL.Workbook(); wb.creator='PWE Dashboard'; wb.created=new Date();
    const ws=wb.addWorksheet('Records',{views:[{state:'frozen',ySplit:1}]});
    ws.addTable({name:'Records',ref:'A1',headerRow:true,style:{theme:'TableStyleMedium7',showRowStripes:true},
      columns:C.map(c=>({name:c[0],filterButton:true})),rows:listRows.map(r=>C.map(c=>c[1](r)))});
    C.forEach((c,i)=>{ const col=ws.getColumn(i+1); col.width=c[2]; if(c[3]) col.numFmt=c[3]; });
    const hr=ws.getRow(1); hr.font={bold:true,color:{argb:'FFFFFFFF'}}; hr.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF2F6B45'}}; hr.alignment={vertical:'middle'}; hr.height=20;
    const buf=await wb.xlsx.writeBuffer(), d=$('.datepill')?$('.datepill').textContent.trim():'';
    const name=`${document.title.replace(/ Leasing$/,'')} Records${state.unit?' - '+bl(state.unit):''}${d?' - '+d.replace(/,/g,''):''}.xlsx`;
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})); a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),4000);
    b.textContent=`Exported ${fmt(listRows.length)} rows`;
  }catch(e){ console.error(e); b.textContent='Export failed'; }
  b.disabled=false; setTimeout(()=>b.textContent=old,2200); };

function openDrawer(r){ const g=gOf(r.g), row=(l,v)=>(v==null||v==='')?'':`<dt>${l}</dt><dd>${v}</dd>`, n=(v,d)=>v!=null?fmt(v,d):'';
  $('#d-id').textContent=r.id+(r.tn?' · Tract '+r.tn:''); $('#d-owner').textContent=r.owner;
  $('#d-body').innerHTML=`<h4>Status</h4><dl>${row('Landowner status',`<span class="spill"><i class="sw" style="background:var(${g.c})"></i>${g.label}</span>`)}${row('Title status',esc(title(r.title)))}${row('Held by',esc(r.held))}</dl>
   <h4>Mineral owner</h4><dl>${row('Name',esc(r.owner))}${row('Owner ID',esc(r.oid))}${row('Address',esc(r.addr))}${row('Phone',esc(r.phone))}${row('Mineral interest',n(r.int,8))}${row('Net acres',n(r.nac,4)+(r.dup?' (repeat row, counted once)':''))}</dl>
   <h4>Tract</h4><button class="btn pri" type="button" id="d-map" style="margin-bottom:10px">Show on plat map</button><dl>${row('Tract ID',esc(r.id))}${row('Plat tract',esc(r.tn))}${row('Unit',esc(bl(r.unitL)))}${row('Abstract',esc(r.absL))}${row('County',esc(title(r.cty)))}${row('Tract acres',n(r.tac,3))}</dl>
   ${r.lno||r.lessee?`<h4>Lease</h4><dl>${row('Contract no.',esc(r.lno))}${row('Lessor',esc(r.lessor))}${row('Current lessee',esc(r.lessee))}${row('Vol/Page',esc(r.vp))}${row('Effective',esc(mdy(r.eff)))}${row('Expires',esc(mdy(r.exp)))}${row('Term',esc(r.term))}${row('Gross acres',n(r.lgac,2))}${row('Net acres',n(r.lnac,4))}${row('Royalty',r.roy!=null?fmt(r.roy*100,2)+'%':'')}${row('Bonus / ac',r.bonus!=null?'$'+fmt(r.bonus,2):'')}</dl>`:''}`;
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

