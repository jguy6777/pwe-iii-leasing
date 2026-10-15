// ---------- maps (Leaflet) ----------
// Tract shapes are NAD83 lat/long (NADCON shift from NAD27 state plane); basemaps are Esri tiles that need no API key.
GEO.t.forEach(t=>{ t.st=TSTAT[t.id]?TSTAT[t.id].s:'X'; t.unit=TSTAT[t.id]?TSTAT[t.id].unit:null; });
const SHP_IDS=new Set(GEO.t.map(t=>t.id));
const MISSING=[...new Set(DATA.map(r=>r.id))].filter(id=>!SHP_IDS.has(id));
const bnd=b=>L.latLngBounds([b[0],b[1]],[b[2],b[3]]);
const FULLB=bnd(GEO.b);
const PL={fitKey:null,tract:null,shade:'st',base:'sat',grid:true,hide:new Set()}; // hide: lease statuses switched off from the legend
try{ const v=localStorage.getItem('pwe-shade'); if(v==='st'||v==='pct') PL.shade=v; }catch(e){}
try{ const v=localStorage.getItem('pwe-base'); if(v==='sat'||v==='map') PL.base=v; }catch(e){}
try{ const v=localStorage.getItem('pwe-grid'); if(v==='0') PL.grid=false; }catch(e){}
// Clearing the selected tract zooms back out to the whole unit (or all units when none is picked).
function unselectTract(){ PL.tract=null; render(); fitPlat(); }
const merge=bs=>[Math.min(...bs.map(b=>b[0])),Math.min(...bs.map(b=>b[1])),Math.max(...bs.map(b=>b[2])),Math.max(...bs.map(b=>b[3]))];
function unitBox(u){ const o=GEO.u.find(x=>!x.ctx&&x.u===u); if(o) return o.b; const ts=GEO.t.filter(t=>t.unit===u); return ts.length?merge(ts.map(t=>t.b)):null; }
function tractBox(id){ const ps=GEO.t.filter(x=>x.id===id); return ps.length?merge(ps.map(p=>p.b)):null; }
const pctFill=p=>`color-mix(in srgb,var(--s-acq) ${Math.round(p*100)}%,var(--s-work))`;
function tractFill(t,id){ if(PL.shade==='pct'&&TSTAT[t.id]&&TSTAT[t.id].t>0) return pctFill(TSTAT[t.id].p); return PST[t.st].fill.replace('PAT','PAT-'+id); }
const isDark=()=>(document.documentElement.getAttribute('data-theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'))==='dark';
const BASES={
  sat:()=>L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:20,maxNativeZoom:19,attribution:'Imagery &copy; Esri, Maxar, Earthstar Geographics'}),
  // light theme: Esri streets; dark theme: Esri dark gray canvas with its labels
  map:()=>{ const E=s=>L.tileLayer(`https://server.arcgisonline.com/ArcGIS/rest/services/${s}/MapServer/tile/{z}/{y}/{x}`,{maxZoom:20,maxNativeZoom:s.startsWith('Canvas')?16:19,attribution:'Tiles &copy; Esri, HERE, Garmin, OpenStreetMap contributors'});
    return isDark()?L.layerGroup([E('Canvas/World_Dark_Gray_Base'),E('Canvas/World_Dark_Gray_Reference')]):E('World_Street_Map'); }};

function makeMap(el,id,opts){
  const m=L.map(el,Object.assign({zoomControl:false,zoomSnap:.25,zoomDelta:1,wheelPxPerZoomLevel:100,minZoom:8,maxZoom:20},opts));
  m.attributionControl.setPrefix(false);
  m.createPane('grid').style.zIndex=350;
  m._id=id; m._R=L.svg({padding:.6}); m._G=L.svg({pane:'grid',padding:.6});
  m._L={tracts:L.layerGroup().addTo(m),units:L.layerGroup().addTo(m),sel:L.layerGroup().addTo(m),grid:L.layerGroup().addTo(m),labels:L.layerGroup().addTo(m)};
  m.on('movestart',hideTip);
  // a map created while its tab is hidden has no size yet: fit the view once it gets one
  new ResizeObserver(()=>{ m.invalidateSize(); if(!m.getSize().x) return;
    if(id==='k') m.fitBounds(FULLB,{padding:[14,14],animate:false});
    else if(PL.fitKey!==state.unit){ fitPlat(); if(PL.tract) zoomTract(PL.tract); } }).observe(el);
  return m; }
