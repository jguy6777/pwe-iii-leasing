const SBCOLS=[{k:'unit',l:'Unit'},{k:'pa',l:'Plat acres',r:1,hm:1},{k:'t',l:'Net acres',r:1,hm:1},{k:'l',l:'Leased',r:1},{k:'u',l:'Unleased',r:1},{k:'p',l:'% leased',r:1},{k:'doc',l:'Survey plat',r:1,ns:1}];
// projects without survey plats (e.g. PWE IV) drop the plat column
const HASPLATS=Object.keys(PLATDOCS).length>0; if(!HASPLATS) SBCOLS.splice(SBCOLS.findIndex(c=>c.k==='doc'),1);
function renderBoard(){
  const base=filtered({noUnit:true});
  let rows=UNITS.map(u=>{ const rr=base.filter(r=>r.unitL===u), p=pctOf(rr);
    return {u,rr,pa:u===OUT?null:unitAc(rr),t:p.t,l:p.l,u2:p.u,p:p.p,tr:tracts(rr)}; }).filter(x=>x.rr.length);
  const k=state.sbSort, d=state.sbDir, val=x=>k==='unit'?x.u:k==='u'?x.u2:k==='doc'?0:x[k];
  rows.sort((a,b)=>{ if(a.u===OUT) return 1; if(b.u===OUT) return -1; const A=val(a),B=val(b); if(A==null) return 1; if(B==null) return -1; return (typeof A==='string'?A.localeCompare(B):A-B)*d; });
  const anyF=['ls','sym','lessee','form','abs'].some(q=>state[q]);
  let h='<thead><tr>'+SBCOLS.map(c=>`<th class="${c.r?'r':''}${c.hm?' hm':''}${state.sbSort===c.k?' sorted':''}" ${c.ns?'':`data-k="${c.k}"`} scope="col">${c.l}${c.ns?'':`<span class="ar">${state.sbSort===c.k?(state.sbDir>0?'▲':'▼'):'↕'}</span>`}</th>`).join('')+'</tr></thead><tbody>';
  rows.forEach(x=>{ const doc=PLATDOCS[x.u], note=doc?doc.short:PLATNOTE[x.u]||(x.u===OUT?'Not in a unit':'');
    h+=`<tr class="${state.unit===x.u?'sel':''}" data-u="${esc(x.u)}" tabindex="0"><td class="u"><b>${esc(x.u===OUT?'Outside units':title(x.u))}</b><small>${note?esc(note)+' · ':''}${fmt(x.tr)} tracts</small></td>
      <td class="r hm">${x.pa==null?'<span class="muted">–</span>':fmt(x.pa,3)}</td><td class="r hm">${fmt(x.t,3)}</td><td class="r">${fmt(x.l,3)}</td><td class="r">${x.u2>0.0005?fmt(x.u2,3):'<span class="muted">0.000</span>'}</td>
      <td class="r"><div class="pct"><span class="tr"><i style="width:${x.p*100}%"></i></span><b>${x.t?fmt(x.p*100,1)+'%':'–'}</b></div></td>
      ${HASPLATS?'<td class="r">':''}${doc?`<button class="pdoc" type="button" data-doc="${esc(x.u)}" aria-label="Open ${esc(title(x.u))} survey plat" data-tip="Open survey plat · ${esc(doc.short)}">${DOCICON}<span>View</span></button>`:''}${HASPLATS?'</td>':''}</tr>`; });
  const inU=base.filter(r=>r.unitL!==OUT), P=pctOf(inU);
  h+=`</tbody><tfoot><tr><td>Units total</td><td class="r hm">${fmt(unitAc(inU),3)}</td><td class="r hm">${fmt(P.t,3)}</td><td class="r">${fmt(P.l,3)}</td><td class="r">${fmt(P.u,3)}</td><td class="r"><div class="pct"><span class="tr"><i style="width:${P.p*100}%"></i></span><b>${pctTxt(P)}</b></div></td>${HASPLATS?'<td></td>':''}</tr></tfoot>`;
  $('#sb').innerHTML=h;
  $$('#sb th[data-k]').forEach(th=>th.onclick=()=>{ const k=th.dataset.k; if(state.sbSort===k) state.sbDir*=-1; else { state.sbSort=k; state.sbDir=k==='unit'?1:-1; } renderBoard(); });
  $$('#sb tbody tr').forEach(tr=>{ const go=()=>{ setUnit(tr.dataset.u); setTab('un'); }; tr.onclick=e=>{ if(e.target.closest('[data-doc]')) return; go(); }; tr.onkeydown=e=>{ if(e.key==='Enter') go(); }; });
  wireDocs($('#sb'));
}

