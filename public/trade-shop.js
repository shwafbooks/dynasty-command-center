import {relevantShopAsset} from './trade-relevance.js';
import {buildOffers} from './offer-builder.js';
import {rosterNeeds} from './trade-planning.js';
import {roster,pid} from './trade-engine.js';
const price=(p,s)=>p.position==='PICK'?s.pickValues?.[`${p.season}:${p.round}:${p.scenario||'generic'}`]:s.values?.[pid(p)];
export function shopTeam({own,other,teams,targets,markets,slots,context,protectedIds=new Set(),plans={}}){
 if(!targets.length||targets.some(p=>protectedIds.has(pid(p))))return [];
 const needs=rosterNeeds(own,teams,markets,slots),make=(sending,extra)=>buildOffers({a:other,b:own,targets:sending,markets,slots,context,protectedIds,goalA:plans[String(other.rosterId)]||'Balanced',goalB:plans[String(own.rosterId)]||'Balanced',needs,teams,candidateFilter:asset=>relevantShopAsset({asset,own,sending,markets,slots,context})}).offers.map(o=>({other,send:sending,receive:o.assets,extra,dynasty:o.dynasty,weekly:o.weekly,evidence:o.evidence,quality:o.quality,rosterFit:o.rosterFit,score:o.quality.score*2+o.recipientGain*.8+o.coreGain*.2-o.score+o.evidence.length*.02+((plans[String(own.rosterId)]||'Balanced')==='Rebuild'?o.assets.filter(p=>p.position==='PICK').length/o.assets.length*.25:0),label:extra.length?'Upgrade package':o.assets.every(p=>p.position==='PICK')?'Rebuild capital':o.assets.some(p=>p.position==='PICK')?'Reload':o.recipientGain>0&&o.assets.some(p=>needs.some(n=>n.position===p.position))?'Address roster need':'Player return'}));
 const base=make(targets,[]),source=(markets.sources||[]).find(s=>targets.every(p=>Number.isFinite(price(p,s))));let upgrade=[];
 if(source&&targets.length<3){const total=targets.reduce((n,p)=>n+price(p,source),0),chosen=new Set(targets.map(pid)),starters=new Set((own.starters||[]).map(pid));const extras=[...roster(own).filter(p=>!starters.has(pid(p))),...(markets.picks||[]).filter(p=>String(p.ownerRosterId)===String(own.rosterId)).map(p=>({...p,scenario:'generic'}))].filter(p=>!chosen.has(pid(p))&&!protectedIds.has(pid(p))&&price(p,source)>=total*.1&&price(p,source)<=total*.35).sort((a,b)=>price(b,source)-price(a,source));if(extras[0])upgrade=make([...targets,extras[0]],[extras[0]]).filter(o=>o.receive.length===1&&o.receive[0].position!=='PICK'&&price(o.receive[0],source)>total);}
 return [...base,...upgrade];
}
export function rankShopOffers(rows){
 const compare=(a,b)=>Number(b.quality?.tier==='strong-fit')-Number(a.quality?.tier==='strong-fit')||(b.rosterFit?.sides[1]?.priority||0)-(a.rosterFit?.sides[1]?.priority||0)||(b.rosterFit?.sides[0]?.priority||0)-(a.rosterFit?.sides[0]?.priority||0)||b.score-a.score;
 const sorted=[...rows].sort(compare),out=[],used=new Set(),counts=new Map();
 const add=o=>{if(!o||out.length>=8)return;const key=o.other.rosterId+':'+o.send.map(pid).sort().join(',')+':'+o.receive.map(pid).sort().join(',');if(used.has(key)||(counts.get(o.other.rosterId)||0)>=2)return;used.add(key);counts.set(o.other.rosterId,(counts.get(o.other.rosterId)||0)+1);out.push(o);};
 for(const o of sorted.filter(o=>o.quality?.tier==='strong-fit').slice(0,3))add(o);
 for(const kind of ['need','replacement','upgrade','capital','weekly','starter'])add(sorted.find(o=>o.rosterFit?.sides[1]?.kind===kind));
 for(const o of sorted)add(o);return out.sort(compare);
}
