import {buildChampionshipGame} from './championship-game.js';
const money={entry:25,payouts:{1:150,2:75,3:25}};
const points=(s,key)=>Number(s[key]||0)+Number(s[`${key}_decimal`]||0)/100;
export function buildLeagueHistory(source,warnings=[],players={}){
 const seasons=source.map(({league,rosters,users,winners=[],losers=[],championshipRows=[]})=>{
  const complete=league.status==='complete',people=new Map(users.map(u=>[u.user_id,u])),places=new Map();
  if(complete){for(const game of winners)if(game.p&&game.w!=null&&game.l!=null){places.set(game.w,game.p);places.set(game.l,game.p+1);}
   if(Number(league.settings?.playoff_type||0)===0)for(const game of losers)if(game.p&&game.w!=null&&game.l!=null){const offset=Number(league.settings?.playoff_teams||0);places.set(game.w,offset+game.p);places.set(game.l,offset+game.p+1);}}
  const standings=rosters.map(r=>{const u=people.get(r.owner_id),s=r.settings||{},finish=places.get(r.roster_id)||null;return {rosterId:r.roster_id,userId:r.owner_id,manager:u?.display_name||'Unassigned',team:u?.metadata?.team_name||u?.display_name||`Roster ${r.roster_id}`,avatar:u?.avatar||null,wins:s.wins||0,losses:s.losses||0,ties:s.ties||0,pointsFor:points(s,'fpts'),pointsAgainst:points(s,'fpts_against'),finish,buyIn:complete?money.entry:0,winnings:complete&&finish?money.payouts[finish]||0:null};}).sort((a,b)=>complete?(a.finish||99)-(b.finish||99)||b.wins-a.wins||b.pointsFor-a.pointsFor:b.wins-a.wins||b.pointsFor-a.pointsFor);
  const teams=new Map(standings.map(r=>[r.rosterId,r]));
  const final=complete?winners.find(g=>g.p===1&&g.w!=null&&g.l!=null):null;
  const champion=teams.get(final?.w),runnerUp=teams.get(final?.l);
  const a=championshipRows.find(r=>r.roster_id===final?.w),b=championshipRows.find(r=>r.roster_id===final?.l);
  const score=r=>r?.custom_points??r?.points;
  const verified=!!(final&&a&&b&&a.matchup_id!=null&&a.matchup_id===b.matchup_id&&typeof score(a)==='number'&&typeof score(b)==='number'&&Number.isFinite(score(a))&&Number.isFinite(score(b))&&score(a)>=score(b));
  const championship=final&&champion&&runnerUp?{champion,runnerUp,week:Number(league.settings?.playoff_round_type||0)===0?Number(league.settings?.playoff_week_start)+Number(final.r)-1:null,championPoints:verified?score(a):null,runnerUpPoints:verified?score(b):null,margin:verified?Math.round((score(a)-score(b))*100)/100:null,game:verified?buildChampionshipGame(a,b,league.roster_positions||[],players):null}:null;
  return {id:league.league_id,year:league.season,complete,status:league.status,standings,championship,podium:[1,2,3].map(p=>standings.find(r=>r.finish===p)||null),playoffs:[...winners.map(g=>({...g,bracket:'Championship'})),...losers.map(g=>({...g,bracket:'Consolation'}))].map(g=>({round:g.r,placement:g.p||null,bracket:g.bracket,a:teams.get(g.t1)?.manager||'To be decided',b:teams.get(g.t2)?.manager||'To be decided',winner:teams.get(g.w)?.manager||null})),ledgerReady:complete&&[1,2,3].every(p=>standings.some(r=>r.finish===p))};
 }).sort((a,b)=>Number(b.year)-Number(a.year));
 const careers=new Map();
 for(const season of seasons.filter(s=>s.complete))for(const row of season.standings){if(!row.userId)continue;let c=careers.get(row.userId);if(!c){c={userId:row.userId,manager:row.manager,avatar:row.avatar,wins:0,losses:0,ties:0,titles:0,seasons:[],buyIns:0,winnings:0,pending:false};careers.set(row.userId,c);}c.wins+=row.wins;c.losses+=row.losses;c.ties+=row.ties;c.titles+=row.finish===1?1:0;c.buyIns+=money.entry;c.winnings+=season.ledgerReady?row.winnings||0:0;c.pending||=!season.ledgerReady;c.seasons.push({year:season.year,finish:row.finish,buyIn:money.entry,winnings:season.ledgerReady?row.winnings:null});}
 const career=[...careers.values()].map(c=>({...c,net:c.pending?null:c.winnings-c.buyIns})).sort((a,b)=>b.titles-a.titles||b.wins-a.wins);
 const completed=seasons.filter(s=>s.complete),entries=completed.flatMap(s=>s.standings.map(r=>({...r,year:s.year}))),best=entries.slice().sort((a,b)=>b.pointsFor-a.pointsFor)[0],wins=entries.slice().sort((a,b)=>b.wins-a.wins)[0];
 return {seasons,career,rules:money,warnings,completedSeasons:completed.length,records:{points:best?{manager:best.manager,year:best.year,value:best.pointsFor}:null,wins:wins?{manager:wins.manager,year:wins.year,value:wins.wins}:null},totals:{buyIns:career.reduce((n,c)=>n+c.buyIns,0),winnings:career.reduce((n,c)=>n+c.winnings,0)},source:'Sleeper league chain, roster records and playoff brackets',ledgerNote:'Calculated using $25 annual entry and $150 / $75 / $25 podium prizes. Payments are not tracked. Completed seasons only.'};
}
export async function fetchLeagueHistory(id,get){
 const source=[],warnings=[],seen=new Set();
 while(id&&source.length<12&&!seen.has(id)){seen.add(id);try{const league=await get(`/league/${encodeURIComponent(id)}`,300000);if(!league?.league_id)throw new Error('League unavailable');const [rosters,users,winners,losers]=await Promise.all([get(`/league/${id}/rosters`,300000),get(`/league/${id}/users`,300000),get(`/league/${id}/winners_bracket`,300000),get(`/league/${id}/losers_bracket`,300000)]);let championshipRows=[];
 const final=league.status==='complete'?winners.find(g=>g.p===1&&g.w!=null&&g.l!=null):null;
 const week=Number(league.settings?.playoff_week_start)+Number(final?.r)-1;
 if(final&&Number(league.settings?.playoff_round_type||0)===0&&Number.isInteger(week)&&week>=1&&week<=18){try{const rows=await get(`/league/${id}/matchups/${week}`,300000);if(Array.isArray(rows))championshipRows=rows;}catch{/* Preserve the archive when final scores are unavailable. */}}
 source.push({league,rosters,users,winners,losers,championshipRows});id=league.previous_league_id;}catch{warnings.push('Some historical league data could not be loaded. Retry to refresh the archive.');break;}}
 if(!source.length)throw new Error('League history is temporarily unavailable');
 let players={};if(source.some(s=>s.championshipRows.length)){try{const directory=await get('/players/nfl',86400000);if(directory&&typeof directory==='object'&&!Array.isArray(directory))players=directory;}catch{/* Scores and starter IDs remain usable without player metadata. */}}
 return buildLeagueHistory(source,warnings,players);
}
