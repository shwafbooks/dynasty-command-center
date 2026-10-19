import {pid} from './trade-engine.js';
const positive=n=>Number.isFinite(n)&&n>0.05;
// Keep strong roster fits separate from market-matched negotiation options.
export function assessOffer({dynasty,weekly,assetsA,assetsB,goalA='Balanced',goalB='Balanced',context={}}){
 const sources=dynasty.sources.filter(s=>s.complete),hasPicks=[...assetsA,...assetsB].some(p=>p.position==='PICK');
 const reject=reason=>({eligible:false,reason});
 if(sources.length<(hasPicks?1:2))return reject('insufficient-corroboration');
 if(sources.some(s=>s.relative>.1+1e-9))return reject('market-gap');
 const sides=[assetsA,assetsB].map((outgoing,i)=>{
  const incoming=i?assetsA:assetsB,goal=i?goalB:goalA,cores=sources.map(s=>s.core[i]),known=cores.every(Number.isFinite),preserved=known&&cores.every(n=>n>=-1e-9),improved=preserved&&cores.some(n=>n>1e-9),delta=weekly[i]?.delta;
  const after=weekly[i]?.after,before=weekly[i]?.before,over=context.rosterLimit&&weekly[i]?.rosterCount-(weekly[i]?.team?.ir?.length||0)>context.rosterLimit;
  if(after?.open>before?.open)return{eligible:false,reason:'lineup-hole'};
  const drops=over?Math.max(0,weekly[i].rosterCount-(weekly[i].team.ir?.length||0)-context.rosterLimit):0;
  const picks=incoming.filter(p=>p.position==='PICK'),capital=known&&picks.length>0&&sources.every(s=>picks.every(p=>Number.isFinite(s.values[pid(p)]))&&picks.reduce((n,p)=>n+s.values[pid(p)],0)>=Math.max(.01,-s.core[i],incoming.reduce((n,p)=>n+s.values[pid(p)],0)*.5));
  const weeklyGain=positive(delta),strongest=sources.every(s=>Math.max(0,...incoming.map(p=>s.values[pid(p)]))>Math.max(0,...outgoing.map(p=>s.values[pid(p)])));
  if(goal==='Contend'){const required=Math.max(2,Number(weekly[i]?.before?.total||0)*.02);return{eligible:Number.isFinite(delta)&&delta>=required,reason:'contend',text:`Adds ${Number(delta||0).toFixed(1)} projected points this week`,weekly:delta,drops};}
  if(goal==='Rebuild'&&capital)return{eligible:true,reason:'capital',text:'Receives a pick-led return covering the dynasty starting-core cost',weekly:delta,drops};
  if(goal==='Rebuild'&&strongest&&preserved)return{eligible:true,reason:'consolidation',text:'Consolidates into the higher-valued asset',weekly:delta,drops};
  const strong=improved||(preserved&&weeklyGain),impact=!known?'Dynasty starting-core impact is incomplete':preserved?'Dynasty starting core is preserved':cores.every(n=>n<=0)?'Dynasty starting core decreases':'Markets disagree on the starting-core impact';
  return{eligible:goal==='Balanced'||strong,tradeoff:!strong||drops>0,reason:strong?(improved?'core':'weekly'):'market-match',text:strong?(improved?'Improves the dynasty starting core':'Improves the weekly lineup while preserving dynasty core'):(picks.length?'Receives future draft capital. ':incoming.some(p=>!outgoing.some(x=>x.position===p.position))?'Changes the position mix. ':'Receives a market-matched return. ')+impact,weekly:delta,drops};
 });
 if(sides.some(s=>!s.eligible))return{eligible:false,reason:sides.find(s=>!s.eligible).reason,sides};
 const tradeoff=sides.some(s=>s.tradeoff||s.drops>0),label=tradeoff?'Market-matched option':sides.every(s=>positive(s.weekly))?'Helps both lineups':sides.some(s=>s.reason==='capital')?'Players for draft capital':sides.every(s=>s.reason==='core')?'Helps both dynasty cores':'Strategy fit';
 return{eligible:true,tier:tradeoff?'negotiation':'strong-fit',label,sides,sourceCount:sources.length,coverage:hasPicks&&sources.length===1?'Single-source pick estimate':`${sources.length} markets agree on value`,score:(tradeoff?0:4)+sides.filter(s=>s.reason==='core').length+Number(sources.length>=2)};
}
