function goalList(el,rows,key,fk){
  const m=new Map(); rows.forEach(r=>m.set(r[key],(m.get(r[key])||0)+(r.cac||0)));
  const gs=[...m.entries()].filter(([,v])=>v>0.0005).sort((a,b)=>b[1]-a[1]||sortU(a[0],b[0]));
  if(!gs.length){ el.innerHTML='<div class="empty">No leased acreage in this selection.</div>'; return; }
  const max=gs[0][1], tot=gs.reduce((a,x)=>a+x[1],0), cap=8;
  let shown=gs; if(gs.length>cap+1&&!state[fk]){ const rest=gs.slice(cap); shown=gs.slice(0,cap); el.dataset.rest=`${rest.length} more · ${fmt(rest.reduce((a,x)=>a+x[1],0),2)} ac`; } else el.dataset.rest='';
  el.innerHTML=shown.map(([k,v])=>{ const lab=bl(k), on=state[fk]===k;
    return `<button class="goal${on?' on':''}${state[fk]&&!on?' dim':''}" type="button" data-k="${esc(k)}" aria-pressed="${on}"><span class="t"><span title="${esc(lab)}">${esc(lab)}</span><b>${fmt(v,2)} <em>ac · ${fmt(v/tot*100,0)}%</em></b></span><span class="gbar"><i style="width:${v/max*100}%;background:var(--s-acq)"></i></span></button>`; }).join('');
  if(el.dataset.rest) el.innerHTML+=`<div class="note" style="padding:6px 9px">Plus ${el.dataset.rest} · pick one from the filter list</div>`;
  el.querySelectorAll('.goal').forEach(b=>b.onclick=()=>toggle(fk,b.dataset.k));
}
