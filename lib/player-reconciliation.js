// DCC cross-provider player reconciliation.
// Stable IDs are preferred. Name matching is conservative and never guesses through ambiguity.
export const PLAYER_RECONCILIATION_VERSION='player-reconciliation-v1';
const POSITIONS=new Set(['QB','RB','WR','TE']);

export function normalizePlayerName(value=''){
  return String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\b(jr|sr|ii|iii|iv|v)\b\.?/g,'').replace(/[^a-z0-9]/g,'');
}
function pos(p={}){return String(p.position||p.fantasyPosition||'').toUpperCase();}
function sleeperId(p={}){return String(p.sleeperId||p.sleeper_id||p.playerId||p.id||'');}
function providerId(p={}){return String(p.providerPlayerId||p.provider_id||p.sourcePlayerId||'');}

export function buildSleeperIdentityIndex(players=[]){
  const byId=new Map(),byNamePosition=new Map();
  for(const p of players){const id=sleeperId(p),position=pos(p);if(!id||!POSITIONS.has(position))continue;const row={sleeperId:id,name:p.name||p.fullName||p.full_name||id,position,nflTeam:p.nflTeam||p.team||null};byId.set(id,row);const key=`${normalizePlayerName(row.name)}|${position}`;if(!byNamePosition.has(key))byNamePosition.set(key,[]);byNamePosition.get(key).push(row);}
  return{byId,byNamePosition};
}

export function reconcileProviderPlayers({source,providerPlayers=[],sleeperPlayers=[]}){
  const index=buildSleeperIdentityIndex(sleeperPlayers),matched=[],unmatched=[],ambiguous=[];
  for(const raw of providerPlayers){const direct=sleeperId(raw);if(direct&&index.byId.has(direct)){matched.push({...raw,playerId:direct,matchMethod:'sleeper-id',providerPlayerId:providerId(raw)||null});continue;}
    const position=pos(raw),name=raw.name||raw.playerName||raw.fullName||'',key=`${normalizePlayerName(name)}|${position}`,candidates=index.byNamePosition.get(key)||[];
    if(candidates.length===1){matched.push({...raw,playerId:candidates[0].sleeperId,matchMethod:'unique-name-position',providerPlayerId:providerId(raw)||null});}
    else if(candidates.length>1){ambiguous.push({source,name,position,providerPlayerId:providerId(raw)||null,candidateSleeperIds:candidates.map(c=>c.sleeperId)});}
    else unmatched.push({source,name,position,providerPlayerId:providerId(raw)||null});
  }
  const total=providerPlayers.length,coverage=total?matched.length/total:0;
  return{source,total,matchedCount:matched.length,unmatchedCount:unmatched.length,ambiguousCount:ambiguous.length,coverage,matched,unmatched,ambiguous,provenance:{formulaVersion:PLAYER_RECONCILIATION_VERSION,policy:'Sleeper ID first; otherwise exact normalized name + position only when unique. Ambiguous and unmatched identities receive no value.',fuzzyMatching:false,aiMatching:false}};
}
