// DCC provider registry: describes what each external signal means before ingestion.
// Provider inclusion is evidence governance, not endorsement.
export const PROVIDER_REGISTRY_VERSION='provider-registry-v1';

export const PROVIDERS={
  keeptradecut:{id:'keeptradecut',family:'community-market',independenceGroup:'crowd',label:'KeepTradeCut',signal:'crowdsourced dynasty market sentiment',allowed:true,notes:'Preserve scoring/league-format metadata and snapshot date. Do not treat crowd value as verified performance.'},
  fantasycalc:{id:'fantasycalc',family:'observed-trade-market',independenceGroup:'completed-trades',label:'FantasyCalc',signal:'market value inferred from completed fantasy trades',allowed:true,notes:'Preserve source methodology/date. Observed trade pricing is distinct from crowd sentiment.'},
  dynastyprocess:{id:'dynastyprocess',family:'expert-consensus',independenceGroup:'expert-rankings',label:'DynastyProcess',signal:'expert-consensus dynasty valuation',allowed:true,notes:'Preserve format/settings metadata and source date.'}
};

export function providerDefinition(id){return PROVIDERS[String(id||'').toLowerCase()]||null;}

export function validateProviderSnapshot(snapshot={}){
  const provider=providerDefinition(snapshot.source);
  const errors=[];
  if(!provider||!provider.allowed)errors.push('unregistered-provider');
  if(!snapshot.asOf)errors.push('missing-as-of-date');
  if(!Array.isArray(snapshot.players)||!snapshot.players.length)errors.push('missing-player-data');
  return{valid:errors.length===0,errors,provider:provider||null};
}

export function independentSourceCount(snapshots=[]){
  const groups=new Set();
  for(const snapshot of snapshots){const validation=validateProviderSnapshot(snapshot);if(validation.valid)groups.add(validation.provider.independenceGroup);}
  return groups.size;
}
