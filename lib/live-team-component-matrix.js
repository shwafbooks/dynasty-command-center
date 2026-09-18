import {buildVerifiedSeasonScoring} from './season-scoring.js';
import {buildLeagueTeamIntelligence} from './team-intelligence.js';
import {buildTeamComponentMatrix} from './team-component-matrix.js';
import {buildLineupCapacity} from './lineup-capacity.js';
import {deriveSleeperLineupSettings} from './sleeper-league-format.js';
import {buildLeagueAvailability} from './league-availability.js';
import {buildLeagueMarketProfile} from './league-market-profile.js';
import {buildLineupMarketEvidence} from './lineup-market-evidence.js';
import {buildReplacementMarketEvidence} from './replacement-market-evidence.js';
import {fetchLiveMarketSnapshots} from './providers/live-market-sources.js';
import {adaptProviderSnapshot} from './provider-adapter.js';
import {ingestProviderSnapshots} from './provider-ingestion.js';
export const LIVE_TEAM_COMPONENT_MATRIX_VERSION='live-team-component-matrix-v1';
const API=process.env.SLEEPER_API_BASE||'https://api.sleeper.app/v1';
const get=async p=>{const r=await fetch(API+p);if(!r.ok)throw new Error(`Sleeper ${r.status}: ${p}`);return r.json();};
const nameOf=(p,id)=>p.full_name||[p.first_name,p.last_name].filter(Boolean).join(' ')||String(id);
export async function buildLiveTeamComponentMatrix({leagueId,throughWeek}={}){
 const[seasonScoring,league,rosters,users,playerMap]=await Promise.all([buildVerifiedSeasonScoring({leagueId,throughWeek}),get(`/league/${leagueId}`),get(`/league/${leagueId}/rosters`),get(`/league/${leagueId}/users`),get('/players/nfl')]);
 const format=deriveSleeperLineupSettings(league.roster_positions||[]);if(format.status!=='ready')return{status:'withheld',reason:'unsupported-lineup-slots',format};
 const capacity=buildLineupCapacity(format.settings),userMap=new Map(users.map(u=>[u.user_id,u])),view=id=>{const p=playerMap[String(id)]||{};return{id:String(id),playerId:String(id),name:nameOf(p,id),position:String(p.fantasy_positions?.[0]||p.position||'').toUpperCase(),nflTeam:p.team||null};};
 const teams=rosters.map(r=>{const u=userMap.get(r.owner_id)||{},starterIds=new Set((r.starters||[]).map(String)),all=(r.players||[]).map(view);return{rosterId:r.roster_id,team:u.metadata?.team_name||u.display_name||u.username||`Roster ${r.roster_id}`,manager:u.display_name||u.username||'Unknown manager',starters:all.filter(p=>starterIds.has(p.id)),bench:all.filter(p=>!starterIds.has(p.id))};});
 const production=buildLeagueTeamIntelligence({teams,seasonScoring});if(production.status==='insufficient-data')return{status:'withheld',reason:'verified-production-unavailable',verifiedWeeks:production.verifiedWeeks||[]};
 const sleeperPlayers=Object.entries(playerMap).map(([id,p])=>({id,...p})),rp=league.roster_positions||[],numTeams=Number(league.total_rosters||rosters.length),ppr=Number(league.scoring_settings?.rec||0),numQbs=rp.some(x=>['SUPER_FLEX','SUPERFLEX','OP'].includes(String(x).toUpperCase()))?2:1;
 const live=await fetchLiveMarketSnapshots({numTeams,ppr,numQbs}),adapted=live.snapshots.map(snapshot=>adaptProviderSnapshot({snapshot,sleeperPlayers})),accepted=adapted.filter(a=>a.status==='adapted'||a.status==='review-required').map(a=>({source:a.source,asOf:a.asOf,format:a.format,players:a.players,independenceGroup:a.independenceGroup})),ingestion=ingestProviderSnapshots({snapshots:accepted,minimumIndependentSources:2});
 if(!ingestion.publicationEligible)return{status:'withheld',reason:'market-not-publishable',transportFailures:live.failures};
 const marketProfile=buildLeagueMarketProfile({teams,marketIntelligence:{publicationEligible:true,consensus:ingestion.consensus}}),lineup=buildLineupMarketEvidence({marketProfile,lineupSettings:capacity.slots}),availability=buildLeagueAvailability({sleeperPlayers:playerMap,teams,lineupCapacity:capacity}),replacement=buildReplacementMarketEvidence({marketProfile,replacementEvidence:availability.replacement,availableConsensus:ingestion.consensus.players}),matrix=buildTeamComponentMatrix({productionTeams:production.teams,lineupMarketTeams:lineup.teams,replacementMarketTeams:replacement.teams});
 return{leagueId:String(leagueId),throughWeek,status:matrix.status,verifiedWeeks:production.verifiedWeeks||[],market:{independentSourceCount:ingestion.independentSourceCount,consensusPlayerCount:Object.keys(ingestion.consensus.players).length,transportFailures:live.failures},lineupCapacity:capacity,teams:matrix.teams,comparisons:matrix.comparisons,overallScorePublished:false,overallRankingPublished:false,interpretation:matrix.interpretation,provenance:{formulaVersion:LIVE_TEAM_COMPONENT_MATRIX_VERSION,componentMatrix:matrix.provenance.formulaVersion,production:production.formulaVersion,lineupMarket:lineup.provenance?.formulaVersion,replacementMarket:replacement.provenance?.formulaVersion,componentWeightsApplied:false,aiAdjusted:false}};
}