function setBase(m){ const want=PL.base+(PL.base==='map'?(isDark()?'-d':'-l'):''); if(m._baseKey===want) return;
  if(m._base) m.removeLayer(m._base); m._base=BASES[PL.base]().addTo(m); m._baseKey=want;
  m.getContainer().classList.toggle('sat',PL.base==='sat'); }
// hatch for partially leased tracts lives in each map's SVG renderer (fixed pixel size at every zoom)
function ensureDefs(m){ const svg=m._R._container; if(!svg||svg.querySelector('#PAT-'+m._id)) return;
  const s=9; svg.insertAdjacentHTML('afterbegin',`<defs><pattern id="PAT-${m._id}" patternUnits="userSpaceOnUse" width="${s}" height="${s}" patternTransform="rotate(45)"><rect width="${s}" height="${s}" fill="var(--s-acq)"/><rect width="${s*.43}" height="${s}" fill="var(--s-work)"/></pattern></defs>`); }

function tipOf(t){ const S=TSTAT[t.id];
  return S?`<b>${t.ut?'Tract '+esc(t.ut)+' · ':''}${esc(ushort(S.unit))}</b><br>${esc(t.id)}<br>${PST[t.st].label} · ${fmt(S.p*100,1)}% leased<br>${fmt(S.l,2)} of ${fmt(S.t,2)} net ac leased`
    :`<b>${esc(t.id)}</b><br>${esc(t.su?title(t.su)+' · not in this export':'Not in this export')}`; }
function drawMap(m){
  const id=m._id, G=m._L, sat=PL.base==='sat';
  G.tracts.clearLayers(); G.units.clearLayers(); G.sel.clearLayers();
  const match=new Set(filtered({noUnit:true}).map(r=>r.id)), anyF=['ls','lessee','form','abs'].some(k=>state[k]);
  GEO.t.forEach(t=>{ const inUnit=!state.unit||t.unit===state.unit, hit=t.st==='X'||!anyF||match.has(t.id), ctx=t.st==='X', dim=!inUnit||!hit;
    const p=L.polygon(t.c,{renderer:m._R,className:['tract',ctx?'ctx':'',dim?'dim':'',PL.hide.has(t.st)?'off':'',PL.tract===t.id&&id==='p'?'sel':''].filter(Boolean).join(' '),
      fillColor:ctx?'transparent':tractFill(t,id),fillOpacity:ctx?0:(sat?.88:.9),weight:1,bubblingMouseEvents:false}).addTo(G.tracts);
    const el=p.getElement(); if(el){ el.setAttribute('data-id',t.id); el.setAttribute('data-u',t.unit||''); el.setAttribute('data-tip',tipOf(t)); }
    p.on('click',()=>onTract(m,t)); });
  ensureDefs(m);
  GEO.u.forEach(u=>L.polygon(u.c,{renderer:m._R,interactive:false,fill:false,weight:2,
    className:'uline'+(u.ctx?' ctx':'')+(state.unit&&!u.ctx&&u.u!==state.unit?' faint':'')+(state.unit&&u.u===state.unit&&id==='k'?' hl':'')}).addTo(G.units));
  if(id==='p'&&PL.tract) GEO.t.filter(t=>t.id===PL.tract).forEach(t=>{
    L.polygon(t.c,{renderer:m._R,interactive:false,className:'selhalo',weight:14,fillOpacity:.18}).addTo(G.sel);
    L.polygon(t.c,{renderer:m._R,interactive:false,className:'selline',fill:false,weight:4}).addTo(G.sel); });
  drawGrid(m); drawLabels(m); }
