export const pid=p=>String(p.id??p.playerId??'');
export const roster=t=>[...new Map([...(t?.starters||[]),...(t?.bench||[]),...(t?.ir||[])].map(p=>[pid(p),p])).values()];
export const eligible=(p,s)=>s==='SUPER_FLEX'||s==='SUPERFLEX'?['QB','RB','WR','TE'].includes(p):s==='FLEX'?['RB','WR','TE'].includes(p):s==='REC_FLEX'?['WR','TE'].includes(p):s==='WRRB_FLEX'?['WR','RB'].includes(p):p===s;
export function availability(p,context,ir=new Set()){
 if(ir.has(pid(p)))return 'IR';const injury=context.injuries?.[pid(p)]||p.injuryStatus;
 if(['Out','IR','PUP','Suspended','Doubtful'].includes(injury))return injury;
 if(context.games?.[p.nflTeam]?.state==='bye')return 'Bye';return null;
}
export function optimize(players,slots,context,ir=new Set()){
 const pool=players.filter(p=>!availability(p,context,ir)).sort((a,b)=>pid(a).localeCompare(pid(b))),projections=context.projections||{};
 let states=new Map([[0,{count:0,known:0,points:0,assign:[]}]]);
 const better=(a,b)=>!b||a.count>b.count||a.count===b.count&&(a.known>b.known||a.known===b.known&&a.points>b.points);
 for(const player of pool){const next=new Map(states);for(const [mask,state] of states)for(let i=0;i<slots.length;i++){if(mask&(1<<i)||!eligible(player.position,slots[i]))continue;const known=Number.isFinite(projections[pid(player)]),key=mask|(1<<i),candidate={count:state.count+1,known:state.known+Number(known),points:state.points+(known?projections[pid(player)]:0),assign:[...state.assign,{index:i,slot:slots[i],player,points:known?projections[pid(player)]:null}]};if(better(candidate,next.get(key)))next.set(key,candidate);}states=next;}
 let best;for(const s of states.values())if(better(s,best))best=s;
 const assigned=best.assign.sort((a,b)=>a.index-b.index),complete=best.count===slots.length&&best.known===slots.length;
 return {assigned,total:complete?Math.round(best.points*100)/100:null,open:slots.length-best.count,missing:best.count-best.known,excluded:players.filter(p=>availability(p,context,ir)).map(p=>({player:p,reason:availability(p,context,ir)}))};
}
export function evaluateTrade(a,b,sendA,sendB,slots,context){
 const idsA=new Set(sendA),idsB=new Set(sendB),poolA=roster(a),poolB=roster(b);
 if([...idsA].some(id=>!poolA.some(p=>pid(p)===id))||[...idsB].some(id=>!poolB.some(p=>pid(p)===id)))throw Error('A selected player is no longer on this roster.');
 if([...idsA].some(id=>idsB.has(id)))throw Error('A player cannot be sent by both teams.');
 const side=(t,pool,send,other,inbound)=>{const incoming=other.filter(p=>inbound.has(pid(p))),sent=pool.filter(p=>send.has(pid(p))),remaining=pool.filter(p=>!send.has(pid(p))),afterPool=[...remaining,...incoming];const ir=new Set((t.ir||[]).map(pid));incoming.forEach(p=>{if((t===a?b:a).ir?.some(x=>pid(x)===pid(p)))ir.add(pid(p));});const before=optimize(pool,slots,context,new Set((t.ir||[]).map(pid))),after=optimize(afterPool,slots,context,ir);return {team:t,sent,incoming,before,after,delta:before.total!=null&&after.total!=null?Math.round((after.total-before.total)*100)/100:null,rosterCount:afterPool.length,depth:['QB','RB','WR','TE'].map(position=>({position,before:pool.filter(p=>p.position===position).length,after:afterPool.filter(p=>p.position===position).length})),bench:afterPool.filter(p=>!after.assigned.some(x=>pid(x.player)===pid(p)))};};
 return [side(a,poolA,idsA,poolB,idsB),side(b,poolB,idsB,poolA,idsA)];
}
export function partners(team,teams,slots,context){
 if(!Object.keys(context.projections||{}).length)return [];
 const base=optimize(roster(team),slots,context,new Set((team.ir||[]).map(pid)));
 const surplus=t=>{const opt=optimize(roster(t),slots,context,new Set((t.ir||[]).map(pid)));return roster(t).filter(p=>!availability(p,context,new Set((t.ir||[]).map(pid)))&&!opt.assigned.some(x=>pid(x.player)===pid(p))&&Number.isFinite(context.projections[pid(p)])).sort((a,b)=>context.projections[pid(b)]-context.projections[pid(a)]).filter((p,i,arr)=>arr.findIndex(x=>x.position===p.position)===i).slice(0,4);};
 const outs=surplus(team),result=[];
 for(const other of teams.filter(t=>t.rosterId!==team.rosterId)){const otherBase=optimize(roster(other),slots,context,new Set((other.ir||[]).map(pid)));let best;
 for(const give of outs)for(const get of surplus(other)){if(give.position===get.position)continue;const weakest=(line,p)=>Math.min(...line.assigned.filter(x=>x.player.position===p).map(x=>x.points??Infinity),Infinity);const gainA=context.projections[pid(get)]-weakest(base,get.position),gainB=context.projections[pid(give)]-weakest(otherBase,give.position);if(gainA>0&&gainB>0&&(!best||gainA+gainB>best.score))best={give,get,score:gainA+gainB};}
 if(best){const impact=evaluateTrade(team,other,[pid(best.give)],[pid(best.get)],slots,context);if(impact.every(x=>x.delta!=null&&x.delta>.05))result.push({other,give:best.give,get:best.get,impact,score:impact.reduce((n,x)=>n+x.delta,0)});}
 }
 return result.sort((a,b)=>b.score-a.score).slice(0,3);
}
