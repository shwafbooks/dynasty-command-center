// Dynasty Command Center Team Intelligence foundation.
// Facts and comparisons derive from VERIFIED DCC scoring only. No AI judgment.
const CORE_POSITIONS=['QB','RB','WR','TE'];
const FORMULA_VERSION='team-intelligence-starter-production-v2';
function round(v){return Math.round((Number(v||0)+Number.EPSILON)*100)/100;}
function positionOf(p={}){return String(p.position||p.fantasyPosition||'').toUpperCase();}
export function buildTeamProductionProfile({team,seasonPlayers={},verifiedWeeks=[]}){if(!team)throw new Error('team is required');const roster=[...(team.starters||[]),...(team.bench||[])],seen=new Set(),players=[];for(const player of roster){const playerId=String(player?.id||player?.playerId||'');if(!playerId||seen.has(playerId))continue;seen.add(playerId);const scored=seasonPlayers[playerId],position=positionOf(player);players.push({playerId,name:player.fullName||player.name||player.playerName||playerId,position,nflTeam:player.team||player.nflTeam||null,seasonPoints:scored?round(scored.points):0,verifiedWeekCount:scored?.verifiedWeekCount||0,hasVerifiedScoring:Boolean(scored)});}players.sort((a,b)=>b.seasonPoints-a.seasonPoints||a.name.localeCompare(b.name));const byPosition=Object.fromEntries(CORE_POSITIONS.map(position=>{const group=players.filter(p=>p.position===position);return[position,{position,rosterCount:group.length,seasonPoints:round(group.reduce((s,p)=>s+p.seasonPoints,0)),scoringPlayers:group.filter(p=>p.hasVerifiedScoring).length,players:group}];}));return{rosterId:team.rosterId,team:team.team,manager:team.manager,verifiedWeeks:[...verifiedWeeks],verifiedWeekCount:verifiedWeeks.length,totalRosterPoints:round(players.reduce((s,p)=>s+p.seasonPoints,0)),positions:byPosition,topScorers:players.filter(p=>p.hasVerifiedScoring).slice(0,5),completeness:verifiedWeeks.length?'verified-weeks-only':'insufficient-data',provenance:{classification:'deterministic roster production profile',formulaVersion:'team-intelligence-production-v1.2',scoringInput:'DCC verified season scoring only',formula:'sum verified player fantasy points currently on roster, grouped by listed position',caveat:'Roster production is not a historical points-for measure because current rosters may include players acquired after earlier verified weeks.',aiAdjusted:false,projectionAdjusted:false,marketValueAdjusted:false}};}
function addLeagueComparisons(teams){for(const position of CORE_POSITIONS){const ordered=[...teams].sort((a,b)=>b.positions[position].seasonPoints-a.positions[position].seasonPoints||String(a.rosterId).localeCompare(String(b.rosterId),undefined,{numeric:true}));const values=ordered.map(t=>t.positions[position].seasonPoints);const leagueAverage=round(values.reduce((sum,v)=>sum+v,0)/(values.length||1));let priorPoints=null,priorRank=0;ordered.forEach((team,index)=>{const row=team.positions[position],points=row.seasonPoints;const rank=priorPoints!==null&&points===priorPoints?priorRank:index+1;if(points!==priorPoints){priorPoints=points;priorRank=rank;}row.comparison={rank,leagueSize:ordered.length,leagueAverage,pointsVsLeagueAverage:round(points-leagueAverage),formulaVersion:FORMULA_VERSION,metric:'historical starter positional production',rankFormula:'standard competition rank by descending verified positional points; exact ties share rank; rosterId only stabilizes display order',averageFormula:'sum all team positional points / league team count',higherMeans:'more verified fantasy points contributed by weekly starters at this position',notAProjection:true};});}return teams;}
// Historical weekly lineups attribute production to the franchise that actually started it.
export function buildLeagueTeamIntelligence({teams=[],seasonScoring,playerMap={}}){
 if(!seasonScoring)throw new Error('seasonScoring is required');
 const verifiedWeeks=seasonScoring.verifiedWeeks||[], starterWeeks=seasonScoring.starterWeeks||[];
 const metadata=new Map();
 for(const t of teams)for(const p of [...(t.starters||[]),...(t.bench||[])])metadata.set(String(p.id||p.playerId),p);
 for(const [id,p] of Object.entries(playerMap))metadata.set(id,{id,name:p.full_name||[p.first_name,p.last_name].filter(Boolean).join(' ')||id,position:p.position||p.fantasy_positions?.[0],nflTeam:p.team});
 const eligible=verifiedWeeks.length>0&&verifiedWeeks.every(w=>starterWeeks.some(row=>row.week===w&&teams.every(t=>row.rosters.some(r=>String(r.rosterId)===String(t.rosterId)))));
 let missingPosition=false;
 const profiles=teams.map(team=>{
  const players=new Map();
  for(const weekly of starterWeeks.filter(w=>verifiedWeeks.includes(w.week))){
   const roster=weekly.rosters.find(r=>String(r.rosterId)===String(team.rosterId));
   for(const start of roster?.starters||[]){
    const id=String(start.playerId),p=metadata.get(id),position=positionOf(p);
    if(!p||!position){missingPosition=true;continue;}
    const row=players.get(id)||{playerId:id,name:p.name||p.fullName||id,position,nflTeam:p.nflTeam||null,seasonPoints:0,starts:0,hasVerifiedScoring:true};
    row.seasonPoints=round(row.seasonPoints+start.points);row.starts++;players.set(id,row);
   }
  }
  const sorted=[...players.values()].sort((a,b)=>b.seasonPoints-a.seasonPoints||a.name.localeCompare(b.name));
  return{rosterId:team.rosterId,team:team.team,manager:team.manager,verifiedWeeks,verifiedWeekCount:verifiedWeeks.length,totalStarterPoints:round(sorted.reduce((sum,p)=>sum+p.seasonPoints,0)),positions:Object.fromEntries(CORE_POSITIONS.map(position=>{const group=sorted.filter(p=>p.position===position);return[position,{position,seasonPoints:round(group.reduce((sum,p)=>sum+p.seasonPoints,0)),starts:group.reduce((sum,p)=>sum+p.starts,0),scoringPlayers:group.length,players:group}];})),topScorers:sorted.slice(0,5)};
 });
 const ready=eligible&&!missingPosition;
 if(ready)addLeagueComparisons(profiles);
 return{status:ready?'verified-production':'insufficient-data',formulaVersion:FORMULA_VERSION,verifiedWeeks,excludedWeeks:seasonScoring.excludedWeeks||[],teams:ready?profiles:[],provenance:{classification:'historical starter production',comparisonPolicy:'Season points contributed by actual weekly starters, grouped by player position including FLEX and SUPERFLEX; bench and IR excluded. Historical points remain with the starting franchise after trades.',rankFormula:'descending starter positional points; exact ties share rank',aiAdjusted:false}};
}
