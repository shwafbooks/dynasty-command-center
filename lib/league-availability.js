// DCC League Availability Evidence
// Composes policy-filtered Sleeper players with actual rosters and derived lineup capacity.
import {buildSleeperPlayerPool} from './player-pool-policy.js';
import {buildReplacementLevelEvidence} from './replacement-level-evidence.js';
export const LEAGUE_AVAILABILITY_VERSION='league-availability-v1';
export function buildLeagueAvailability({sleeperPlayers={},teams=[],lineupCapacity}={}){
 const pool=buildSleeperPlayerPool(sleeperPlayers);
 if(pool.status!=='ready'||!teams.length||!lineupCapacity)return{status:'insufficient-data',publicationEligible:false,reasons:[!teams.length?'missing-teams':null,!lineupCapacity?'missing-lineup-capacity':null,pool.status!=='ready'?'player-pool-not-ready':null].filter(Boolean)};
 const replacement=buildReplacementLevelEvidence({teams,playerPool:pool.players,lineupCapacity});
 const ready=replacement.status==='ready';
 return{status:ready?'ready':'insufficient-data',publicationEligible:ready,playerPool:{includedCount:pool.includedCount,excludedCount:pool.excludedCount,positionCounts:pool.positionCounts,exclusionCounts:pool.exclusionCounts,policy:pool.policy},replacement,interpretation:{meaning:'Observed league availability using current rosters, a deterministic Sleeper player-pool policy, and the supplied derived lineup capacity.',caution:'Availability is population evidence, not a claim that every free agent is a useful fantasy replacement.'},provenance:{formulaVersion:LEAGUE_AVAILABILITY_VERSION,playerPoolPolicyVersion:pool.provenance.formulaVersion,replacementFormulaVersion:replacement.provenance.formulaVersion,syntheticPlayerPool:false,aiAdjusted:false}};
}
