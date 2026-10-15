/*__PLATS__*/

// ---------- data prep ----------
const GROUPS=[{k:'LEASED',label:'Leased',c:'--s-acq'},{k:'UNLEASED',label:'Unleased',c:'--s-work'}];
const BLANK='(Blank)', OUT='OUTSIDE';
const TNUM={}; GEO.t.forEach(t=>{ if(t.ut&&!TNUM[t.id]) TNUM[t.id]=t.ut; });
// strip the project tag (e.g. ' - PWEIII') the export appends to owner and lessor names
const untag=s=>s?String(s).replace(PTAG,'').trim():s;
DATA.forEach((r,i)=>{ r.owner=untag(r.owner); r.lessor=untag(r.lessor); r.i=i; r.g=r.ls; r.unitL=r.unit||OUT; r.symL=r.sym||BLANK; r.lesseeL=r.lessee||'No lessee'; r.formL=r.form||BLANK; r.absL=r.abs!=null?'A-'+r.abs:BLANK; r.tn=TNUM[r.id]||'';
  r._s=[r.id,r.owner,r.oid,r.addr,r.phone,r.lessee,r.lessor,r.lno,r.vp,r.unit,r.ls,r.sym,r.absL,r.tn?'tract '+r.tn:''].join(' ').toLowerCase(); });

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const fmt=(n,d=0)=>(+n).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
const TRG=/^T\d+[NS]-R\d+[EW]$/; // township-range group codes stay upper case
const title=s=>s&&TRG.test(String(s))?String(s):s?String(s).toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()).replace(/\bLlc\b/g,'LLC').replace(/\bGu\b/g,'GU').replace(/\bL\.?p\b/gi,'LP').replace(/\bIi\b/g,'II').replace(/\bIii\b/g,'III').replace(/\bNla\b/g,'NLA'):'';
const bl=v=>v===BLANK||/^A-/.test(v)||TRG.test(v)?v:v===OUT?'Outside units':title(v);
const ushort=u=>u===OUT?'Outside':TRG.test(u)?u:title(u).replace(/ GU$/,'');
const oname=s=>title(String(s).replace(PTAG,''));
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const gOf=k=>GROUPS.find(g=>g.k===k)||GROUPS[1];
const sortU=(a,b)=>{ const r=v=>v===BLANK||v==='No lessee'?2:v===OUT?1:0; return r(a)-r(b)||String(a).localeCompare(String(b),undefined,{numeric:true}); };
const uniq=k=>[...new Set(DATA.map(r=>r[k]))].sort(sortU);
const UNITS=uniq('unitL');
const DOCICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M8 13h8M8 17h5"/></svg>';

const state={unit:'',ls:'',sym:'',lessee:'',form:'',abs:'',q:'',sort:'id',dir:1,sbSort:'unit',sbDir:1};
const FK={ls:['#f-ls','Landowner status','All landowner statuses','ls'],lessee:['#f-lessee','Lessee','All lessees','lesseeL'],form:['#f-form','Lease form','All lease forms','formL'],abs:['#f-abs','Abstract','All abstracts','absL']};
Object.entries(FK).forEach(([k,[sel,,all,f]])=>{ const el=$(sel); if(!el) return; el.innerHTML=`<option value="">${all}</option>`+uniq(f).map(v=>`<option value="${esc(v)}">${esc(k==='ls'?title(v):bl(v))}</option>`).join(''); el.addEventListener('change',e=>{ state[k]=e.target.value; render(); }); });
$('#f-unit').addEventListener('change',e=>{ setUnit(e.target.value); });
$('#reset').onclick=()=>{ ['unit','ls','sym','lessee','form','abs','q'].forEach(k=>state[k]=''); $('#q').value=''; PL.tract=null; PL.fitKey=null; render(); };

function filtered(o={}){ return DATA.filter(r=>{
  if(!o.noUnit&&state.unit&&r.unitL!==state.unit) return false;
  if(!o.noLs&&state.ls&&r.ls!==state.ls) return false;
  for(const k of ['lessee','form','abs']) if(state[k]&&r[FK[k][3]]!==state[k]) return false;
  if(o.q&&state.q){ const t=state.q.toLowerCase().split(/\s+/).filter(Boolean); if(!t.every(w=>r._s.includes(w))) return false; }
  return true; }); }
const scope=rows=>state.unit?rows:rows.filter(r=>r.unitL!==OUT);
const net=rows=>rows.reduce((a,r)=>a+(r.cac||0),0);
const tracts=rows=>new Set(rows.map(r=>r.id)).size;
const owners=rows=>new Set(rows.map(r=>r.oid??r.owner)).size;
const pctOf=rows=>{ const t=net(rows), l=net(rows.filter(r=>r.g==='LEASED')); return {t,l,u:t-l,p:t?l/t:0}; };
// unit acres: plat tract acres, each tract once, outside tracts and off-plat tracts excluded
const unitAc=rows=>{ const m=new Map(); rows.forEach(r=>{ if(r.unitL!==OUT&&!OFFPLAT.has(r.id)) m.set(r.id,r.tac||0); }); let a=0; m.forEach(v=>a+=v); return a; };
const pctTxt=p=>p.t?fmt(p.p*100,1)+'%':'–';

// tract status from all owners on the tract (ignores filters)
const TSTAT={};
(()=>{ const by={}; DATA.forEach(r=>{ const o=by[r.id]||(by[r.id]={t:0,l:0,tac:r.tac,unit:r.unitL,n:0}); o.n++; o.t+=r.cac||0; if(r.g==='LEASED') o.l+=r.cac||0; });
  Object.entries(by).forEach(([id,o])=>{ o.p=o.t?o.l/o.t:0; o.s=o.t<=1e-9?'Z':o.p>=0.9999?'L':o.l<=1e-9?'U':'P'; TSTAT[id]=o; }); })();
const PST={L:{label:'Leased',fill:'var(--s-acq)'},P:{label:'Partially leased',fill:'url(#PAT)'},U:{label:'Unleased',fill:'var(--s-work)'},Z:{label:'No net interest',fill:'var(--p-none)'},X:{label:'Not in this export',fill:'var(--p-ctx)'}};
const swatch=k=>`<i class="sw ${k==='P'?'part':''}" style="${k==='P'?'':'background:'+PST[k].fill}"></i>`;

// tooltip
const tip=$('#tip');
function moveTip(e){ const w=tip.offsetWidth,h=tip.offsetHeight; let x=e.clientX+14,y=e.clientY+14; if(x+w>innerWidth-8)x=e.clientX-w-14; if(y+h>innerHeight-8)y=e.clientY-h-14; tip.style.left=x+'px'; tip.style.top=y+'px'; }
const hideTip=()=>tip.hidden=true;
document.addEventListener('mousemove',e=>{ if(!tip.hidden) moveTip(e); });
document.addEventListener('mouseover',e=>{ const n=e.target.closest('[data-tip]'); if(n){ tip.innerHTML=n.dataset.tip; tip.hidden=false; moveTip(e); } else if(!tip.hidden) hideTip(); });

