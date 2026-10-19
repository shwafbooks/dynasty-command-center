import {fetchLiveMarketSnapshots} from './providers/live-market-sources.js';
import {buildDraftPicks} from './draft-picks.js';
import {matchExternalMarketValues} from './market-value.js';
export function tradeSnapshotProblem(snapshot,{numQbs=2,now=Date.now()}={}){const timestamp=Date.parse(snapshot.asOf);if(!Number.isFinite(timestamp)||now-timestamp>14*86400000||timestamp>now+86400000)return 'Values lack a valid date, are older than 14 days, or future-dated';if(snapshot.source==='statsguy'&&numQbs!==2)return 'Superflex source does not match this league';return null;}
export async function fetchTradeMarkets(teams,league,get){
 const positions=league.roster_positions||[],numQbs=positions.some(p=>['SUPER_FLEX','SUPERFLEX'].includes(p))?2:1;
 const inventory=await Promise.allSettled([get(`/league/${league.league_id}/traded_picks`,60000),get(`/league/${league.league_id}/drafts`,60000)]);
 const picksAvailable=inventory.every(r=>r.status==='fulfilled');const picks=picksAvailable?buildDraftPicks(league,teams,inventory[0].value,inventory[1].value):[];
 const result=await fetchLiveMarketSnapshots({numTeams:league.total_rosters||10,ppr:league.scoring_settings?.rec||0,numQbs,fetchImpl:(url,options)=>fetch(url,{...options,signal:AbortSignal.timeout(10000)})});
 const sources=[],failures=[...result.failures];for(const snapshot of result.snapshots){const problem=tradeSnapshotProblem(snapshot,{numQbs});if(problem){failures.push({source:snapshot.source,error:problem});continue;}const matched=matchExternalMarketValues({teams,snapshot});sources.push({source:snapshot.source,asOf:snapshot.asOf,format:snapshot.format,formatNote:snapshot.source==='fantasycalc'?'Requested league team count, PPR and QB format':'General superflex market baseline; not customized to this league',pickValues:snapshot.pickValues||{},values:Object.fromEntries(Object.entries(matched.values).map(([id,p])=>[id,p.value])),coverage:matched.coverage});}
 return {picks,picksAvailable,status:sources.length?'ready':'unavailable',sources,failures,retrievedAt:new Date().toISOString(),format:{superflex:numQbs===2,ppr:league.scoring_settings?.rec||0,numTeams:league.total_rosters||10}};
}
