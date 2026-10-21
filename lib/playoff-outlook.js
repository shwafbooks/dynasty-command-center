// Record bounds are deliberately conservative: future points cannot settle a record tie.
const credit=t=>Number(t.wins)+Number(t.ties)/2;
export function seedTeams(teams,divisions){
 const sorted=[...teams].sort((a,b)=>credit(b)-credit(a)||b.pointsFor-a.pointsFor||b.pointsAgainst-a.pointsAgainst||(a.tieOrder??a.rosterId)-(b.tieOrder??b.rosterId));
 const leaders=divisions?[...new Set(sorted.map(t=>t.division).filter(d=>d!=null))].map(d=>sorted.find(t=>t.division===d)):[];
 return [...leaders,...sorted.filter(t=>!leaders.includes(t))];
}
export function recordOutlook(teams,target,slots,divisions){
 const others=teams.filter(t=>t!==target),remaining=target.remaining.length;
 const peers=divisions?others.filter(t=>t.division===target.division):[];
 const otherDivisions=divisions?new Set(others.filter(t=>t.division!==target.division).map(t=>t.division)).size:0;
 const ids=new Set(teams.map(t=>t.rosterId)),scheduled=new Map();
 let complete=teams.every(t=>t.remaining.every(g=>g.opponent&&ids.has(g.opponent.rosterId)));
 if(complete)for(const t of teams)for(const g of t.remaining){
  const other=teams.find(x=>x.rosterId===g.opponent.rosterId);
  if(!other.remaining.some(x=>x.week===g.week&&x.opponent?.rosterId===t.rosterId))complete=false;
  const pair=[t.rosterId,g.opponent.rosterId].sort((a,b)=>a-b);scheduled.set(`${g.week}:${pair}`,pair);
 }
 // A group cannot all catch the target if its remaining shared games cannot
 // supply enough wins. This is a sufficient bound, not an assumed final order.
 const groupCanCatch=(group,floor,k)=>{
  const set=new Set(group.map(t=>t.rosterId));let available=0,againstTarget=0;
  for(const [a,b] of scheduled.values()){
   if(!set.has(a)&&!set.has(b))continue;
   if(a===target.rosterId||b===target.rosterId)againstTarget++;else available++;
  }
  available+=Math.min(againstTarget,remaining-k);
  const needed=group.reduce((n,t)=>n+Math.max(0,floor-credit(t)),0);
  return needed<=available;
 };
 const guarantees=k=>{
  const floor=credit(target)+k;
  const division=divisions&&peers.every(t=>floor>credit(t)+t.remaining.length);
  const possibleAbove=others.filter(t=>credit(t)+t.remaining.length>=floor).length;
  if(division||possibleAbove+otherDivisions<slots)return true;
  if(!complete)return false;
  const count=slots-otherDivisions,candidates=others.filter(t=>credit(t)+t.remaining.length>=floor);
  if(count<=0)return false;
  const possible=(from,group)=>{
   if(group.length===count)return groupCanCatch(group,floor,k);
   for(let i=from;i<=candidates.length-(count-group.length);i++)if(possible(i+1,[...group,candidates[i]]))return true;
   return false;
  };
  return !possible(0,[]);
 };
 const divisionClinched=divisions&&peers.every(t=>credit(target)>credit(t)+t.remaining.length);
 const divisionPossible=divisions&&peers.every(t=>credit(t)<=credit(target)+remaining);
 const eliminated=!divisionPossible&&others.filter(t=>credit(t)>credit(target)+remaining).length>=slots;
 const clinched=slots>0&&guarantees(0);
 const winsNeeded=Array.from({length:remaining+1},(_,i)=>i).find(k=>guarantees(k));
 return {status:clinched?'clinched':eliminated?'eliminated':'alive',divisionClinched:Boolean(divisionClinched),winsToGuarantee:winsNeeded??null};
}
export function forecastRace(teams,history,schedules,{week,start,slots,divisions,enabled=true,simulations=6000}){
 const unavailable=reason=>({available:false,reason});
 if(!enabled)return unavailable('This league format needs a different simulation model.');
 if(week>=start)return unavailable('Regular season complete.');
 const ids=new Set(teams.map(t=>t.rosterId)),games=[];
 for(let w=week;w<start;w++){
  const rows=schedules[w];
  if(!Array.isArray(rows)||rows.length!==teams.length||new Set(rows.map(r=>r.roster_id)).size!==ids.size||rows.some(r=>!ids.has(r.roster_id)||r.matchup_id==null))return unavailable('Waiting for the complete remaining schedule.');
  const groups=new Map();for(const r of rows){const g=groups.get(r.matchup_id)||[];g.push(r.roster_id);groups.set(r.matchup_id,g);}
  if([...groups.values()].some(g=>g.length!==2))return unavailable('Waiting for paired matchups.');
  games.push([...groups.values()]);
 }
 const samples=new Map(teams.map(t=>[t.rosterId,[]]));
 for(let w=1;w<week;w++){
  const rows=history[w];if(!Array.isArray(rows)||rows.length!==teams.length||new Set(rows.map(r=>r.roster_id)).size!==ids.size)return unavailable('Waiting for verified completed scores.');
  for(const r of rows){if(!ids.has(r.roster_id)||r.points==null||!Number.isFinite(Number(r.points)))return unavailable('Waiting for verified completed scores.');samples.get(r.roster_id).push(Number(r.points));}
 }
 if(teams.some(t=>{const s=samples.get(t.rosterId);return s.length<3||s.length!==Number(t.wins)+Number(t.losses)+Number(t.ties)||Math.abs(s.reduce((a,b)=>a+b,0)-t.pointsFor)>.11;}))return unavailable('Waiting for completed scores to match the standings.');
 const all=[...samples.values()].flat(),leagueMean=all.reduce((a,b)=>a+b,0)/all.length;
 const variance=[...samples.values()].reduce((sum,s)=>{const mean=s.reduce((a,b)=>a+b,0)/s.length;return sum+s.reduce((a,b)=>a+(b-mean)**2,0);},0)/(all.length-teams.length);
 const sd=Math.max(12,Math.sqrt(variance));
 const means=new Map(teams.map(t=>[t.rosterId,(samples.get(t.rosterId).reduce((a,b)=>a+b,0)+2*leagueMean)/(samples.get(t.rosterId).length+2)]));
 let seed=20261021;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return(seed+.5)/4294967296;};
 const normal=()=>Math.sqrt(-2*Math.log(random()))*Math.cos(2*Math.PI*random());
 const counts=new Map(teams.map(t=>[t.rosterId,{playoffs:0,bye:0,division:0,seeds:Array(teams.length).fill(0)}]));
 for(let i=0;i<simulations;i++){
  const simulated=teams.map(t=>({...t,tieOrder:random()})),byId=new Map(simulated.map(t=>[t.rosterId,t]));
  // One persistent strength draw per season captures uncertainty in short scoring histories.
  const strength=new Map(teams.map(t=>[t.rosterId,means.get(t.rosterId)+normal()*sd/Math.sqrt(samples.get(t.rosterId).length+2)]));
  for(const gamesInWeek of games)for(const [a,b]of gamesInWeek){const x=byId.get(a),y=byId.get(b),xp=Math.round((strength.get(a)+normal()*sd)*100)/100,yp=Math.round((strength.get(b)+normal()*sd)*100)/100;x.pointsFor+=xp;y.pointsFor+=yp;x.pointsAgainst+=yp;y.pointsAgainst+=xp;if(xp===yp){x.ties++;y.ties++;}else if(xp>yp){x.wins++;y.losses++;}else{y.wins++;x.losses++;}}
  const ordered=seedTeams(simulated,divisions),seen=new Set();ordered.forEach((t,j)=>{const c=counts.get(t.rosterId);c.seeds[j]++;if(j<slots)c.playoffs++;if(slots===6&&j<2)c.bye++;if(divisions&&!seen.has(t.division)){c.division++;seen.add(t.division);}});
 }
 return {available:true,simulations,sampleWeeks:week-1,model:'season-scoring-v1',teams:teams.map(t=>{const c=counts.get(t.rosterId);return {rosterId:t.rosterId,playoffOdds:c.playoffs/simulations,byeOdds:slots===6?c.bye/simulations:null,divisionOdds:divisions?c.division/simulations:null,seedOdds:c.seeds.map(n=>n/simulations)};})};
}