function onTract(m,t){
  if(m._id==='k'){ const u=t.unit; if(!u||u===OUT) return; setUnit(u); setTab('un'); return; }
  if(!TSTAT[t.id]){ if(PL.tract) unselectTract(); return; }
  if(PL.tract===t.id){ unselectTract(); return; }
  if(!state.unit&&t.unit&&t.unit!==OUT){ state.unit=t.unit; PL.fitKey=null; }
  PL.tract=t.id; render(); }
// labels: unit names when zoomed out, plat tract numbers (and section numbers) when zoomed in
function drawLabels(m){ const G=m._L.labels; G.clearLayers(); if(!m._loaded) return;
  const vb=m.getBounds(), zoomed=m._id==='p'&&(vb.getEast()-vb.getWest())<(FULLB.getEast()-FULLB.getWest())*.45;
  const lab=(ll,txt,cls)=>L.marker(ll,{interactive:false,keyboard:false,icon:L.divIcon({className:'mlab '+cls,html:`<span>${esc(txt)}</span>`,iconSize:null})}).addTo(G);
  if(zoomed){ GEO.t.forEach(t=>{ if(!t.ut||(state.unit&&t.unit!==state.unit)||!vb.contains(t.l)) return; lab(t.l,t.ut,'tn'); }); }
  else GEO.u.forEach(u=>{ if(u.ctx&&GEO.u.some(v=>!v.ctx&&ushort(v.u).toUpperCase()===u.u.toUpperCase())) return; lab(u.l,u.ctx?title(u.u):ushort(u.u),'ul'+(u.ctx?' ctx':'')+(m._id==='k'?' k':'')); });
  if(m._id==='p'&&STR&&PL.grid&&m.getZoom()>=12.5) STR.p.forEach(p=>{ if(vb.contains([p[0],p[1]])) lab([p[0],p[1]],p[2],'sec'); });
  if(m._id==='p'&&ABS&&PL.grid&&m.getZoom()>=13) ABS.forEach(a=>{ if(a.l&&vb.contains(a.p)) L.marker(a.p,{interactive:false,keyboard:false,icon:L.divIcon({className:'mlab abs',html:`<span>${esc(a.l)}${a.n?`<small>${esc(a.n)}</small>`:''}</span>`,iconSize:null})}).addTo(G); }); }

// legend items are buttons: click one to hide / show those tracts on both maps (Section grid toggles the grid)
const legBtn=k=>`<button type="button" class="lgb" data-st="${k}" aria-pressed="${!PL.hide.has(k)}" title="Click to ${PL.hide.has(k)?'show':'hide'} ${PST[k].label.toLowerCase()} tracts"><i class="lg ${k==='P'?'part':k==='X'?'ctx':''}" style="${k==='P'||k==='X'?'':'background:'+PST[k].fill}"></i>${PST[k].label}</button>`;
const hasCtx=()=>GEO.t.some(t=>t.st==='X');
function legendHtml(){ const ov=OVL(), grid=ov&&(STR||ABS)?`<button type="button" class="lgb" data-grid="1" aria-pressed="${PL.grid}" title="Click to ${PL.grid?'hide':'show'} the ${ov.toLowerCase()}"><i class="lg ${STR?'strk':'absk'}"></i>${ov}</button>`:'';
  if(PL.shade==='pct') return `<span><i class="lg" style="background:var(--s-work)"></i>0%</span><span class="grad"></span><span><i class="lg" style="background:var(--s-acq)"></i>100% leased</span>${legBtn('Z')}${hasCtx()?legBtn('X'):''}${grid}`;
  return ['L','P','U','Z','X'].filter(k=>k!=='X'||hasCtx()).map(legBtn).join('')+grid; }
