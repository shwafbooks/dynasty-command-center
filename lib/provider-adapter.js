import { providerDefinition, validateProviderSnapshot } from './provider-registry.js';
import { reconcileProviderPlayers } from './player-reconciliation.js';
export const PROVIDER_ADAPTER_VERSION='provider-adapter-v1';

export function adaptProviderSnapshot({snapshot,sleeperPlayers=[]}){
  const validation=validateProviderSnapshot(snapshot);
  if(!validation.valid)return{status:'rejected',source:snapshot?.source||null,errors:validation.errors,players:[]};
  const provider=providerDefinition(snapshot.source);
  const reconciliation=reconcileProviderPlayers({source:provider.id,providerPlayers:snapshot.players,sleeperPlayers});
  return{
    status:reconciliation.ambiguousCount===0?'adapted':'review-required',
    source:provider.id,
    family:provider.family,
    independenceGroup:provider.independenceGroup,
    asOf:snapshot.asOf,
    format:snapshot.format||null,
    players:reconciliation.matched.map(p=>({playerId:p.playerId,name:p.name||p.playerName||p.fullName||null,position:p.position||p.fantasyPosition||null,value:Number(p.value),matchMethod:p.matchMethod,providerPlayerId:p.providerPlayerId||null})).filter(p=>Number.isFinite(p.value)),
    reconciliation:{total:reconciliation.total,matchedCount:reconciliation.matchedCount,unmatchedCount:reconciliation.unmatchedCount,ambiguousCount:reconciliation.ambiguousCount,coverage:reconciliation.coverage,unmatched:reconciliation.unmatched,ambiguous:reconciliation.ambiguous},
    provenance:{formulaVersion:PROVIDER_ADAPTER_VERSION,identityPolicy:reconciliation.provenance.policy,providerSignal:provider.signal,rawValuePreserved:true,aiAdjusted:false}
  };
}
