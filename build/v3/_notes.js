function renderNotes(){
  const n=[], dups=DATA.filter(r=>r.dup).length;
  if(dups) n.push(`Net acres count each owner's interest once per tract. The export repeats ${fmt(dups)} interests under a second lease; those repeats are listed in Records but not added again.`);
  PNOTES.forEach(x=>n.push(x));
  const short=Object.entries(TSTAT).filter(([id,o])=>o.unit!==OUT&&!OFFPLAT.has(id)&&o.tac&&o.tac-o.t>0.01);
  if(short.length) n.push('Tracts whose owner interests add up to less than the tract acreage: '+short.map(([id,o])=>`${ushort(o.unit)} ${TNUM[id]?'tract '+TNUM[id]+' ':''}(${id}) ${fmt(o.t,3)} of ${fmt(o.tac,3)} ac`).join('; ')+'.');
  if(MISSING.length) n.push(`${fmt(MISSING.length)} export tracts have no parcel shape on the map. They still count in every total.`);
  $('#notes').innerHTML=n.map(x=>`<li>${esc(x)}</li>`).join('');
}

