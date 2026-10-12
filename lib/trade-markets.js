import {fetchLiveMarketSnapshots} from './providers/live-market-sources.js';
import {matchExternalMarketValues} from './market-value.js';
export async function fetchTradeMarkets(teams,league){
 const positions=league.roster_positions||[],numQbs=positions.some(p=>['SUPER_FLEX','SUPERFLEX'].includes(p))?2:1;
 const result=await fetchLiveMarketSnapshots({numTeams:league.total_rosters||10,ppr:league.scoring_settings?.rec||0,numQbs,fetchImpl:(url,options)=>fetch(url,{...options,signal:AbortSignal.timeout(10000)})});
 const sources=[],failures=[...result.failures];for(const snapshot of result.snapshots){const timestamp=Date.parse(snapshot.asOf);if(!Number.isFinite(timestamp)||Date.now()-timestamp>45*86400000){failures.push({source:snapshot.source,error:'Dated values unavailable or older than 45 days'});continue;}if(snapshot.source==='statsguy'&&numQbs!==2){failures.push({source:snapshot.source,error:'Superflex source does not match this league'});continue;}const matched=matchExternalMarketValues({teams,snapshot});sources.push({source:snapshot.source,asOf:snapshot.asOf,format:snapshot.format,values:Object.fromEntries(Object.entries(matched.values).map(([id,p])=>[id,p.value])),coverage:matched.coverage});}
 return {status:sources.length?'ready':'unavailable',sources,failures,retrievedAt:new Date().toISOString(),format:{superflex:numQbs===2,ppr:league.scoring_settings?.rec||0,numTeams:league.total_rosters||10}};
}
