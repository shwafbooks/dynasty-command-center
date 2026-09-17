// Controlled external market snapshot ingestion for DCC.
// Provider fetching/parsing is intentionally isolated from valuation formulas.
import { matchExternalMarketValues } from './market-value.js';

export const MARKET_SNAPSHOT_VERSION='market-snapshot-v1';

export function normalizeMarketRows(rows=[]){
  return rows.map((row,index)=>({
    id: row?.id ?? null,
    sleeperId: row?.sleeperId ?? null,
    name: String(row?.name ?? '').trim(),
    position: String(row?.position ?? '').toUpperCase().replace(/\d+$/,''),
    value: Number(row?.value),
    rank: Number.isFinite(Number(row?.rank))?Number(row.rank):index+1
  })).filter(row=>row.name&&['QB','RB','WR','TE'].includes(row.position)&&Number.isFinite(row.value)&&row.value>=0);
}

export function buildMarketSnapshot({source='KeepTradeCut',sourceUrl=null,asOf,format,rows=[]}){
  if(!asOf)throw new Error('Market snapshot requires an asOf timestamp/date');
  const players=normalizeMarketRows(rows);
  return{snapshotVersion:MARKET_SNAPSHOT_VERSION,source,sourceUrl,asOf:String(asOf),format:format||null,players,provenance:{classification:'captured external market snapshot',transformations:['trim player name','normalize position to QB/RB/WR/TE','coerce published value/rank to numbers'],valueAdjustment:'none',aiAdjusted:false}};
}

export function auditMarketCoverage({teams=[],snapshot}){
  const matched=matchExternalMarketValues({teams,snapshot});
  const byPosition={};
  for(const position of ['QB','RB','WR','TE']){
    const rosterIds=[];
    for(const team of teams)for(const p of [...(team.starters||[]),...(team.bench||[])])if(String(p.position||'').toUpperCase()===position)rosterIds.push(String(p.id||p.playerId||''));
    const unique=[...new Set(rosterIds.filter(Boolean))],matchedCount=unique.filter(id=>matched.values[id]).length;
    byPosition[position]={rosterPlayerCount:unique.length,matchedCount,matchedPercent:unique.length?Math.round(matchedCount/unique.length*10000)/100:0};
  }
  return{...matched,coverage:{...matched.coverage,byPosition},publicationGate:{passes:matched.coverage.matchedPercent>=90&&matched.coverage.ambiguousCount===0,minimumCoveragePercent:90,requiresZeroAmbiguousMatches:true,policy:'DCC will not publish market-based roster strength until at least 90% of rostered QB/RB/WR/TE players are matched and no match is ambiguous.'}};
}
