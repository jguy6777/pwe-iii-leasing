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
      ${leaseList(rows)}
      <div class="acts"><button class="btn" type="button" id="ps-zoom" ${gt?'':'disabled'}>Zoom to tract</button><button class="btn pri" type="button" id="ps-ll">Open in Records</button></div>`;
    $('#ps-back').onclick=()=>unselectTract();
    $('#ps-zoom').onclick=()=>zoomTract(t);
    $('#ps-ll').onclick=()=>{ state.q=t; $('#q').value=t; setTab('ll'); render(); };
    el.querySelectorAll('.orow').forEach(b=>b.onclick=()=>openDrawer(DATA[+b.dataset.i]));
    wireLeases(el);
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
// Records columns follow a reference Mapper export layout (build_rec.py): same columns, same order, contract no. first.
// Values come from the project's current export; REC.v holds one row of indexes into REC.u per DATA row.
const UNITL=(SBCOLS.find(c=>c.k==='unit')||{l:'Unit'}).l;
const RLAB={BRK_LSE_NO:'Contract no.',TR_NUM:'Tract ID',CLIENT_UNIT:UNITL,ABSTRACT:'Abstract',ABSTRACT_NAME:'Abstract name',STATE:'State',TRACT_COUNTY:'County',TRACT_ACRES:'Tract ac',MIN_INT:'Min int',NET_AC:'Net ac',
  ASSOCIATEID:'Owner ID',MINERAL_OWNER:'Mineral owner',ADDRESS:'Address',PHONE_NO:'Phone',HELD_BY:'Held by',LEASING_STATUS:'Landowner status',ORIGINAL_LESSOR:'Original lessor',LESSOR:'Lessor',CURRENT_LESSEE:'Current lessee',
  CLIENT_LEASE_NO:'Client lease no.',SYMBOL:'Symbol',VOL_PAGE:'Vol/Page',EFFECTIVE_DATE:'Effective',EXPIRATION_DATE:'Expires',LSE_GROSS_AC:'Lease gross ac',LSE_NET_AC:'Lease net ac',BONUS_PER_AC:'Bonus/ac',ROYALTY:'Royalty',
  TERM:'Term',OPTION_TERM:'Option term',OPTION_EXP_DATE:'Option expires',OPT_BONUS_PER_AC:'Option bonus/ac',BONUS_TOTAL:'Bonus total',OPT_BONUS_TOTAL:'Option bonus total',Breech_of_Contract:'Breach of contract'};
const RNUM={TRACT_ACRES:3,MIN_INT:8,NET_AC:4,LSE_GROSS_AC:3,LSE_NET_AC:4,ROYALTY:4,BONUS_PER_AC:2,OPT_BONUS_PER_AC:2,BONUS_TOTAL:2,OPT_BONUS_TOTAL:2};
const RDATE=new Set(['EFFECTIVE_DATE','EXPIRATION_DATE','OPTION_EXP_DATE']), RTAG=new Set(['MINERAL_OWNER','LESSOR','ORIGINAL_LESSOR']);
const hum=s=>{ s=String(s).replace(/:+$/,'').replace(/_+/g,' ').trim(); return s.charAt(0).toUpperCase()+s.slice(1).toLowerCase(); };
DATA.forEach((r,i)=>{ const v=REC.v[i]; REC.cols.forEach((c,j)=>{ let x=REC.u[v[j]]; if(RTAG.has(c)&&x) x=untag(x); if(c==='CLIENT_UNIT') x=r.unitL; r['x'+j]=x; }); });
const COLS=REC.cols.map((c,j)=>({k:'x'+j,src:c,l:RLAB[c]||hum(c),r:c in RNUM||c==='ASSOCIATEID'||c==='ABSTRACT',d:RNUM[c],
  f:RDATE.has(c)?mdy:c==='CLIENT_UNIT'?bl:c==='LEASING_STATUS'?title:null,pill:c==='LEASING_STATUS',jump:c==='TR_NUM',net:c==='NET_AC',cls:c==='TR_NUM'?'id':c==='MINERAL_OWNER'?'own':''}));
state.sort=(COLS.find(c=>c.src==='TR_NUM')||COLS[0]).k;
// Column widths follow the content: text columns whose longest value runs past ~22 characters wrap inside a capped width.
(()=>{ const css=[]; COLS.forEach((c,i)=>{ if(c.r||RDATE.has(c.src)||c.pill||c.jump) return;
    const L=[]; for(const r of DATA){ const v=r[c.k]; if(v!=null&&v!=='') L.push(String(c.f?c.f(v):v).length); }
    if(!L.length) return; L.sort((x,y)=>x-y); const m=L[L.length-1], p=L[Math.floor(L.length*.9)];
    if(m<=22) return; const w=p>45?200:p>28?160:p>16?130:110;   // typical (90th percentile) length sets the width; rare long values wrap
    css.push(`#ll tr>*:nth-child(${i+1}){white-space:normal;width:${w}px;min-width:${w}px;max-width:${w}px}#ll td:nth-child(${i+1}){overflow-wrap:anywhere}`); });
  const s=document.createElement('style'); s.textContent=css.join('\n'); document.head.appendChild(s); })();
