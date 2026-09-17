// Stats Guy Fantasy -> DCC snapshot adapter.
// Documented public API, Sleeper-ID keyed, values derived from observed trades.
export const STATSGUY_PROVIDER_VERSION='statsguy-provider-v1';
export const STATSGUY_PLAYERS_URL='https://api.statsguyfantasy.com/api/v1/players';

export function parseStatsGuyPlayers(payload={}){
  const asOf=payload?.valuesAsOf?.sf_dynasty||null,players=[];
  for(const p of payload?.players||[]){
    const position=String(p.position||'').toUpperCase(),value=Number(p?.value?.sf_dynasty);
    if(!['QB','RB','WR','TE'].includes(position)||!p.id||!Number.isFinite(value)||value<0)continue;
    players.push({sleeperId:String(p.id),providerPlayerId:String(p.id),name:p.name||null,position,nflTeam:p.team||null,value});
  }
  return{source:'statsguy',asOf,format:{dynasty:true,superflex:true,key:'sf_dynasty'},players,provenance:{formulaVersion:STATSGUY_PROVIDER_VERSION,endpoint:STATSGUY_PLAYERS_URL,signal:'values derived from observed fantasy trades',rawValuePreserved:true,sleeperIdNative:true,aiAdjusted:false,attributionRequired:true}};
}

export async function fetchStatsGuySnapshot({fetchImpl=fetch}={}){
  const response=await fetchImpl(STATSGUY_PLAYERS_URL,{headers:{accept:'application/json'}});
  if(!response.ok)throw new Error(`Stats Guy Fantasy request failed: ${response.status}`);
  return parseStatsGuyPlayers(await response.json());
}
