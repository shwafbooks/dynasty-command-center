// DCC roster-strength evidence layer.
// This deliberately does NOT emit an overall strength score yet.
// It separates verified production evidence from roster construction evidence.

const POSITIONS=['QB','RB','WR','TE'];
const STARTER_CAPACITY={QB:2,RB:4,WR:4,TE:3};
export const ROSTER_STRENGTH_VERSION='roster-strength-evidence-v1';
const round=v=>Math.round((Number(v||0)+Number.EPSILON)*100)/100;

function playerPosition(p={}){return String(p.position||p.fantasyPosition||'').toUpperCase();}
function uniqueRoster(team={}){const seen=new Set();return[...(team.starters||[]),...(team.bench||[])].filter(p=>{const id=String(p?.id||p?.playerId||'');if(!id||seen.has(id))return false;seen.add(id);return true;});}

export function buildRosterStrengthEvidence({team,seasonPlayers={},verifiedWeeks=[]}){
  const roster=uniqueRoster(team),starterIds=new Set((team.starters||[]).map(p=>String(p?.id||p?.playerId||'')));
  const positions={};
  for(const position of POSITIONS){
    const group=roster.filter(p=>playerPosition(p)===position).map(p=>{const id=String(p.id||p.playerId),scored=seasonPlayers[id];return{playerId:id,name:p.name||p.fullName||id,isCurrentStarter:starterIds.has(id),verifiedPoints:scored?round(scored.points):null,verifiedWeekCount:scored?.verifiedWeekCount||0};});
    const scored=group.filter(p=>Number.isFinite(p.verifiedPoints)).sort((a,b)=>b.verifiedPoints-a.verifiedPoints||a.name.localeCompare(b.name));
    const capacity=STARTER_CAPACITY[position];
    positions[position]={position,rosterCount:group.length,currentStarterCount:group.filter(p=>p.isCurrentStarter).length,verifiedScoringCount:scored.length,verifiedProduction:round(scored.reduce((s,p)=>s+p.verifiedPoints,0)),topProduction:round(scored.slice(0,capacity).reduce((s,p)=>s+p.verifiedPoints,0)),depthProduction:round(scored.slice(capacity).reduce((s,p)=>s+p.verifiedPoints,0)),depthPlayerCount:Math.max(0,group.length-capacity),starterCapacityProxy:capacity,players:scored,interpretation:{topProduction:`sum of top ${capacity} verified scorers currently rostered at ${position}`,depthProduction:`verified production beyond the top ${capacity}; roster-construction evidence only`,caveat:'Starter capacity is a fixed comparison proxy for this league format, not a claim about optimal weekly lineup usage.'}};
  }
  return{rosterId:team.rosterId,team:team.team,manager:team.manager,verifiedWeeks:[...verifiedWeeks],positions,provenance:{formulaVersion:ROSTER_STRENGTH_VERSION,classification:'roster strength evidence, not roster strength score',inputs:['current Sleeper roster','verified DCC player scoring'],excluded:['AI judgment','age adjustment','market value','projection','manual player ranking'],policy:'No overall or positional strength score is emitted until future-value inputs and formula weights are independently sourced and published.'}};
}

export function buildLeagueRosterStrengthEvidence({teams=[],seasonScoring}){
  const verifiedWeeks=seasonScoring?.verifiedWeeks||[];
  return{status:verifiedWeeks.length?'evidence-ready':'insufficient-data',formulaVersion:ROSTER_STRENGTH_VERSION,verifiedWeeks,teams:teams.map(team=>buildRosterStrengthEvidence({team,seasonPlayers:seasonScoring?.players||{},verifiedWeeks})),provenance:{separationRule:'Production describes what happened. Roster-strength evidence describes current construction. Neither is presented as future dynasty value.',overallStrengthScore:null}};
}
