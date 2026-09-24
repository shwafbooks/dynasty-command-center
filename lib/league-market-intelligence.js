import { auditLeagueMarketCoverage } from './league-market-coverage.js';
import { ingestProviderSnapshots } from './provider-ingestion.js';

export const LEAGUE_MARKET_INTELLIGENCE_VERSION='league-market-intelligence-v1';

export function buildLeagueMarketIntelligence({teams=[],sleeperPlayers=[],snapshots=[],minimumIndependentSources=2,minimumLeagueOverlap=0.8}){
  const coverage=auditLeagueMarketCoverage({teams,providerSnapshots:snapshots});
  const ingestion=ingestProviderSnapshots({snapshots,minimumIndependentSources});
  const rosterCount=coverage.rosterPlayerCount;
  const multiSourceCount=coverage.overlap.players.filter(player=>Boolean(ingestion.consensus?.players?.[player.playerId])).length;
  const overlap=rosterCount?multiSourceCount/rosterCount:0;
  const reasons=[];
  if(!ingestion.publicationEligible)reasons.push(ingestion.status);
  if(overlap<minimumLeagueOverlap)reasons.push('insufficient-league-player-overlap');
  const publicationEligible=reasons.length===0;
  return{
    status:publicationEligible?'ready':'withheld',
    publicationEligible,
    reasons,
    leagueOverlap:{rosterPlayerCount:rosterCount,playersWithAtLeastTwoSources:multiSourceCount,ratio:Math.round(overlap*10000)/10000,minimumRequired:minimumLeagueOverlap},
    coverage,
    consensus:publicationEligible?ingestion.consensus:null,
    disagreement:publicationEligible?ingestion.disagreement:null,
    provenance:{formulaVersion:LEAGUE_MARKET_INTELLIGENCE_VERSION,policy:'Consensus is withheld unless independent-source governance and league-roster overlap gates both pass.',missingValuesEstimated:false,aiAdjusted:false}
  };
}
