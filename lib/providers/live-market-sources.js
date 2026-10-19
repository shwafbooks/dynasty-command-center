// Live external market snapshot fetchers.
// Transport is isolated from parsing so every provider can fail independently and be disclosed.
import {fetchFantasyCalcSnapshot} from './fantasycalc.js';
import {fetchStatsGuySnapshot} from './statsguy.js';
import {parseDynastyProcessValues} from './dynastyprocess.js';
export const LIVE_MARKET_SOURCES_VERSION='live-market-sources-v1';
export const DYNASTYPROCESS_VALUES_URL='https://raw.githubusercontent.com/dynastyprocess/data/master/files/values-players.csv';
async function dynastyProcess({fetchImpl=fetch,numQbs=2}={}){const r=await fetchImpl(DYNASTYPROCESS_VALUES_URL,{headers:{accept:'text/csv'}});if(!r.ok)throw new Error(`DynastyProcess request failed: ${r.status}`);return parseDynastyProcessValues(await r.text(),{superflex:numQbs===2});}
export async function fetchLiveMarketSnapshots({fetchImpl=fetch,numTeams=10,ppr=1,numQbs=2}={}){
 const jobs=[['fantasycalc',()=>fetchFantasyCalcSnapshot({fetchImpl,numTeams,ppr,numQbs})],['statsguy',()=>fetchStatsGuySnapshot({fetchImpl})],['dynastyprocess',()=>dynastyProcess({fetchImpl,numQbs})]];
 const snapshots=[],failures=[],results=await Promise.allSettled(jobs.map(([,run])=>run()));for(let i=0;i<results.length;i++){const r=results[i],source=jobs[i][0];if(r.status==='fulfilled')snapshots.push(r.value);else failures.push({source,error:r.reason instanceof Error?r.reason.message:String(r.reason)});}
 return{status:snapshots.length?'ready':'unavailable',snapshots,failures,sourceCount:snapshots.length,provenance:{formulaVersion:LIVE_MARKET_SOURCES_VERSION,partialFailureAllowed:true,failedSourcesNeverFabricated:true,aiAdjusted:false}};
}
