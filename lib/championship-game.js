const finite=n=>typeof n==='number'&&Number.isFinite(n);
const round=n=>Math.round(n*100)/100;
// Historical starters and their league-scored points are the evidence; today's roster is never used.
export function buildChampionshipGame(championRow,runnerUpRow,positions=[],players={}){
 const slots=positions.filter(p=>!['BN','IR','TAXI'].includes(p));
 const lineup=row=>{
  const ids=Array.isArray(row?.starters)?row.starters:[];
  return ids.map((raw,i)=>{const id=String(raw),empty=!raw||id==='0',p=players[id],value=row.starters_points?.[i]??row.players_points?.[id];
   return {id:empty?null:id,name:empty?'Empty slot':p?.full_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||`Player #${id}`,position:empty?null:p?.position||null,slot:slots[i]||'STARTER',points:empty?0:finite(value)?value:null};});
 };
 const left=lineup(championRow),right=lineup(runnerUpRow);
 const complete=(rows,row)=>rows.length>0&&rows.length===slots.length&&rows.every(p=>p.points!=null)&&new Set(rows.filter(p=>p.id).map(p=>p.id)).size===rows.filter(p=>p.id).length&&finite(row?.points)&&Math.abs(rows.reduce((n,p)=>n+p.points,0)-row.points)<.03;
 const verified=complete(left,championRow)&&complete(right,runnerUpRow);
 const top=verified?Math.max(...left.filter(p=>p.id).map(p=>p.points)):-Infinity;
 const mvps=verified?left.filter(p=>p.id&&p.points===top):[];
 const edges=verified?left.map((p,i)=>({slot:p.slot,index:i,champion:p,runnerUp:right[i],difference:round(p.points-right[i].points)})).filter(e=>e.runnerUp&&e.slot===e.runnerUp.slot&&e.difference>0).sort((a,b)=>b.difference-a.difference):[];
 const biggestEdges=edges.filter(e=>e.difference===edges[0].difference);
 const adjustment=row=>finite(row?.custom_points)&&finite(row?.points)?round(row.custom_points-row.points):0;
 return {championLineup:left,runnerUpLineup:right,verified,mvps,biggestEdges,championAdjustment:adjustment(championRow),runnerUpAdjustment:adjustment(runnerUpRow)};
}