function keyLegendHtml(){ return ['L','P','U','X'].filter(k=>k!=='X'||hasCtx()).map(legBtn).join(''); }
function onLegend(e){ const b=e.target.closest('.lgb'); if(!b) return;
  if(b.dataset.grid){ $('#z-grid')&&$('#z-grid').click(); return; }
  const k=b.dataset.st; PL.hide.has(k)?PL.hide.delete(k):PL.hide.add(k);
  if(KM) drawMap(KM); if(MP&&MP._loaded) drawMap(MP); $('#key-leg').innerHTML=keyLegendHtml(); $('#pl-leg').innerHTML=legendHtml(); }
$('#key-leg').addEventListener('click',onLegend); $('#pl-leg').addEventListener('click',onLegend);

// ---------- section-township-range grid (SONRIS) ----------
// Snapshot of SONRIS DNRSvc/COMMON section + township lines (1:24,000) and section points, pulled 10/15/2026.
// SONRIS does not allow cross-site requests, so the grid ships with the page.
// ---------- Texas abstracts (RRC Original Texas Land Survey, loaded live) ----------
// The RRC map service allows cross-site requests, so abstract boundaries come straight from RRC each time.
let ABS=null;
const OVL=()=>STR?'Section grid':ABS_SRC?'Abstracts':null;   // which reference overlay this project has
function ringCentroid(r){ let a=0,x=0,y=0; for(let i=0,j=r.length-1;i<r.length;j=i++){ const f=r[j][1]*r[i][0]-r[i][1]*r[j][0]; a+=f; x+=(r[j][1]+r[i][1])*f; y+=(r[j][0]+r[i][0])*f; }
  return a?[y/(3*a),x/(3*a)]:r[0]; }
async function loadAbs(){ if(!ABS_SRC||ABS) return;
  const b=FULLB.pad(.08), env=encodeURIComponent(JSON.stringify({xmin:b.getWest(),ymin:b.getSouth(),xmax:b.getEast(),ymax:b.getNorth(),spatialReference:{wkid:4269}}));
  try{ const j=await fetch(`${ABS_SRC}/query?f=json&where=1%3D1&geometry=${env}&geometryType=esriGeometryEnvelope&inSR=4269&outSR=4269&spatialRel=esriSpatialRelIntersects&outFields=ABSTRACT_LABEL,LEVEL1_SURVEY_NAME,LEVEL2_BLOCK_NUMBER,LEVEL3_SURVEY_NUMBER&returnGeometry=true&maxAllowableOffset=0.00003&geometryPrecision=6&resultRecordCount=2000`,{signal:AbortSignal.timeout(15000)}).then(r=>r.json());
    if(!j.features) return;
    ABS=j.features.map(f=>{ const rings=f.geometry.rings.map(r=>r.map(([x,y])=>[y,x])), big=rings.reduce((a,r)=>r.length>a.length?r:a,rings[0]), a=f.attributes;
      const nm=[a.LEVEL1_SURVEY_NAME,a.LEVEL2_BLOCK_NUMBER&&a.LEVEL2_BLOCK_NUMBER.trim()?'Blk '+a.LEVEL2_BLOCK_NUMBER.trim():'',a.LEVEL3_SURVEY_NUMBER&&a.LEVEL3_SURVEY_NUMBER.trim()?'Sec '+a.LEVEL3_SURVEY_NUMBER.trim():''].filter(s=>s&&s.trim()).join(' · ');
      return {c:rings,l:(a.ABSTRACT_LABEL||'').trim(),n:title((nm||'').trim()),p:ringCentroid(big)}; });
    if(MP&&MP._loaded){ drawGrid(MP); drawLabels(MP); } renderGridNote(); $('#pl-leg').innerHTML=legendHtml(); }catch(e){ console.warn('RRC abstracts unavailable',e); }
}
function drawGrid(m){ const G=m._L.grid; G.clearLayers(); if(!PL.grid||m._id!=='p') return;
  if(ABS) ABS.forEach(a=>L.polygon(a.c,{renderer:m._G,interactive:false,fill:false,className:'absl',weight:1.6}).addTo(G));
  if(!STR) return;
  STR.s.forEach(l=>L.polyline(l,{renderer:m._G,interactive:false,className:'strl',weight:1}).addTo(G));
  STR.t.forEach(l=>L.polyline(l,{renderer:m._G,interactive:false,className:'strt',weight:2.4}).addTo(G)); }
