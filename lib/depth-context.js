// DCC Depth Context
// Separates roster-owned depth from the league waiver environment so correlated evidence is not double-counted.
export const DEPTH_CONTEXT_VERSION='depth-context-v1';
const round=(v,n=4)=>{const p=10**n;return Math.round((Number(v)+Number.EPSILON)*p)/p;};
export function buildDepthContext({lineupMarketTeams=[],replacementMarketTeams=[]}={}){
 const rMap=new Map(replacementMarketTeams.map(t=>[String(t.rosterId),t]));
 const teams=(lineupMarketTeams||[]).map(m=>{const r=rMap.get(String(m.rosterId));const vals=[];for(const pos of ['QB','RB','WR','TE'])for(const p of r?.positions?.[pos]?.players||[])if(Number.isFinite(Number(p.marketAdvantageVsBestAvailable)))vals.push(Number(p.marketAdvantageVsBestAvailable));return{rosterId:String(m.rosterId),team:m.team,manager:m.manager,ownedDepth:Number.isFinite(Number(m?.depth?.meanConsensusPercentile))?Number(m.depth.meanConsensusPercentile):null,replacementCushion:vals.length?round(vals.reduce((a,b)=>a+b,0)/vals.length):null};});
 return{status:teams.length?'ready':'insufficient-data',teams,interpretation:{ownedDepth:'Dynasty market quality of players outside the optimized starting core.',replacementCushion:'Observed roster-player market advantage over the best available waiver baseline.',policy:'These remain separate descriptive evidence. A published strength formula must not independently weight both until overlap is resolved.'},provenance:{formulaVersion:DEPTH_CONTEXT_VERSION,combinedScorePublished:false,weightsApplied:false,aiAdjusted:false}};
}