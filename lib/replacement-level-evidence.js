// DCC Replacement-Level Evidence
// Measures positional availability from the actual rostered/available player pool.
// It does not assign arbitrary positional scarcity multipliers.
export const REPLACEMENT_LEVEL_VERSION='replacement-level-evidence-v1';
const POSITIONS=['QB','RB','WR','TE'];
const round=(v,n=4)=>{const p=10**n;return Math.round((Number(v||0)+Number.EPSILON)*p)/p;};
const id=p=>String(p?.id||p?.playerId||p?.player_id||'');
const pos=p=>String(p?.position||'').toUpperCase();
export function buildReplacementLevelEvidence({teams=[],playerPool=[],lineupCapacity}={}){
 const rostered=new Set();for(const team of teams)for(const p of [...(team.starters||[]),...(team.bench||[])]){const x=id(p);if(x)rostered.add(x);}
 const active=playerPool.filter(p=>POSITIONS.includes(pos(p))&&id(p));const byPosition={};
 for(const position of POSITIONS){const population=active.filter(p=>pos(p)===position),rosteredRows=population.filter(p=>rostered.has(id(p))),availableRows=population.filter(p=>!rostered.has(id(p))),teamCount=teams.length,dedicatedPerTeam=Number(lineupCapacity?.guaranteed?.[position]||0),maxPerTeam=Number(lineupCapacity?.maximumStarts?.[position]||dedicatedPerTeam),dedicatedDemand=teamCount*dedicatedPerTeam,maxDemand=teamCount*maxPerTeam;
  byPosition[position]={populationCount:population.length,rosteredCount:rosteredRows.length,availableCount:availableRows.length,rosteredShare:population.length?round(rosteredRows.length/population.length):null,availablePerTeam:teamCount?round(availableRows.length/teamCount):null,dedicatedStarterDemand:dedicatedDemand,maximumLegalStarterDemand:maxDemand,availablePerDedicatedStarterSlot:dedicatedDemand?round(availableRows.length/dedicatedDemand):null,availablePerMaximumStarterSlot:maxDemand?round(availableRows.length/maxDemand):null,availablePlayerIds:availableRows.map(id)};
 }
 return{status:teams.length&&active.length?'ready':'insufficient-data',teamCount:teams.length,rosteredPlayerCount:rostered.size,positions:byPosition,interpretation:{meaning:'Observed positional availability after current league rosters are removed from the supplied active player pool.',scarcity:'Fewer available players per lineup opportunity indicates greater observed replacement pressure; DCC does not convert this into a player-value multiplier here.',caution:'Player-pool completeness and active-status filtering directly affect this evidence.'},provenance:{formulaVersion:REPLACEMENT_LEVEL_VERSION,inputs:['current league rosters','supplied player pool','derived lineup capacity'],arbitraryPositionMultiplier:false,aiAdjusted:false}};
}
