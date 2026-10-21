// Completed, reconciled lineups only. No projection or market data enters Power.
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const round=n=>Math.round(n*100)/100;
function competition(rows,key){for(const row of rows)row.rank=1+rows.filter(other=>other[key]>row[key]).length;return rows.sort((a,b)=>b[key]-a[key]||String(a.rosterId).localeCompare(String(b.rosterId),undefined,{numeric:true}));}
export function buildPowerRankings({teams=[],starterWeeks=[],verifiedWeeks=[],throughWeek}={}){
 const unavailable=reason=>({status:'unavailable',reason,teams:[]});
 if(teams.length<2||!Number.isInteger(throughWeek)||throughWeek<1)return unavailable('Completed scoring is not available yet.');
 const ids=new Set(teams.map(t=>String(t.rosterId)));if(ids.size!==teams.length)return unavailable('Team identities could not be reconciled.');
 const weeks=[];
 for(let week=1;week<=throughWeek;week++){
  const candidates=starterWeeks.filter(w=>w.week===week),w=candidates[0];
  if(!verifiedWeeks.includes(week)||candidates.length!==1||!Array.isArray(w.rosters)||w.rosters.length!==teams.length||new Set(w.rosters.map(r=>String(r.rosterId))).size!==ids.size)return unavailable('Waiting for every completed week to be verified.');
  const scores=[];
  for(const row of w.rosters){
   if(!ids.has(String(row.rosterId))||!Array.isArray(row.starters)||row.starters.some(p=>!finite(p.points))||new Set(row.starters.map(p=>String(p.playerId))).size!==row.starters.length)return unavailable('Starter scores could not be reconciled.');
   scores.push({rosterId:String(row.rosterId),score:round(row.starters.reduce((sum,p)=>sum+p.points,0))});
  }
  weeks.push({week,scores});
 }
 const calculate=through=>{
  const selected=weeks.filter(w=>w.week<=through),recent=selected.slice(-3),recentIds=new Set(recent.map(w=>w.week));
  const rows=teams.map(team=>{
   const weekly=selected.map(w=>{const score=w.scores.find(r=>r.rosterId===String(team.rosterId)).score;const others=w.scores.filter(r=>r.rosterId!==String(team.rosterId)),wins=others.filter(r=>score>r.score).length,ties=others.filter(r=>score===r.score).length;return{week:w.week,score,wins,ties,credits:wins*2+ties,rank:1+others.filter(r=>r.score>score).length};});
   const weighted=weekly.reduce((n,w)=>n+w.credits*(recentIds.has(w.week)?2:1),0),weight=selected.length+recent.length,points=round(weekly.reduce((n,w)=>n+w.score,0)),recentPoints=weekly.filter(w=>recentIds.has(w.week)).reduce((n,w)=>n+w.score,0);
   return{rosterId:team.rosterId,weighted,powerIndex:Math.round(weighted/(2*(teams.length-1)*weight)*1000)/10,points,ppg:round(points/selected.length),recentPpg:round(recentPoints/recent.length),recentWeeks:recent.map(w=>w.week),allPlayWins:weekly.reduce((n,w)=>n+w.wins,0),allPlayTies:weekly.reduce((n,w)=>n+w.ties,0),allPlayLosses:weekly.reduce((n,w)=>n+teams.length-1-w.wins-w.ties,0),weekly};
  });
  return competition(rows,'weighted');
 };
 const rows=calculate(throughWeek),previous=throughWeek>1?calculate(throughWeek-1):[];
 for(const row of rows){row.previousRank=previous.find(t=>String(t.rosterId)===String(row.rosterId))?.rank??null;row.movement=row.previousRank==null?null:row.previousRank-row.rank;row.scoringRank=1+rows.filter(t=>t.ppg>row.ppg).length;row.recentRank=1+rows.filter(t=>t.recentPpg>row.recentPpg).length;row.weeklyHigh=Math.max(...row.weekly.map(w=>w.score));row.reason=row.scoringRank===1?'League-leading scoring pace':row.recentRank===1?'Hottest scoring over the last three':row.recentRank<row.scoringRank?'Recent scoring is climbing':row.scoringRank<=3?'Top-three season scoring':row.recentRank>row.scoringRank?'Recent pace trails the season average':'Holding its season scoring pace';}
 return{status:'ready',throughWeek,weekCount:weeks.length,teams:rows,provenance:{formulaVersion:'power-all-play-v1',formula:'Compare each completed weekly starter score with every other team. A win earns 1, a tie 0.5. The last three completed weeks count twice; older weeks count once. Divide by available weighted opponents and multiply by 100. Equal scores share rank.',movement:'Compare with the same calculation through the previous completed week.',notAProjection:true}};
}