let listRows=[];
// Records is built only while its tab is open, and drawn 200 rows at a time as you scroll (all rows still feed counts, search, sort and export).
const LL={dirty:true,shown:0,step:200};
function rowHtml(r,i){ return `<tr tabindex="0" data-i="${i}">`+COLS.map(c=>{ let v=r[c.k];
    if(c.pill){ const g=gOf(r.g); return `<td><span class="spill"><i class="sw" style="background:var(${g.c})"></i>${g.label}</span></td>`; }
    if(c.net&&r.dup) return `<td class="r muted" title="Repeat of this owner's interest under another lease; counted once">${fmt(v||0,4)}*</td>`;
    if(v==null||v===''||v===BLANK) return `<td class="${c.r?'r ':''}muted">–</td>`;
    v=c.d!=null?fmt(v,c.d):c.f?c.f(v):v;
    if(c.jump) return `<td class="${c.cls||''}"><button type="button" class="jump" data-jump="${esc(r.id)}" data-tip="Show on plat map">${esc(v)}</button></td>`;
    return `<td class="${c.r?'r ':''}${c.cls||''}"${c.cls==='own'?` title="${esc(v)}"`:''}>${esc(v)}</td>`; }).join('')+'</tr>'; }
function moreRows(){ if(LL.shown>=listRows.length) return; const n=Math.min(listRows.length,LL.shown+LL.step);
  $('#llb').insertAdjacentHTML('beforeend',listRows.slice(LL.shown,n).map((r,j)=>rowHtml(r,LL.shown+j)).join('')); LL.shown=n; }
