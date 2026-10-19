import {pid} from './trade-engine.js';
const positive=n=>Number.isFinite(n)&&n>0.05;
// Recommendations require a supported reason for both teams; these are not acceptance odds.
export function assessOffer({dynasty,weekly,assetsA,assetsB,goalA='Balanced',goalB='Balanced',context={}}){
 const sources=dynasty.sources.filter(s=>s.complete),hasPicks=[...assetsA,...assetsB].some(p=>p.position==='PICK');
 const reject=reason=>({eligible:false,reason});
 if(sources.length<(hasPicks?1:2))return reject('insufficient-corroboration');
 if(sources.some(s=>s.relative>.1+1e-9))return reject('market-gap');
 const sides=[assetsA,assetsB].map((outgoing,i)=>{
  const incoming=i?assetsA:assetsB,goal=i?goalB:goalA,cores=sources.map(s=>s.core[i]),known=cores.every(Number.isFinite),preserved=known&&cores.every(n=>n>=-.01),improved=preserved&&cores.some(positive),delta=weekly[i]?.delta;
  const after=weekly[i]?.after,before=weekly[i]?.before,over=context.rosterLimit&&weekly[i]?.rosterCount-(weekly[i]?.team?.ir?.length||0)>context.rosterLimit;
  if(over||after?.open>before?.open)return{eligible:false,reason:over?'roster-capacity':'lineup-hole'};
  const picks=incoming.filter(p=>p.position==='PICK'),capital=known&&picks.length>0&&sources.every(s=>picks.every(p=>Number.isFinite(s.values[pid(p)]))&&picks.reduce((n,p)=>n+s.values[pid(p)],0)>=Math.max(.01,-s.core[i]));
  const weeklyGain=positive(delta),strongest=sources.every(s=>Math.max(0,...incoming.map(p=>s.values[pid(p)]))>Math.max(0,...outgoing.map(p=>s.values[pid(p)])));
  if(goal==='Contend')return{eligible:weeklyGain,reason:'contend',text:'Improves the projected starting lineup',weekly:delta};
  if(goal==='Rebuild'&&capital)return{eligible:true,reason:'capital',text:'Adds valued draft capital to offset the starting-core cost',weekly:delta};
  if(goal==='Rebuild'&&strongest&&preserved)return{eligible:true,reason:'consolidation',text:'Consolidates into the higher-valued asset',weekly:delta};
  return{eligible:improved||(preserved&&weeklyGain),reason:improved?'core':weeklyGain?'weekly':'no-roster-benefit',text:improved?'Improves the dynasty starting core':weeklyGain?'Improves the weekly lineup while preserving dynasty core':'No supported roster benefit',weekly:delta};
 });
 if(sides.some(s=>!s.eligible))return{eligible:false,reason:sides.find(s=>!s.eligible).reason,sides};
 const label=sides.every(s=>positive(s.weekly))?'Helps both lineups':sides.some(s=>s.reason==='capital')?'Players for draft capital':sides.every(s=>s.reason==='core')?'Helps both dynasty cores':'Strategy fit';
 return{eligible:true,label,sides,sourceCount:sources.length,coverage:hasPicks&&sources.length===1?'Single-source pick estimate':`${sources.length} markets agree on value`,score:sides.filter(s=>s.reason==='core').length+Number(sources.length>=2)};
}
