import {roster,pid,availability} from './trade-engine.js';
// Default shopping should not fill a strong QB room with redundant reserves.
// Explicitly requested targets in the buy builder are unaffected.
export function relevantShopAsset({asset,own,sending=[],markets,slots,context={}}){
 if(asset.position!=='QB')return true;
 const need=Math.max(1,slots.filter(s=>s==='QB'||s==='SUPER_FLEX'||s==='SUPERFLEX').length),sent=new Set(sending.map(pid)),remaining=roster(own).filter(p=>p.position==='QB'&&!sent.has(pid(p))),ir=new Set((own.ir||[]).map(pid));
 const weeklyKnown=Object.keys(context.projections||{}).length>0,active=p=>!availability(p,context,ir)&&Number.isFinite(context.projections?.[pid(p)])&&context.projections[pid(p)]>0;
 if(remaining.length<need)return true;
 if(weeklyKnown&&remaining.filter(active).length<need&&!remaining.some(p=>!availability(p,context,ir)&&!Number.isFinite(context.projections?.[pid(p)]))&&active(asset))return true;
 const evidence=(markets.sources||[]).filter(s=>Number.isFinite(s.values?.[pid(asset)])&&remaining.filter(p=>Number.isFinite(s.values?.[pid(p)])).length>=need).map(s=>{const baseline=remaining.map(p=>s.values[pid(p)]).filter(Number.isFinite).sort((a,b)=>b-a).slice(0,need);return s.values[pid(asset)]>baseline.at(-1);});
 // Do not treat missing prices as proof that a QB is redundant.
 return evidence.length<2||evidence.filter(Boolean).length>evidence.length/2;
}
