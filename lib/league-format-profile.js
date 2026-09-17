import { buildLineupCapacity } from './lineup-capacity.js';
export const LEAGUE_FORMAT_PROFILE_VERSION='league-format-profile-v1';
const round=(v,n=4)=>{const p=10**n;return Math.round((Number(v||0)+Number.EPSILON)*p)/p;};
export function buildLeagueFormatProfile({teamCount,rosterSize,lineupSettings={}}={}){
 const teams=Number(teamCount),roster=Number(rosterSize),capacity=buildLineupCapacity(lineupSettings);
 const validTeams=Number.isInteger(teams)&&teams>0,validRoster=Number.isFinite(roster)&&roster>=capacity.totalStartingSlots;
 if(!validTeams||!validRoster||capacity.totalStartingSlots<=0)return{status:'invalid-format',formulaVersion:LEAGUE_FORMAT_PROFILE_VERSION,errors:[...(!validTeams?['invalid-team-count']:[]),...(!validRoster?['invalid-roster-size']:[]),...(capacity.totalStartingSlots<=0?['no-starting-slots']:[])]};
 const leagueRosteredPlayers=teams*roster,leagueStartingSlots=teams*capacity.totalStartingSlots,benchSlotsPerTeam=roster-capacity.totalStartingSlots,leagueBenchSlots=teams*benchSlotsPerTeam;
 return{status:'ready',teamCount:teams,rosterSize:roster,lineupCapacity:capacity,leagueRosteredPlayers,leagueStartingSlots,benchSlotsPerTeam,leagueBenchSlots,starterShareOfRoster:round(capacity.totalStartingSlots/roster),benchShareOfRoster:round(benchSlotsPerTeam/roster),interpretation:{meaning:'Structural league depth and lineup demand derived only from league size, roster size, and starting slots.',caution:'This describes format scarcity pressure; it does not estimate player replacement value until player-pool availability is supplied.'},provenance:{formulaVersion:LEAGUE_FORMAT_PROFILE_VERSION,hardCodedLeagueSize:false,hardCodedRosterSize:false,hardCodedStartingSlots:false,aiAdjusted:false}};
}
