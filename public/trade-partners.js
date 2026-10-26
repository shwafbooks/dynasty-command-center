import {pid,roster,evaluateTrade} from './trade-engine.js';
import {dynastyTrade} from './dynasty-trade.js';
import {assessOffer} from './offer-quality.js';
import {rosterNeeds} from './trade-planning.js';
import {relevantShopAsset,describeOfferFit,compareRosterOffers} from './trade-relevance.js';
// Lightweight discovery: source-matched player swaps, assessed with the same calculator as packages.
export function partnerOffers({own,other,teams,markets,context,protectedIds=new Set(),plans={}}){
 const slots=context.slots||[];if(markets.status!=='ready'||!slots.length)return [];
 const goalA=plans[String(own.rosterId)]||'Balanced',goalB=plans[String(other.rosterId)]||'Balanced',needsA=rosterNeeds(own,teams,markets,slots),needsB=rosterNeeds(other,teams,markets,slots),rough=[];
 for(const give of roster(own).filter(p=>!protectedIds.has(pid(p))))for(const get of roster(other).filter(p=>!protectedIds.has(pid(p)))){
  const evidence=(markets.sources||[]).filter(s=>Number.isFinite(s.values?.[pid(give)])&&Number.isFinite(s.values?.[pid(get)])&&s.values[pid(give)]>0&&s.values[pid(get)]>0).map(s=>Math.abs(s.values[pid(give)]-s.values[pid(get)])/((s.values[pid(give)]+s.values[pid(get)])/2));
  if(evidence.length<2||evidence.some(n=>n>.1+1e-9))continue;
  if(!relevantShopAsset({asset:get,own,sending:[give],markets,slots,context})||!relevantShopAsset({asset:give,own:other,sending:[get],markets,slots,context}))continue;
  const demand=Number(needsA.some(n=>n.position===get.position&&n.rank>n.of/2))+Number(needsB.some(n=>n.position===give.position&&n.rank>n.of/2));
  rough.push({give,get,score:evidence.reduce((n,v)=>n+v,0)/evidence.length,demand});
 }
 rough.sort((a,b)=>b.demand-a.demand||a.score-b.score||pid(a.give).localeCompare(pid(b.give))||pid(a.get).localeCompare(pid(b.get)));
 const candidates=[],used=new Map();for(const row of rough){const key=row.get.position+':'+row.give.position;if((used.get(key)||0)>=3)continue;used.set(key,(used.get(key)||0)+1);candidates.push(row);if(candidates.length===18)break;}
 return candidates.flatMap(row=>{const {give,get}=row,assetsA=[give],assetsB=[get],dynasty=dynastyTrade(own,other,[pid(give)],[pid(get)],slots,markets),weekly=evaluateTrade(own,other,[pid(give)],[pid(get)],slots,context),quality=assessOffer({dynasty,weekly,assetsA,assetsB,goalA,goalB,context});
  if(!quality.eligible)return [];const rosterFit=describeOfferFit({dynasty,weekly,assetsA,assetsB,needsA,needsB,goalA,goalB});
  if(rosterFit.sides.some(s=>s.priority<2)||give.position===get.position&&!rosterFit.sides.some(s=>s.coreImproves))return [];
  if(quality.tier==='strong-fit'&&rosterFit.mutual===0){quality.tier='negotiation';quality.label='Market-matched option';}
  return [{...row,other,dynasty,weekly,impact:weekly,quality,rosterFit}];
 });
}
export function rankPartners(rows){const used=new Set();return [...rows].sort(compareRosterOffers).filter(o=>{const key=String(o.other.rosterId);if(used.has(key))return false;used.add(key);return true;}).slice(0,3);}
