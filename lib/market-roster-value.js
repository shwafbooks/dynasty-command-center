// Market-based roster valuation for DCC.
// This module ONLY publishes when the external market snapshot passes the
// coverage gate. It does not mix production with market value and does not
// create an overall DCC power score.

const POSITIONS=['QB','RB','WR','TE'];
export const MARKET_ROSTER_VALUE_VERSION='market-roster-value-v1';
const round=v=>Math.round((Number(v||0)+Number.EPSILON)*100)/100;

function rosterPlayers(team={}){
  const seen=new Set();
  return [...(team.starters||[]),...(team.bench||[])].filter(player=>{
    const id=String(player?.id||player?.playerId||'');
    if(!id||seen.has(id))return false;
    seen.add(id);return true;
  });
}

export function buildMarketRosterValues({teams=[],marketAudit}){
  const gate=marketAudit?.publicationGate;
  if(!gate?.passes){
    return{status:'withheld',formulaVersion:MARKET_ROSTER_VALUE_VERSION,reason:'market-coverage-gate-failed',publicationGate:gate||null,teams:[],provenance:{policy:'No team or positional market ranking is published unless the external snapshot passes the market coverage gate.',aiAdjusted:false}};
  }
  const values=marketAudit.values||{};
  const profiles=teams.map(team=>{
    const players=rosterPlayers(team).map(player=>{
      const id=String(player.id||player.playerId),market=values[id];
      return{id,name:player.name||player.fullName||id,position:String(player.position||player.fantasyPosition||'').toUpperCase(),marketValue:market?.value??null,externalRank:market?.externalRank??null,matchMethod:market?.matchMethod??null};
    });
    const positions=Object.fromEntries(POSITIONS.map(position=>{
      const group=players.filter(p=>p.position===position),matched=group.filter(p=>Number.isFinite(p.marketValue)).sort((a,b)=>b.marketValue-a.marketValue||a.name.localeCompare(b.name));
      return[position,{position,rosterCount:group.length,matchedCount:matched.length,totalMarketValue:round(matched.reduce((s,p)=>s+p.marketValue,0)),players:matched}];
    }));
    return{rosterId:team.rosterId,team:team.team,manager:team.manager,totalMarketValue:round(POSITIONS.reduce((s,p)=>s+positions[p].totalMarketValue,0)),positions};
  });
  for(const position of POSITIONS){
    const ordered=[...profiles].sort((a,b)=>b.positions[position].totalMarketValue-a.positions[position].totalMarketValue||Number(a.rosterId)-Number(b.rosterId));
    const average=round(ordered.reduce((s,t)=>s+t.positions[position].totalMarketValue,0)/(ordered.length||1));
    ordered.forEach((team,index)=>{const row=team.positions[position];row.comparison={rank:index+1,leagueSize:ordered.length,leagueAverage:average,valueVsLeagueAverage:round(row.totalMarketValue-average),metric:'external dynasty market value currently rostered at position'};});
  }
  const overall=[...profiles].sort((a,b)=>b.totalMarketValue-a.totalMarketValue||Number(a.rosterId)-Number(b.rosterId));
  const overallAverage=round(overall.reduce((s,t)=>s+t.totalMarketValue,0)/(overall.length||1));
  overall.forEach((team,index)=>{team.comparison={rank:index+1,leagueSize:overall.length,leagueAverage:overallAverage,valueVsLeagueAverage:round(team.totalMarketValue-overallAverage),metric:'external dynasty market value of currently rostered QB/RB/WR/TE players'};});
  return{status:'published',formulaVersion:MARKET_ROSTER_VALUE_VERSION,source:marketAudit.source,coverage:marketAudit.coverage,publicationGate:gate,teams:profiles,provenance:{classification:'external market roster valuation',formula:'sum matched external market values on current roster; compare identical sums across league',important:'This is a market-value ranking, not a DCC power ranking, projection, or statement of manager quality.',aiAdjusted:false,productionAdjusted:false}};
}
