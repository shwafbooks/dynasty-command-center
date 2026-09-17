// DCC Roster Strength framework v1.
// Defines the published combination policy before market data is allowed to drive rankings.
// No score is emitted unless all required evidence gates pass.

export const DCC_ROSTER_STRENGTH_VERSION='dcc-roster-strength-v1';
export const DCC_ROSTER_STRENGTH_WEIGHTS=Object.freeze({marketValue:0.60,verifiedProduction:0.25,depth:0.15});

const round=v=>Math.round((Number(v||0)+Number.EPSILON)*100)/100;
function percentile(value,values){const clean=values.filter(Number.isFinite).sort((a,b)=>a-b);if(!clean.length||!Number.isFinite(value))return null;if(clean.length===1)return 100;const below=clean.filter(v=>v<value).length,equal=clean.filter(v=>v===value).length;return round(((below+(equal-1)/2)/(clean.length-1))*100);}

export function buildDccRosterStrength({marketReport,productionTeams=[],strengthEvidenceTeams=[]}){
  const marketReady=Boolean(marketReport?.publicationGate?.passes&&marketReport?.status==='published');
  const productionReady=productionTeams.length>1;
  const depthReady=strengthEvidenceTeams.length>1;
  const gates={marketReady,productionReady,depthReady};
  if(!Object.values(gates).every(Boolean))return{status:'withheld',formulaVersion:DCC_ROSTER_STRENGTH_VERSION,score:null,rankings:null,gates,weights:DCC_ROSTER_STRENGTH_WEIGHTS,reason:'DCC roster strength is withheld until market coverage, verified production, and roster-depth evidence all pass their publication requirements.'};

  const marketById=Object.fromEntries(marketReport.teams.map(t=>[String(t.rosterId),t]));
  const prodById=Object.fromEntries(productionTeams.map(t=>[String(t.rosterId),t]));
  const depthById=Object.fromEntries(strengthEvidenceTeams.map(t=>[String(t.rosterId),t]));
  const ids=Object.keys(marketById).filter(id=>prodById[id]&&depthById[id]);
  const marketVals=ids.map(id=>Number(marketById[id].totalMarketValue));
  const prodVals=ids.map(id=>Number(prodById[id].totalRosterPoints));
  const depthVals=ids.map(id=>Object.values(depthById[id].positions||{}).reduce((s,p)=>s+Number(p.depthProduction||0),0));
  const teams=ids.map((id,index)=>{
    const market=marketVals[index],production=prodVals[index],depth=depthVals[index];
    const components={marketValuePercentile:percentile(market,marketVals),verifiedProductionPercentile:percentile(production,prodVals),depthPercentile:percentile(depth,depthVals)};
    const score=round(components.marketValuePercentile*DCC_ROSTER_STRENGTH_WEIGHTS.marketValue+components.verifiedProductionPercentile*DCC_ROSTER_STRENGTH_WEIGHTS.verifiedProduction+components.depthPercentile*DCC_ROSTER_STRENGTH_WEIGHTS.depth);
    return{rosterId:marketById[id].rosterId,team:marketById[id].team,manager:marketById[id].manager,score,components,rawInputs:{marketValue:market,verifiedRosterProduction:production,verifiedDepthProduction:round(depth)}};
  }).sort((a,b)=>b.score-a.score||Number(a.rosterId)-Number(b.rosterId));
  teams.forEach((team,index)=>team.rank=index+1);
  return{status:'published',formulaVersion:DCC_ROSTER_STRENGTH_VERSION,weights:DCC_ROSTER_STRENGTH_WEIGHTS,gates,teams,provenance:{classification:'deterministic composite roster-strength index',normalization:'league-relative percentile for each component',formula:'60% external market-value percentile + 25% verified-production percentile + 15% verified-depth-production percentile',policy:'Same published formula for every franchise. AI cannot modify inputs, weights, score, or rank.',limitations:['External market value reflects provider consensus and its scoring format, not DCC opinion.','Verified production is backward-looking.','Depth production is based on current-roster verified scoring and is not a future projection.']}};
}
