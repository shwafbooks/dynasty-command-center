import {buildOffers} from './offer-builder.js';
import {roster,pid} from './trade-engine.js';
export function upgradeTargets({own,other,position,markets,slots}){
 const count=Math.max(1,slots.filter(s=>s===position||(position==='QB'&&['SUPERFLEX','SUPER_FLEX'].includes(s))).length),sources=markets.sources||[],ownGroup=roster(own).filter(p=>p.position===position);
 return roster(other).filter(p=>p.position===position).map(p=>{const advantages=sources.filter(s=>Number.isFinite(s.values?.[pid(p)])).map(s=>{const before=ownGroup.map(x=>s.values?.[pid(x)]).filter(Number.isFinite).sort((a,b)=>b-a);return s.values[pid(p)]- (before[count-1]||0);});return {p,advantages};}).filter(x=>x.advantages.length&&x.advantages.every(v=>v>0)).sort((a,b)=>b.advantages.length-a.advantages.length||String(pid(a.p)).localeCompare(pid(b.p))).slice(0,2).map(x=>x.p);
}
export function positionUpgradeOffers({own,other,position,markets,slots,context,protectedIds=new Set(),plans={}}){
 const out=[];for(const target of upgradeTargets({own,other,position,markets,slots})){const result=buildOffers({a:own,b:other,targets:[target],markets,slots,context,protectedIds,goalA:plans[String(own.rosterId)]||'Balanced',goalB:plans[String(other.rosterId)]||'Balanced'});
 for(const offer of result.offers){const covered=offer.dynasty.sources.filter(s=>s.complete);if(!covered.length||covered.some(s=>s.core[0]==null||s.core[0]<0)||!covered.some(s=>s.core[0]>0))continue;
 const improves=covered.every(e=>{const source=markets.sources.find(s=>s.source===e.source),n=Math.max(1,slots.filter(s=>s===position||(position==='QB'&&['SUPERFLEX','SUPER_FLEX'].includes(s))).length),total=players=>players.filter(p=>p.position===position).map(p=>source?.values?.[pid(p)]).filter(Number.isFinite).sort((a,b)=>b-a).slice(0,n).reduce((s,v)=>s+v,0),before=roster(own),after=[...before.filter(p=>!offer.assets.some(x=>pid(x)===pid(p))),target];return total(after)>total(before);});
 if(improves)out.push({...offer,other,target,position,send:offer.assets,receive:[target]});}
 }return out;
}
export function rankUpgrades(rows){const used=new Set(),teams=new Map(),out=[];for(const o of [...rows].sort((a,b)=>b.quality.score-a.quality.score||b.coreGain-a.coreGain||a.score-b.score)){const id=pid(o.target);if(used.has(id)||(teams.get(o.other.rosterId)||0)>=2)continue;used.add(id);teams.set(o.other.rosterId,(teams.get(o.other.rosterId)||0)+1);out.push(o);if(out.length===6)break;}return out;}
