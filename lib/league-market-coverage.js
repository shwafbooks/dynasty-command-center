// Audits provider coverage against the exact current league roster pool.
export const LEAGUE_MARKET_COVERAGE_VERSION='league-market-coverage-v1';
const CORE=new Set(['QB','RB','WR','TE']);
const idOf=p=>String(p?.id||p?.playerId||p?.sleeperId||'');
const posOf=p=>String(p?.position||p?.fantasyPosition||'').toUpperCase();

export function buildLeagueRosterPool(teams=[]){
  const players=new Map();
  for(const team of teams){for(const p of [...(team.starters||[]),...(team.bench||[])]){const id=idOf(p),position=posOf(p);if(!id||!CORE.has(position))continue;if(!players.has(id))players.set(id,{playerId:id,name:p.name||p.fullName||id,position,teamIds:[]});const row=players.get(id);if(!row.teamIds.includes(String(team.rosterId)))row.teamIds.push(String(team.rosterId));}}
  return [...players.values()];
}

export function auditLeagueMarketCoverage({teams=[],providerSnapshots=[]}){
  const pool=buildLeagueRosterPool(teams),rosterIds=new Set(pool.map(p=>p.playerId));
  const providers=providerSnapshots.map(snapshot=>{
    const values=new Map((snapshot.players||[]).map(p=>[String(p.playerId||p.sleeperId||p.id||''),p]));
    const matched=pool.filter(p=>values.has(p.playerId));
    const missing=pool.filter(p=>!values.has(p.playerId));
    const byPosition={};
    for(const position of CORE){const target=pool.filter(p=>p.position===position),hits=target.filter(p=>values.has(p.playerId));byPosition[position]={rosterPlayers:target.length,matched:hits.length,coverage:target.length?hits.length/target.length:1};}
    return{source:snapshot.source,asOf:snapshot.asOf||null,format:snapshot.format||null,rosterPlayers:pool.length,matched:matched.length,missing:missing.length,coverage:pool.length?matched.length/pool.length:0,byPosition,missingPlayers:missing,extraneousProviderPlayers:(snapshot.players||[]).filter(p=>!rosterIds.has(String(p.playerId||p.sleeperId||p.id||''))).length};
  });
  const overlap=pool.map(p=>({playerId:p.playerId,name:p.name,position:p.position,sourceCount:providers.filter(provider=>{const snap=providerSnapshots.find(s=>s.source===provider.source);return (snap?.players||[]).some(v=>String(v.playerId||v.sleeperId||v.id||'')===p.playerId);}).length}));
  return{formulaVersion:LEAGUE_MARKET_COVERAGE_VERSION,rosterPlayerCount:pool.length,providers,overlap:{twoPlus:overlap.filter(p=>p.sourceCount>=2).length,threePlus:overlap.filter(p=>p.sourceCount>=3).length,players:overlap},provenance:{scope:'current QB/RB/WR/TE players on Sleeper rosters',missingValuesEstimated:false,aiAdjusted:false}};
}