function renderGridNote(){ const b=$('#z-grid'); if(!b) return; b.parentElement.hidden=!OVL(); if(!OVL()) return;
  b.textContent=STR?'STR grid':'Abstracts'; b.setAttribute('aria-pressed',PL.grid);
  b.title=STR?'Section-township-range grid from SONRIS (pulled 10/15/2026)':ABS?'Abstract (survey) boundaries, live from the Texas Railroad Commission':'Abstracts: loading from the Texas Railroad Commission…'; }

// ---------- overview key map ----------
let KM=null;
function renderKey(){ const el=$('#keymap'); if(!el) return;
  if(!KM){ KM=makeMap(el,'k',{dragging:false,scrollWheelZoom:false,doubleClickZoom:false,boxZoom:false,keyboard:false,touchZoom:false});
    KM.setView(FULLB.getCenter(),10,{animate:false}); if(KM.getSize().x) KM.fitBounds(FULLB,{padding:[14,14],animate:false}); KM._loaded=true; }
  setBase(KM); drawMap(KM);
  $('#key-leg').innerHTML=keyLegendHtml();
  $('#key-foot').textContent=GEO.t.some(t=>t.st==='X')?'Dashed outlines are parcels in the parcel file that are not in this export.':'Basemap: Esri aerial imagery or streets (switch on the map tab).'; }

// ---------- plat map ----------
let MP=null;
function fitPlat(){ if(!MP) return; if(!MP.getSize().x){ PL.fitKey=null; return; } const b=state.unit&&state.unit!==OUT?unitBox(state.unit):null; MP.fitBounds(b?bnd(b):FULLB,{padding:[24,24]}); PL.fitKey=state.unit; }
// center on a tract with a margin around all of its parcel pieces
function zoomTract(id){ const b=tractBox(id); if(!b||!MP||!MP.getSize().x) return; const B=bnd(b), s=Math.max(B.getNorth()-B.getSouth(),B.getEast()-B.getWest(),.004);
  const c=B.getCenter(); MP.fitBounds(L.latLngBounds([c.lat-s*1.1,c.lng-s*1.1],[c.lat+s*1.1,c.lng+s*1.1]),{maxZoom:17}); }
function initPlat(){ if(MP) return;
  MP=makeMap($('#plat'),'p',{});
  MP.setView(FULLB.getCenter(),10,{animate:false}); if(MP.getSize().x) MP.fitBounds(FULLB,{padding:[24,24],animate:false}); MP._loaded=true;
  MP.on('click',()=>{ if(PL.tract) unselectTract(); });
  MP.on('zoomend moveend',()=>drawLabels(MP));
  $('#z-in').onclick=()=>MP.zoomIn(); $('#z-out').onclick=()=>MP.zoomOut(); $('#z-fit').onclick=()=>fitPlat();
  $$('#z-base button').forEach(b=>b.onclick=()=>{ PL.base=b.dataset.b; try{localStorage.setItem('pwe-base',PL.base)}catch(e){} render(); });
  const g=$('#z-grid'); if(g) g.onclick=()=>{ PL.grid=!PL.grid; try{localStorage.setItem('pwe-grid',PL.grid?'1':'0')}catch(e){} drawGrid(MP); drawLabels(MP); renderGridNote(); $('#pl-leg').innerHTML=legendHtml(); };
  renderGridNote(); loadAbs(); }
// basemap follows the light/dark theme
new MutationObserver(()=>{ [KM,MP].forEach(m=>{ if(m) setBase(m); }); }).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
