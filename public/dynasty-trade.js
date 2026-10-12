import {roster,pid,optimize} from './trade-engine.js';
export function dynastyTrade(a,b,sendA,sendB,slots,markets){
 const pools=[roster(a),roster(b)],sets=[new Set(sendA),new Set(sendB)],sent=pools.map((p,i)=>p.filter(x=>sets[i].has(pid(x)))),after=pools.map((p,i)=>[...p.filter(x=>!sets[i].has(pid(x))),...sent[1-i]]),sources=[];
 for(const source of markets.sources||[]){const values=source.values||{},sum=players=>players.every(p=>Number.isFinite(values[pid(p)]))?players.reduce((n,p)=>n+values[pid(p)],0):null;
 const totals=sent.map(sum),complete=totals.every(x=>x!=null),gap=complete?totals[1]-totals[0]:null,relative=complete?(totals[0]+totals[1]?Math.abs(gap)/((totals[0]+totals[1])/2):0):null;
 const core=players=>optimize(players.map(p=>({...p,injuryStatus:null})),slots,{projections:values,games:{},injuries:{}});
 const beforeCore=pools.map(core),afterCore=after.map(core),deltaCore=beforeCore.map((x,i)=>x.total!=null&&afterCore[i].total!=null?afterCore[i].total-x.total:null);
 sources.push({...source,totals,gap,complete,relative,vote:!complete?'missing':relative<=.1?'balanced':gap>0?'a':'b',core:deltaCore,coreBefore:beforeCore,coreAfter:afterCore,missing:sent.flat().filter(p=>!Number.isFinite(values[pid(p)])).map(p=>p.name)});
 }
 const usable=sources.filter(s=>s.complete),aVotes=usable.filter(s=>s.vote==='a').length,bVotes=usable.filter(s=>s.vote==='b').length;
 const sides=[a,b].map((t,i)=>{const favor=i===0?aVotes:bVotes,against=i===0?bVotes:aVotes,coreUp=sources.filter(s=>s.core[i]>0).length,coreDown=sources.filter(s=>s.core[i]<0).length;return {team:t,market:favor>against?'Value gained':against>favor?'Value given up':usable.length?'Markets close or split':'Market coverage incomplete',core:coreUp>coreDown?'Stronger dynasty core':coreDown>coreUp?'Dynasty core weakened':sources.some(s=>s.core[i]!=null)?'Core largely preserved':'Core coverage incomplete',incoming:sent[1-i],outgoing:sent[i]};});
 const best=sources.filter(s=>s.complete).map(s=>{const top=sent.flat().sort((x,y)=>(s.values[pid(y)]||0)-(s.values[pid(x)]||0))[0];return {source:s.source,name:top?.name,receives:sets[0].has(pid(top||{}))?b.manager:a.manager};});
 return {sources,sides,bestAsset:best,usable:usable.length,disagreement:aVotes>0&&bVotes>0,consolidation:sent[0].length!==sent[1].length&&sent.every(x=>x.length>0)};
}
export function marketVerdict(d){const a=d.sources.filter(s=>s.vote==='a').length,b=d.sources.filter(s=>s.vote==='b').length,balanced=d.sources.filter(s=>s.vote==='balanced').length,total=a+b+balanced;return {favored:a>b?'a':b>a?'b':null,support:Math.max(a,b),total,split:a>0&&b>0,balanced:total>0&&!a&&!b};}
