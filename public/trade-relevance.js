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

const POSITIONS=['QB','RB','WR','TE'];
export function positionDemand(position,slots=[]){return slots.filter(s=>s===position||(position==='QB'&&['SUPERFLEX','SUPER_FLEX'].includes(s))).length;}
const majority=(votes,total)=>total>0&&votes>total/2;
export function describeRosterFit({incoming,outgoing,side,dynasty,weekly,needs=[],goal='Balanced'}){
 const incomingIds=new Set(incoming.filter(p=>p.position!=='PICK').map(pid)),outgoingIds=new Set(outgoing.filter(p=>p.position!=='PICK').map(pid)),evidence=dynasty.sources.filter(s=>Number.isFinite(s.core?.[side])&&s.coreBefore?.[side]&&s.coreAfter?.[side]),weak=new Set(needs.filter(n=>n.rank>(n.of||10)/2).map(n=>n.position));
 const positions=POSITIONS.map(position=>{let starts=0,replaced=0,gains=0;for(const s of evidence){const before=s.coreBefore[side].assigned,after=s.coreAfter[side].assigned,byPos=rows=>rows.filter(x=>x.player.position===position);if(byPos(after).some(x=>incomingIds.has(pid(x.player))))starts++;if(byPos(before).some(x=>outgoingIds.has(pid(x.player)))&&byPos(after).some(x=>incomingIds.has(pid(x.player))))replaced++;const total=rows=>byPos(rows).reduce((n,x)=>n+(Number.isFinite(x.points)?x.points:0),0);if(total(after)>total(before)+1e-9)gains++;}return{position,starts:majority(starts,evidence.length),replaces:majority(replaced,evidence.length),improves:majority(gains,evidence.length),need:weak.has(position)};});
 const covered=dynasty.sources.filter(s=>s.complete),picks=incoming.filter(p=>p.position==='PICK'),capitalLed=picks.length>0&&covered.length>0&&covered.every(s=>{const total=s.totals[1-side];return total>0&&picks.reduce((n,p)=>n+(s.values[pid(p)]||0),0)>=total*.5;}),delta=weekly[side]?.delta,weeklyStarters=weekly[side]?.after?.assigned?.some(x=>incomingIds.has(pid(x.player))),coreImproves=majority(evidence.filter(s=>s.core[side]>1e-9).length,evidence.length),need=positions.find(p=>p.need&&p.improves&&p.starts),replacement=positions.find(p=>p.replaces),starter=positions.find(p=>p.starts);
 let kind='depth',label='Depth return',text='Incoming players sit outside the market-valued starting lineup.',priority=0;
 if(!evidence.length){kind='unknown';label='Fit uncertain';text='Starting-role coverage is incomplete.';}
 if(capitalLed){kind='capital';label='Draft capital';text='Picks make up at least half the incoming covered market value.';priority=goal==='Rebuild'?4:1;}
 if(starter){kind=coreImproves?'upgrade':'starter';label=coreImproves?'Starter upgrade':'Starter option';text=`Incoming ${starter.position} fits a legal starting slot, including flex opportunities.`;priority=coreImproves?3:2;}
 if(replacement){kind='replacement';label=`${replacement.position} replacement`;text=`An incoming ${replacement.position} replaces a starter being traded away.`;priority=2;}
 if(need){kind='need';label=`Strengthens ${need.position}`;text=`Improves the starting contribution from a lower-ranked ${need.position} group.`;priority=4;}
 if(weeklyStarters&&Number.isFinite(delta)&&delta>0.05&&goal==='Contend'){kind='weekly';label='Weekly lineup gain';text=`Adds ${delta.toFixed(1)} projected points to this week's legal lineup.`;priority=4;}
 if(capitalLed&&goal==='Rebuild'){kind='capital';label='Draft capital';text='Picks make up at least half the incoming covered market value.';priority=4;}
 return{kind,label,text,priority,capitalLed,positions,coreImproves,weeklyDelta:delta??null};
}
export function describeOfferFit({dynasty,weekly,assetsA,assetsB,needsA=[],needsB=[],goalA='Balanced',goalB='Balanced'}){const sides=[describeRosterFit({incoming:assetsB,outgoing:assetsA,side:0,dynasty,weekly,needs:needsA,goal:goalA}),describeRosterFit({incoming:assetsA,outgoing:assetsB,side:1,dynasty,weekly,needs:needsB,goal:goalB})];return{sides,priority:sides.reduce((n,s)=>n+s.priority,0),mutual:Math.min(...sides.map(s=>s.priority))};}
export function compareRosterOffers(a,b){return Number(b.quality?.tier==='strong-fit')-Number(a.quality?.tier==='strong-fit')||(b.rosterFit?.priority||0)-(a.rosterFit?.priority||0)||(b.rosterFit?.mutual||0)-(a.rosterFit?.mutual||0)||b.quality.score-a.quality.score||a.score-b.score;}
