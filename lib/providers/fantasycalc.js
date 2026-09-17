// FantasyCalc -> DCC snapshot adapter.
// FantasyCalc's current values endpoint is community-documented; keep transport isolated.
export const FANTASYCALC_PROVIDER_VERSION='fantasycalc-provider-v1';
export const FANTASYCALC_CURRENT_VALUES_URL='https://api.fantasycalc.com/values/current';

export function fantasyCalcQuery({numTeams=10,ppr=1,numQbs=2}={}){
  return new URLSearchParams({isDynasty:'true',numQbs:String(numQbs),numTeams:String(numTeams),ppr:String(ppr)}).toString();
}

export function parseFantasyCalcValues(rows=[],{asOf=new Date().toISOString(),numTeams=10,ppr=1,numQbs=2}={}){
  const players=[];
  for(const row of rows){
    const p=row?.player||{};
    const position=String(p.position||'').toUpperCase();
    const value=Number(row?.value);
    if(!['QB','RB','WR','TE'].includes(position)||!Number.isFinite(value)||value<0)continue;
    players.push({
      sleeperId:p.sleeperId?String(p.sleeperId):null,
      providerPlayerId:p.id!=null?String(p.id):null,
      name:p.name||null,
      position,
      nflTeam:p.maybeTeam||p.team||null,
      value,
      overallRank:Number.isFinite(Number(row.overallRank))?Number(row.overallRank):null,
      positionRank:Number.isFinite(Number(row.positionRank))?Number(row.positionRank):null,
      trend30Day:Number.isFinite(Number(row.trend30Day))?Number(row.trend30Day):null
    });
  }
  return{
    source:'fantasycalc',
    asOf,
    format:{dynasty:true,numQbs,numTeams,ppr,superflex:numQbs===2},
    players,
    provenance:{
      formulaVersion:FANTASYCALC_PROVIDER_VERSION,
      endpoint:FANTASYCALC_CURRENT_VALUES_URL,
      transportStatus:'community-documented endpoint; verify provider terms before commercial use',
      rawValuePreserved:true,
      sleeperIdPreferred:true,
      aiAdjusted:false
    }
  };
}

export async function fetchFantasyCalcSnapshot({fetchImpl=fetch,numTeams=10,ppr=1,numQbs=2}={}){
  const url=`${FANTASYCALC_CURRENT_VALUES_URL}?${fantasyCalcQuery({numTeams,ppr,numQbs})}`;
  const response=await fetchImpl(url,{headers:{accept:'application/json'}});
  if(!response.ok)throw new Error(`FantasyCalc values request failed: ${response.status}`);
  const rows=await response.json();
  return parseFantasyCalcValues(rows,{asOf:new Date().toISOString(),numTeams,ppr,numQbs});
}
