// DCC Replacement Quality Evidence
// Separates waiver-pool quality from raw availability quantity.
export const REPLACEMENT_QUALITY_VERSION='replacement-quality-evidence-v1';
const POSITIONS=['QB','RB','WR','TE'];
const round=(v,n=4)=>{const p=10**n;return Math.round((Number(v||0)+Number.EPSILON)*p)/p;};
const mean=a=>a.length?round(a.reduce((x,y)=>x+y,0)/a.length):null;
export function buildReplacementQualityEvidence({replacementEvidence,consensusPlayers={}}={}){
 if(replacementEvidence?.status!=='ready')return{status:'withheld',publicationEligible:false,reason:'replacement-evidence-not-ready'};
 const positions={};let valuedTotal=0,availableTotal=0;
 for(const position of POSITIONS){const availability=replacementEvidence.positions?.[position]||{};const ids=(availability.availablePlayerIds||[]).map(String);availableTotal+=ids.length;
  const valued=ids.map(playerId=>{const c=consensusPlayers[playerId];return c&&Number.isFinite(Number(c.consensusPercentile))?{playerId,consensusPercentile:Number(c.consensusPercentile),agreement:Number.isFinite(Number(c.agreement))?Number(c.agreement):null,sourceCount:Number(c.sourceCount||0)}:null;}).filter(Boolean).sort((a,b)=>b.consensusPercentile-a.consensusPercentile||a.playerId.localeCompare(b.playerId));valuedTotal+=valued.length;
  positions[position]={availableCount:ids.length,valuedAvailableCount:valued.length,marketCoverage:ids.length?round(valued.length/ids.length):0,bestAvailable:valued[0]||null,top3MeanConsensusPercentile:mean(valued.slice(0,3).map(x=>x.consensusPercentile)),top5MeanConsensusPercentile:mean(valued.slice(0,5).map(x=>x.consensusPercentile)),topAvailable:valued.slice(0,5)};
 }
 const publicationEligible=valuedTotal>0;
 return{status:publicationEligible?'ready':'withheld',publicationEligible,availablePlayerCount:availableTotal,marketValuedAvailableCount:valuedTotal,marketCoverage:availableTotal?round(valuedTotal/availableTotal):0,positions,interpretation:{quantity:'availableCount is the policy-filtered population remaining after current rosters are removed.',quality:'Market quality uses only available players with publication-eligible multi-source consensus; missing values are not estimated or treated as zero.',caution:'A high raw free-agent count does not imply strong replacement quality.'},provenance:{formulaVersion:REPLACEMENT_QUALITY_VERSION,rawProviderValuesAveraged:false,missingValuesEstimated:false,arbitraryScarcityMultiplier:false,aiAdjusted:false}};
}
