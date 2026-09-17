// Live external market snapshot fetchers.
// Transport is isolated from parsing so every provider can fail independently and be disclosed.
import {fetchFantasyCalcSnapshot} from './fantasycalc.js';
import {fetchStatsGuySnapshot} from './statsguy.js';
import {parseDynastyProcessValues} from './dynastyprocess.js';
export const LIVE_MARKET_SOURCES_VERSION='live-market-sources-v1';
export const DYNASTYPROCESS_VALUES_URL='https://raw.githubusercontent.com/dynastyprocess/data/master/files/values-players.csv';
async function dynastyProcess({fetchImpl=fetch}={}){const r=await fetchImpl(DYNASTYPROCESS_VALUES_URL,{headers:{accept:'text/csv'}});if(!r.ok)throw new Error(`DynastyProcess request failed: ${r.status}`);return parseDynastyProcessValues(await r.text(),{superflex:true});}
export async function fetchLiveMarketSnapshots({fetchImpl=fetch,numTeams=10,ppr=1,numQbs=2}={}){
 const jobs=[['fantasycalc',()=>fetchFantasyCalcSnapshot({fetchImpl,numTeams,ppr,numQbs})],['statsguy',()=>fetchStatsGuySnapshot({fetchImpl})],['dynastyprocess',()=>dynastyProcess({fetchImpl})]];
 const snapshots=[],failures=[];for(const [source,run] of jobs){try{const snapshot=await run();snapshots.push(snapshot);}catch(e){failures.push({source,error:e instanceof Error?e.message:String(e)});}}
 return{status:snapshots.length?'ready':'unavailable',snapshots,failures,sourceCount:snapshots.length,provenance:{formulaVersion:LIVE_MARKET_SOURCES_VERSION,partialFailureAllowed:true,failedSourcesNeverFabricated:true,aiAdjusted:false}};
}
