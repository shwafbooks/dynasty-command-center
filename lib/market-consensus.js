// DCC multi-source market consensus.
// Normalizes independent provider ranks before combining them; raw provider scales are never averaged.
export const MARKET_CONSENSUS_VERSION='market-consensus-v2';
const round=(v,n=4)=>{const p=10**n;return Math.round((Number(v||0)+Number.EPSILON)*p)/p;};
const POSITIONS=['QB','RB','WR','TE'];

function percentileFromRank(rank,count){if(count<=1)return 1;return 1-(rank-1)/(count-1);}
function sourceMap(source){const rows=(source.players||[]).filter(p=>p.playerId&&Number.isFinite(Number(p.value)));const ordered=[...rows].sort((a,b)=>Number(b.value)-Number(a.value)||String(a.playerId).localeCompare(String(b.playerId)));return new Map(ordered.map((p,i)=>[String(p.playerId),{percentile:percentileFromRank(i+1,ordered.length),rank:i+1,count:ordered.length,rawValue:Number(p.value)}]));}

export function buildMarketConsensus({sources=[],minimumSources=2}){
  const usable=sources.filter(s=>s&&s.source&&Array.isArray(s.players)&&s.players.length);
  const maps=usable.map(s=>({source:s.source,asOf:s.asOf||null,format:s.format||null,independenceGroup:s.independenceGroup||s.source,weight:Number.isFinite(Number(s.weight))?Number(s.weight):1,map:sourceMap(s)}));
  const ids=new Set(maps.flatMap(s=>[...s.map.keys()]));const players={};
  for(const playerId of ids){const evidence=[];for(const s of maps){const row=s.map.get(playerId);if(row)evidence.push({source:s.source,independenceGroup:s.independenceGroup,asOf:s.asOf,format:s.format,weight:s.weight,...row});}const independentGroups=new Set(evidence.map(e=>e.independenceGroup));if(evidence.length<minimumSources||independentGroups.size<minimumSources)continue;const weightTotal=evidence.reduce((sum,e)=>sum+e.weight,0),consensus=evidence.reduce((sum,e)=>sum+e.percentile*e.weight,0)/weightTotal;const variance=evidence.reduce((sum,e)=>sum+e.weight*((e.percentile-consensus)**2),0)/weightTotal;players[playerId]={playerId,consensusPercentile:round(consensus),agreement:round(Math.max(0,1-Math.sqrt(variance))),sourceCount:evidence.length,independentSourceCount:independentGroups.size,independenceGroups:[...independentGroups].sort(),evidence};}
  return{status:Object.keys(players).length?'consensus-ready':'insufficient-data',formulaVersion:MARKET_CONSENSUS_VERSION,minimumSources,sourceCount:maps.length,sources:maps.map(({map,...meta})=>meta),players,provenance:{formula:'within-source value rank -> percentile; weighted mean of source percentiles; agreement = 1 - weighted standard deviation of source percentiles',rawValuesAveraged:false,missingSourcePolicy:'A player must meet minimumSources provider observations AND minimumSources independent evidence groups. Missing providers are not treated as zero.',aiAdjusted:false,ageAdjusted:false,manualOverride:false}};
}

export function attachLeagueConsensus({teams=[],consensus}){const rows=[];for(const team of teams){const seen=new Set(),players=[];for(const p of [...(team.starters||[]),...(team.bench||[])]){const id=String(p.id||p.playerId||'');if(!id||seen.has(id)||!POSITIONS.includes(String(p.position||'').toUpperCase()))continue;seen.add(id);const c=consensus?.players?.[id];if(c)players.push({...c,name:p.name||p.fullName||id,position:String(p.position||'').toUpperCase()});}rows.push({rosterId:team.rosterId,team:team.team,manager:team.manager,matchedPlayers:players.length,players});}return{...consensus,teams:rows,provenance:{...consensus.provenance,leagueAggregation:'No team ranking is emitted by market-consensus-v2. Player consensus is evidence for a later audited roster formula.'}};}
