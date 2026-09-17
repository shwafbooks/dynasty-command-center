import { validateProviderSnapshot, independentSourceCount, PROVIDER_REGISTRY_VERSION } from './provider-registry.js';
import { buildMarketConsensus } from './market-consensus.js';
import { buildMarketDisagreementReport } from './market-disagreement.js';

export const PROVIDER_INGESTION_VERSION='provider-ingestion-v1';

export function ingestProviderSnapshots({snapshots=[],minimumIndependentSources=2}){
  const accepted=[],rejected=[];
  for(const snapshot of snapshots){
    const validation=validateProviderSnapshot(snapshot);
    if(validation.valid)accepted.push({...snapshot,providerFamily:validation.provider.family,independenceGroup:validation.provider.independenceGroup});
    else rejected.push({source:snapshot?.source||null,errors:validation.errors});
  }
  const independence=independentSourceCount(accepted);
  if(independence<minimumIndependentSources){
    return{status:'insufficient-independent-sources',publicationEligible:false,acceptedSources:accepted.map(s=>s.source),rejected,independentSourceCount:independence,minimumIndependentSources,consensus:null,disagreement:null,provenance:{formulaVersion:PROVIDER_INGESTION_VERSION,registryVersion:PROVIDER_REGISTRY_VERSION,policy:'DCC requires independent evidence families before publishing multi-source consensus.'}};
  }
  const consensus=buildMarketConsensus({sources:accepted,minimumSources:minimumIndependentSources});
  const disagreement=buildMarketDisagreementReport(consensus);
  return{status:consensus.status==='consensus-ready'?'ready':'insufficient-player-overlap',publicationEligible:consensus.status==='consensus-ready',acceptedSources:accepted.map(s=>s.source),rejected,independentSourceCount:independence,minimumIndependentSources,consensus,disagreement,provenance:{formulaVersion:PROVIDER_INGESTION_VERSION,registryVersion:PROVIDER_REGISTRY_VERSION,policy:'Provider raw scales remain separate; consensus uses normalized within-source percentiles only.',aiAdjusted:false}};
}