$('#ll').addEventListener('scroll',e=>{ const el=e.currentTarget; if(el.scrollTop+el.clientHeight>el.scrollHeight-600) moreRows(); },{passive:true});
function renderList(){
  if($('#pane-ll').hidden){ $('#llct').textContent=fmt(filtered({q:true}).length); LL.dirty=true; return; }
  LL.dirty=false;
  $('#llh').innerHTML='<tr>'+COLS.map(c=>`<th class="${c.r?'r':''}${state.sort===c.k?' sorted':''}" data-k="${c.k}" scope="col">${c.l}<span class="ar">${state.sort===c.k?(state.dir>0?'▲':'▼'):'↕'}</span></th>`).join('')+'</tr>';
  $$('#llh th').forEach(th=>th.onclick=()=>{ const k=th.dataset.k; if(state.sort===k) state.dir*=-1; else { state.sort=k; state.dir=COLS.find(c=>c.k===k).r?-1:1; } renderList(); });
  const rows=filtered({q:true}), k=state.sort, d=state.dir;
  rows.sort((a,b)=>{ const x=a[k],y=b[k]; if((x==null||x==='')&&(y==null||y==='')) return 0; if(x==null||x==='') return 1; if(y==null||y==='') return -1;
    return (typeof x==='number'&&typeof y==='number'?x-y:String(x).localeCompare(String(y),undefined,{numeric:true}))*d; });
  listRows=rows;
  $('#llShown').textContent=fmt(rows.length); $('#llTracts').textContent=fmt(tracts(rows)); $('#llAc').textContent=fmt(net(rows),2); $('#llct').textContent=fmt(rows.length);
  $('#ll').scrollTop=0;
  if(!rows.length){ $('#llb').innerHTML=`<tr><td colspan="${COLS.length}" class="empty">No records match. Clear a filter or the search.</td></tr>`; LL.shown=0; return; }
  $('#llb').innerHTML=''; LL.shown=0; moreRows();
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
    const XL=await loadExcelJS();
    // same columns as Records, headed with the Mapper export field names; projects grouped by township export that grouping
    const C=COLS.map(c=>[c.src==='CLIENT_UNIT'&&UNITL!=='Unit'?'TOWNSHIP_RANGE':c.src, RDATE.has(c.src)?(r=>xdate(r[c.k])):(r=>r[c.k]===''||r[c.k]===undefined?null:r[c.k]),
      Math.min(40,Math.max(10,(c.src.length>24?14:c.src.length+3),/OWNER|LESSOR|ADDRESS|LESSEE|VOL_PAGE/.test(c.src)?34:0)), RDATE.has(c.src)?'mm/dd/yyyy':null]);
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
   ${r.lno||r.lessee?`<h4>Lease</h4>${leaseBtn(r.lno,true)}<dl>${row('Contract no.',esc(r.lno))}${row('Lessor',esc(r.lessor))}${row('Current lessee',esc(r.lessee))}${row('Vol/Page',esc(r.vp))}${row('Effective',esc(mdy(r.eff)))}${row('Expires',esc(mdy(r.exp)))}${row('Term',esc(r.term))}${row('Gross acres',n(r.lgac,2))}${row('Net acres',n(r.lnac,4))}${row('Royalty',r.roy!=null?fmt(r.roy*100,2)+'%':'')}${row('Bonus / ac',r.bonus!=null?'$'+fmt(r.bonus,2):'')}</dl>`:''}`;
  $('#d-map').onclick=()=>{ closeDrawer(); openTract(r.id); }; wireLeases($('#d-body'));
  $('#drawer').hidden=false; $('#scrim').hidden=false; $('#d-close').focus(); }
const closeDrawer=()=>{ $('#drawer').hidden=true; $('#scrim').hidden=true; };
$('#d-close').onclick=closeDrawer; $('#scrim').onclick=closeDrawer;

// ---------- lease viewer ----------
// View lease buttons (record drawer + tract panel) open the recorded lease from LEASEDOCS in the document viewer;
// pages are drawn with pdf.js (loaded on first use) into one tall image so the plat viewer's zoom/pan works on it.
function leaseBtn(lno,big){ if(!lno) return '';
  if(LEASEDOCS[lno]) return `<div class="lbtns" style="margin-bottom:10px"><button class="${big?'btn pri':'pdoc'}" type="button" data-lease="${esc(lno)}">${DOCICON}<span>View lease ${esc(lno)}</span></button></div>`;
  return LEASETEST.test(lno)?`<div class="lnone" style="margin-bottom:8px">No lease file linked yet for ${esc(lno)}</div>`:''; }
function leaseList(rows){ const ls=[...new Set(rows.map(r=>r.lno).filter(Boolean))].sort();
  const show=ls.filter(l=>LEASEDOCS[l]||LEASETEST.test(l)); if(!show.length) return '';
  return `<div><div class="lbl" style="margin-bottom:6px">Leases on this tract</div><div class="lbtns">${show.map(l=>LEASEDOCS[l]
    ?`<button class="pdoc" type="button" data-lease="${esc(l)}" data-tip="${esc(LEASEDOCS[l].sub)}">${DOCICON}<span>${esc(l)}</span></button>`
    :`<span class="pdoc lmiss" data-tip="No lease file linked yet">${esc(l)}</span>`).join('')}</div></div>`; }
function wireLeases(root){ (root||document).querySelectorAll('[data-lease]').forEach(b=>b.onclick=e=>{ e.stopPropagation(); openLease(b.dataset.lease); }); }
let PDFJS=null; const LCACHE={};
function loadPdfJs(){ if(PDFJS) return PDFJS; const base='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  const add=src=>new Promise((res,rej)=>{ const sc=document.createElement('script'); sc.src=src; sc.onload=res; sc.onerror=()=>rej(new Error('Could not load '+src)); document.head.appendChild(sc); });
  PDFJS=add(base+'pdf.min.js').then(()=>add(base+'pdf.worker.min.js')).then(()=>{ pdfjsLib.GlobalWorkerOptions.workerSrc=base+'pdf.worker.min.js'; return pdfjsLib; });
  PDFJS.catch(()=>{ PDFJS=null; }); return PDFJS; }
async function renderLease(src){ const lib=await loadPdfJs(); const buf=await (await fetch(src)).arrayBuffer();
  const pdf=await lib.getDocument({data:buf,isEvalSupported:false}).promise, pages=[];
  for(let i=1;i<=pdf.numPages;i++) pages.push(await pdf.getPage(i));
  const GAP=24, W=1500; let sc=pages.map(p=>W/p.getViewport({scale:1}).width), H=pages.reduce((h,p,i)=>h+p.getViewport({scale:sc[i]}).height+GAP,GAP);
  if(H>30000){ const k=30000/H; sc=sc.map(x=>x*k); H=30000; }
  const big=document.createElement('canvas'); big.width=Math.ceil(Math.max(...pages.map((p,i)=>p.getViewport({scale:sc[i]}).width)))+2*GAP; big.height=Math.ceil(H);
  const g=big.getContext('2d'); g.fillStyle='#c9c2b6'; g.fillRect(0,0,big.width,big.height); let y=GAP;
  for(let i=0;i<pages.length;i++){ const vp=pages[i].getViewport({scale:sc[i]}), c=document.createElement('canvas'); c.width=Math.ceil(vp.width); c.height=Math.ceil(vp.height);
    const cx=c.getContext('2d'); cx.fillStyle='#fff'; cx.fillRect(0,0,c.width,c.height); await pages[i].render({canvasContext:cx,viewport:vp}).promise;
    g.drawImage(c,Math.round((big.width-c.width)/2),Math.round(y)); y+=c.height+GAP; }
  return await new Promise(res=>big.toBlob(b=>res({url:URL.createObjectURL(b),n:pdf.numPages}),'image/jpeg',.88)); }
async function openLease(lno){ const d=LEASEDOCS[lno]; if(!d) return; DV.doc=null; DV.lease=lno;
  const rr=DATA.find(r=>r.lno===lno); $('#dv-title').textContent=`Lease ${lno}${rr&&rr.lessor?' · '+title(rr.lessor):''}`; $('#dv-sub').textContent=d.sub;
  const a=$('#dv-pdf'); a.href=d.src; a.hidden=false; const im=$('#dv-img'), msg=$('#dv-msg');
  $('#docv').hidden=false; $('#dv-close').focus(); im.style.visibility='hidden'; msg.hidden=false; msg.textContent='Loading lease…';
  try{ const r=LCACHE[lno]||(LCACHE[lno]=renderLease(d.src)); const res=await r; if(DV.lease!==lno) return;
    im.alt=`Lease ${lno}`; im.onload=()=>{ im.style.visibility=''; msg.hidden=true; dvFit(true); }; if(im.src!==res.url) im.src=res.url; else im.onload(); }
  catch(e){ console.error(e); delete LCACHE[lno]; if(DV.lease===lno){ msg.textContent='Could not display this lease here. Use Open PDF to view it.'; } } }

// ---------- survey plat viewer ----------
const DV={doc:null,s:1,x:0,y:0};
function wireDocs(root){ (root||document).querySelectorAll('[data-doc]').forEach(b=>b.onclick=e=>{ e.stopPropagation(); openDoc(b.dataset.doc); }); }
function dvApply(){ const im=$('#dv-img'); im.style.transform=`translate(${DV.x}px,${DV.y}px) scale(${DV.s})`; $('#dv-z').textContent=Math.round(DV.s*100)+'%'; }
function dvFit(width){ const b=$('#dvb').getBoundingClientRect(), im=$('#dv-img'), w=im.naturalWidth, h=im.naturalHeight; if(!w) return;
  DV.s=width?(b.width-32)/w:Math.min((b.width-32)/w,(b.height-32)/h); DV.x=(b.width-w*DV.s)/2; DV.y=width?16:(b.height-h*DV.s)/2; dvApply(); }
function dvZoom(k,cx,cy){ const b=$('#dvb').getBoundingClientRect(); if(cx==null){ cx=b.width/2; cy=b.height/2; } const ns=Math.min(4,Math.max(.08,DV.s*k)); k=ns/DV.s; DV.x=cx-(cx-DV.x)*k; DV.y=cy-(cy-DV.y)*k; DV.s=ns; dvApply(); }
function openDoc(u){ const d=PLATDOCS[u]; if(!d) return; DV.doc=u; DV.lease=null; $('#dv-pdf').hidden=true; $('#dv-msg').hidden=true; $('#dv-title').textContent=d.title; $('#dv-sub').textContent=d.sub; const im=$('#dv-img');
  im.alt=d.title; im.onload=()=>dvFit(false); $('#docv').hidden=false; if(im.getAttribute('src')!==d.src) im.src=d.src; else requestAnimationFrame(()=>dvFit(false)); $('#dv-close').focus(); }
const closeDoc=()=>{ $('#docv').hidden=true; };
$('#dv-close').onclick=closeDoc; $('#dv-fit').onclick=()=>dvFit(false); $('#dv-w').onclick=()=>dvFit(true); $('#dv-in').onclick=()=>dvZoom(1.25); $('#dv-out').onclick=()=>dvZoom(1/1.25);
document.addEventListener('keydown',e=>{ if(e.key!=='Escape') return; if(!$('#docv').hidden) closeDoc(); else if(!$('#drawer').hidden) closeDrawer(); else if(PL.tract) unselectTract(); });
(function(){ const box=$('#dvb'); let dr=null;
  // leases: wheel scrolls the pages (Shift+wheel sideways); Ctrl+wheel or trackpad pinch still zooms. Plats keep wheel-to-zoom.
  const clamp=(v,lo,hi)=>lo>hi?(lo+hi)/2:Math.min(hi,Math.max(lo,v));
  function dvScroll(dx,dy){ const b=box.getBoundingClientRect(), im=$('#dv-img'), w=im.naturalWidth*DV.s, h=im.naturalHeight*DV.s;
    DV.x=clamp(DV.x-dx,b.width-w-16,16); DV.y=clamp(DV.y-dy,b.height-h-16,16); dvApply(); }
  box.addEventListener('wheel',e=>{ e.preventDefault(); const b=box.getBoundingClientRect();
    if(DV.lease&&!e.ctrlKey&&!e.metaKey){ let dx=e.deltaX, dy=e.deltaY; const m=e.deltaMode===1?40:e.deltaMode===2?b.height:1; dx*=m; dy*=m;
      if(e.shiftKey&&!dx){ dx=dy; dy=0; } dvScroll(dx,dy); return; }
    dvZoom(e.deltaY>0?1/1.15:1.15,e.clientX-b.left,e.clientY-b.top); },{passive:false});
  box.tabIndex=-1; box.addEventListener('keydown',e=>{ if(!DV.lease) return; const b=box.getBoundingClientRect(), k={ArrowDown:[0,60],ArrowUp:[0,-60],PageDown:[0,b.height*.9],PageUp:[0,-b.height*.9],' ':[0,b.height*.9]}[e.key];
    if(k){ e.preventDefault(); dvScroll(k[0],k[1]); } });
  box.addEventListener('pointerdown',e=>{ dr={x:e.clientX,y:e.clientY,ox:DV.x,oy:DV.y}; box.setPointerCapture(e.pointerId); box.classList.add('panning'); });
  box.addEventListener('pointermove',e=>{ if(!dr) return; DV.x=dr.ox+e.clientX-dr.x; DV.y=dr.oy+e.clientY-dr.y; dvApply(); });
  const up=()=>{ dr=null; box.classList.remove('panning'); }; box.addEventListener('pointerup',up); box.addEventListener('pointercancel',up);
  box.addEventListener('dblclick',e=>{ const b=box.getBoundingClientRect(); dvZoom(2,e.clientX-b.left,e.clientY-b.top); });
  if(window.ResizeObserver) new ResizeObserver(()=>{ if(!$('#docv').hidden) dvFit(false); }).observe(box);
})();

