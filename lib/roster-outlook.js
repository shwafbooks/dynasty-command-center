import {optimizeLineup} from './lineup-optimizer.js';
const POSITIONS=['QB','RB','WR','TE'];
const finite=v=>v!==null&&v!==undefined&&Number.isFinite(Number(v));
const sum=rows=>Math.round(rows.reduce((n,p)=>n+Number(p.consensusPercentile),0)*1e6)/1e6;
function rank(teams,get){const rows=teams.filter(t=>finite(get(t)?.value));for(const t of teams){const m=get(t);if(!m)continue;m.rank=finite(m.value)?1+rows.filter(x=>get(x).value>m.value).length:null;m.of=rows.length;}}
export function buildRosterOutlook({marketProfile,lineupCapacity}){
 if(marketProfile?.status!=='ready'||!marketProfile.publicationEligible)return{status:'unavailable',teams:[]};
 const teams=marketProfile.teams.map(team=>{
  const all=team.players||[],valued=all.filter(p=>finite(p.consensusPercentile)),lineup=optimizeLineup({players:valued,lineupCapacity}),core=lineup.assigned.map(x=>({...x.player,slot:x.slot})),depth=lineup.depth.sort((a,b)=>b.consensusPercentile-a.consensusPercentile);
  const positions=POSITIONS.map(position=>{const count=Math.max(1,Number(lineupCapacity.guaranteed[position]||0)+(position==='QB'?Number(lineupCapacity.slots.SUPERFLEX||0):0)),group=valued.filter(p=>p.position===position).sort((a,b)=>b.consensusPercentile-a.consensusPercentile).slice(0,count),unknown=all.some(p=>p.position===position&&!finite(p.consensusPercentile));return{position,value:unknown&&group.length<count?null:sum(group),players:group,slots:count};});
  return{rosterId:team.rosterId,coverage:{matched:valued.length,total:all.length},starting:{value:core.length===lineup.totalSlots&&lineup.totalSlots>0?sum(core):null,players:[...core].sort((a,b)=>b.consensusPercentile-a.consensusPercentile),filled:core.length,slots:lineup.totalSlots},bench:{value:depth.length||valued.length===all.length?sum(depth):null,players:depth},positions};
 });
 rank(teams,t=>t.starting);rank(teams,t=>t.bench);for(const p of POSITIONS)rank(teams,t=>t.positions.find(x=>x.position===p));
 for(const team of teams)team.needs=team.positions.filter(p=>p.rank!=null).sort((a,b)=>b.rank-a.rank||a.value-b.value).slice(0,2);
 return{status:'ready',teams,provenance:{formulaVersion:'roster-outlook-v1',starting:'Sum of consensus player percentiles in the highest-value legal lineup. Full lineup required for rank.',bench:'Sum of consensus percentiles for valued players outside that lineup. Adding a developmental player cannot lower the total.',positions:'Sum of top positional assets up to dedicated slots; QB includes superflex slots. Rank within each position.',coverage:'Only market-covered players count. Unvalued players are not assigned zero. Picks excluded. Exact ties share rank.',aiAdjusted:false}};
}
